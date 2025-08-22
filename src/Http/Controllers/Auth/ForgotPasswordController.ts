import { Request, Response } from 'express';
import { User } from '../../../Models/User';
import { ForgotPassword } from '../../../Models/ForgotPassword';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
// @ts-ignore
import sgTransport from 'nodemailer-sendgrid-transport';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const RESET_PASS_VALIDITY = 48; // In hours

export class ForgotPasswordController {
  constructor() {}

  // Generate a secure random token
  getToken(length = 32) {
    const codeAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
      token += codeAlphabet.charAt(Math.floor(Math.random() * codeAlphabet.length));
    }
    return token;
  }

  // Create a token and save to ForgotPassword table
  async createToken(user: any) {
    const token = this.getToken();
    await ForgotPassword.create({
      token,
      user_id: user.id,
      created_at: new Date(),
      valid_for: RESET_PASS_VALIDITY,
    });
    return token;
  }

  // Send reset link email
  async sendResetLinkEmail(req: Request, res: Response) {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Oops!! The email address you have entered does not exist in our system. Please check the email and try again.' });
    }
    const token = await this.createToken(user);
    // Send email using SendGrid
    try {
      const transporter = nodemailer.createTransport(sgTransport({
        auth: {
          api_key: process.env.SENDGRID_API_KEY,
        },
      }));
      const resetLink = `${process.env.APP_URL || 'http://localhost:3001'}/password/reset/${token}`;
      await transporter.sendMail({
        from: 'keshav.mcodeinfosoft@gmail.com',
        to: user.email,
        subject: 'Password Reset',
        text: `Click here to reset your password: ${resetLink}`,
        html: `
  <p>Click the button below to reset your password:</p>
  <a href="${resetLink}" style="
    display: inline-block;
    padding: 10px 20px;
    font-size: 16px;
    color: #fff;
    background-color: #007bff;
    text-decoration: none;
    border-radius: 5px;
    margin: 10px 0;
  ">Reset Password</a>
  <p>If you did not request a password reset, please ignore this email.</p>
`
      });
    } catch (e) {
      console.error('Error sending reset email:', e);
      return res.status(500).json({ error: 'Failed to send reset email.' });
    }
    return res.status(200).json({ message: 'Reset password email sent.' });
  }

  // Reset password
  async resetPassword(req: Request, res: Response) {
    const { token } = req.params;
    const { password, confirm_password } = req.body;
    if (!password || password.length < 5) {
      return res.status(400).json({ error: 'Password must be at least 5 characters.' });
    }
    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }
    const tokenData = await ForgotPassword.findOne({ where: { token } });
    if (!tokenData) {
      return res.status(400).json({ error: 'Invalid or expired token.' });
    }
    const user = await User.findByPk(tokenData.user_id);
    if (!user) {
      await tokenData.destroy();
      return res.status(404).json({ error: 'User not found.' });
    }
    user.password = await bcrypt.hash(password, 10);
    await user.save();
    await tokenData.destroy();
    return res.status(200).json({ message: 'Password reset successful. Please log in.' });
  }

  // Validate token
  async validateToken(token: string) {
    const tokenData = await ForgotPassword.findOne({ where: { token } });
    if (!tokenData) return false;
    const now = dayjs();
    const created = dayjs(tokenData.created_at);
    const validFor = tokenData.valid_for || RESET_PASS_VALIDITY;
    const diff = now.diff(created, 'hour') <= validFor;
    return now.isAfter(created) && diff;
  }

  // Show reset password form (API: just validate token)
  async showResetPasswordForm(req: Request, res: Response) {
    const { token } = req.params;
    const valid = await this.validateToken(token);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid or expired token.' });
    }
    return res.status(200).json({ message: 'Token valid.', token });
  }
} 
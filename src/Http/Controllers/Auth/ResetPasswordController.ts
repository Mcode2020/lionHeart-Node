import { Request, Response } from 'express';
import { User } from '../../../Models/User';
import { ForgotPassword } from '../../../Models/ForgotPassword';
import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';

const RESET_PASS_VALIDITY = 48; // In hours

export class ResetPasswordController {
  // Validate token and show reset form (API: just validate token)
  async show(req: Request, res: Response) {
    const { token } = req.params;
    const tokenData = await ForgotPassword.findOne({ where: { token } });
    if (!tokenData) {
      return res.status(400).json({ error: 'Invalid or expired token.' });
    }
    const now = dayjs();
    const created = dayjs(tokenData.created_at);
    const validFor = tokenData.valid_for || RESET_PASS_VALIDITY;
    const diff = now.diff(created, 'hour') <= validFor;
    if (!(now.isAfter(created) && diff)) {
      return res.status(400).json({ error: 'Invalid or expired token.' });
    }
    return res.status(200).json({ message: 'Token valid.', token });
  }

  // Handle password reset
  async reset(req: Request, res: Response) {
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
    const now = dayjs();
    const created = dayjs(tokenData.created_at);
    const validFor = tokenData.valid_for || RESET_PASS_VALIDITY;
    const diff = now.diff(created, 'hour') <= validFor;
    if (!(now.isAfter(created) && diff)) {
      await tokenData.destroy();
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
} 
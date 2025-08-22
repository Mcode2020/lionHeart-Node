import { Request, Response } from 'express';
import { User } from '../../../Models/User';
import { ParentProfile } from '../../../Models/ParentProfile';
import { Child } from '../../../Models/Child';
import { EmergencyContact } from '../../../Models/EmergencyContact';
import { Role } from '../../../Models/Role';
import { TableNightInvitation } from '../../../Models/TableNightInvitation';
import { UserMembership } from '../../../Models/UserMembership';
import { Event as EventModel } from '../../../Models/Event';
import { Roster } from '../../../Models/Roster';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import session from 'express-session';

// Extend Express Request type to include custom session properties
interface SessionRequest extends Request {
  session: session.Session & {
    free_trial?: boolean;
    alias?: string;
    monthly_price?: number;
    membership?: string;
    redirect_back_url?: string;
    redirect_force_class_details?: string;
  };
}

// Extend Event type for fk_park_id and fk_lead_id
interface EventWithExtra extends EventModel {
  fk_park_id?: number;
  fk_lead_id?: number;
}

function validateRegistration(data: any) {
  const errors: Record<string, string> = {};
  // Parent validation
  if (!data.parent) errors['parent'] = 'Parent data is required.';
  else {
    if (!data.parent.first_name) errors['parent.first_name'] = 'Parent first name is required.';
    if (!data.parent.last_name) errors['parent.last_name'] = 'Parent last name is required.';
    if (!data.parent.email) errors['parent.email'] = 'Parent email is required.';
    if (!data.parent.password) errors['parent.password'] = 'Parent password is required.';
    if (!data.parent.password_confirmation) errors['parent.password_confirmation'] = 'Password confirmation is required.';
    if (data.parent.password !== data.parent.password_confirmation) errors['parent.password_confirmation'] = 'Passwords do not match.';
    if (!data.parent.address) errors['parent.address'] = 'Parent address is required.';
    if (!data.parent.city) errors['parent.city'] = 'Parent city is required.';
    if (!data.parent.state) errors['parent.state'] = 'Parent state is required.';
    if (!data.parent.zipcode) errors['parent.zipcode'] = 'Zip code required.';
    if (!data.parent.cellphone) errors['parent.cellphone'] = 'Cellphone required.';
  }
  // Child validation
  if (!data.child) errors['child'] = 'Child data is required.';
  else {
    if (!data.child.first_name) errors['child.first_name'] = 'Child first name is required.';
    if (!data.child.last_name) errors['child.last_name'] = 'Child last name is required.';
    if (!data.child.birthday) errors['child.birthday'] = 'Child birthdate required.';
    if (!data.child.gender) errors['child.gender'] = 'Child gender required.';
  }
  // Emergency validation
  if (!data.emergency) errors['emergency'] = 'Emergency contact is required.';
  else {
    if (!data.emergency.first_name) errors['emergency.first_name'] = 'Emergency contact first name is required.';
    if (!data.emergency.last_name) errors['emergency.last_name'] = 'Emergency contact last name is required.';
    if (!data.emergency.phone) errors['emergency.phone'] = 'Emergency contact phone is required.';
  }
  return errors;
}

export class RegisterController {
  // Show registration form (API: just a message)
  async showRegisterForm(req: Request, res: Response) {
    return res.status(200).json({ message: 'Show registration form (API endpoint)' });
  }

  // Handle registration
  async register(req: Request, res: Response) {
    const sreq = req as SessionRequest;
    const data = req.body;
    const errors = validateRegistration(data);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }
    try {
      // Check for existing user
      const existing = await User.findOne({ where: { [Op.or]: [{ email: data.parent.email }] } });
      if (existing) {
        return res.status(400).json({ errors: { 'parent.email': 'The Parent Email Has Already Been Taken' } });
      }
      // Hash password
      const hashedPassword = await bcrypt.hash(data.parent.password, 10);
      // Create user
      const user = await User.create({
        first_name: data.parent.first_name,
        last_name: data.parent.last_name,
        username: data.parent.email.split('@')[0],
        email: data.parent.email,
        password: hashedPassword
      });
      
      // Ensure user was created successfully
      if (!user || !user.id) {
        throw new Error('Failed to create user');
      }
      
      console.log('User created with ID:', user.id);
      
                    // Create profile with minimal required fields first
       const profileData: any = {
         user_id: Number(user.id), // Ensure it's a number
         freezed: 0, // Add required field
       };
       
       // Add optional fields only if they exist
       if (data.parent.first_name) profileData.first_name = data.parent.first_name;
       if (data.parent.middle_name) profileData.middle_name = data.parent.middle_name;
       if (data.parent.last_name) profileData.last_name = data.parent.last_name;
       if (data.parent.address) profileData.address = data.parent.address;
       if (data.parent.city) profileData.city = data.parent.city;
       if (data.parent.state) profileData.state = data.parent.state;
       if (data.parent.zipcode) profileData.zipcode = data.parent.zipcode;
       if (data.parent.cellphone) profileData.cellphone = data.parent.cellphone;
       if (data.parent.alternate) profileData.alternatephone = data.parent.alternate;
       if (data.parent.additional_email) profileData.additional_email = data.parent.additional_email;
       if (data.parent.additional_information) profileData.additional_information = data.parent.additional_information;
       if (data.parent.friend_referral) profileData.friend_referral = data.parent.friend_referral;
      
             console.log('Creating profile with data:', JSON.stringify(profileData, null, 2));
       
       try {
         await ParentProfile.create(profileData);
         console.log('Profile created successfully');
       } catch (profileError: any) {
         console.error('Profile creation error:', profileError);
         console.error('Profile error details:', profileError.parent?.sqlMessage || profileError.message);
         throw profileError;
       }
      // Create child
      const childData = {
        user_id: Number(user.id), // Ensure it's a number
        first_name: data.child.first_name,
        last_name: data.child.last_name,
        birthday: data.child.birthday,
        gender: data.child.gender,
      };
      
      console.log('Creating child with data:', childData);
      
      const child = await Child.create(childData);
      // Create emergency contact
             const emergencyData = {
         user_id: Number(user.id), // Ensure it's a number
         first_name: data.emergency.first_name,
         last_name: data.emergency.last_name,
         address: data.emergency.address || '', // Use empty string instead of null
         phone: data.emergency.phone,
       };
      
      console.log('Creating emergency contact with data:', emergencyData);
      
      await EmergencyContact.create(emergencyData);
      // Assign roles (parent, active)
      const parentRole = await Role.findOrCreate({ where: { name: 'parent' }, defaults: { name: 'parent' } });
      const activeRole = await Role.findOrCreate({ where: { name: 'active' }, defaults: { name: 'active' } });
      await user.addRoles([parentRole[0].id, activeRole[0].id]);

      // --- Free trial and invitation logic ---
      if (sreq.session?.free_trial === true) {
        // Get session data for free trial
        const alias = sreq.session.alias;
        const monthly_price = sreq.session.monthly_price;
        const membership_type = sreq.session.membership;
        const event = await EventModel.findOne({ where: { alias } }) as EventWithExtra | null;
        // Create UserMembership
        const free_trial_date = data.free_trial_date;
        // Calculate expired_membership_date (add 1 week)
        let expired_membership_date = null;
        if (free_trial_date) {
          const d = new Date(free_trial_date);
          d.setDate(d.getDate() + 7);
          expired_membership_date = d.toISOString().slice(0, 10);
        }
        const membershipData = {
          user_id: Number(user.id), // Ensure it's a number
          children_id: Number(child.id), // Ensure it's a number
          splms_event_id: event?.splms_event_id,
          park_id: event?.fk_park_id,
          facility_id: event?.fk_lead_id,
          purchase_date: new Date().toISOString().slice(0, 10),
          price: monthly_price,
          membership_type,
          old_membership_type: membership_type,
          status: 'deactive',
          expired_date: expired_membership_date,
          free_trial_date,
        };
        
        console.log('Creating membership with data:', membershipData);
        
        await UserMembership.create(membershipData);
        // Insert Roster
        if (event) {
          const rosterData = {
            event_splms_event_id: event.splms_event_id,
            children_id: Number(child.id), // Ensure it's a number
          };
          
          console.log('Creating roster with data:', rosterData);
          
          await Roster.create(rosterData);
        }
        // Handle TableNightInvitation
        if (event) {
          await TableNightInvitation.update(
            { status: 'free_trail' },
            { where: { email: user.email, splms_event_id: event.splms_event_id } }
          );
        }
        // Stub: send email (replace with nodemailer)
        console.log('Stub: send free trial email to', user.email);
        // Stub: event firing
        console.log('Stub: fire Registered event for user', user.id);
        // Redirect logic
        if (sreq.session.redirect_back_url) {
          return res.status(201).json({ message: 'Registration successful (free trial)', user, redirect: sreq.session.redirect_back_url });
        }
        return res.status(201).json({ message: 'Registration successful (free trial)', user, redirect: '/free-trial-card' });
      }

      // --- End free trial logic ---

      // Stub: event firing
      console.log('Stub: fire Registered event for user', user.id);
      // Redirect logic
      if (sreq.session?.redirect_force_class_details) {
        return res.status(201).json({ message: 'Registration successful', user, redirect: sreq.session.redirect_force_class_details });
      }
      if (sreq.session?.redirect_back_url) {
        return res.status(201).json({ message: 'Registration successful', user, redirect: sreq.session.redirect_back_url });
      }
      return res.status(201).json({ message: 'Registration successful', user, redirect: '/profile' });
    } catch (err: any) {
      console.error('Sequelize error:', err);
      if (err.parent) {
        console.error('MySQL error:', err.parent.sqlMessage || err.parent.message);
      }
      return res.status(500).json({ error: 'Registration failed', details: err.parent?.sqlMessage || err.message });
    }
  }
} 
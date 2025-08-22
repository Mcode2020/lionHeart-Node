import { Request, Response } from 'express';
import { User } from '../../../Models/User';
import { Enrollment } from '../../../Models/Enrollment';
import { Event } from '../../../Models/Event';
import { UserMembership } from '../../../Models/UserMembership';
import { ParentProfile } from '../../../Models/ParentProfile';
import { EmergencyContact } from '../../../Models/EmergencyContact';
import { Child } from '../../../Models/Child';
import { Roster } from '../../../Models/Roster';
import { ChangeEmailRequest } from '../../../Models/ChangeEmailRequest';
import { SportsRotation } from '../../../Models/SportsRotation';
import { AnnualSchedule } from '../../../Models/AnnualSchedule';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
const { unserialize } = require("php-unserialize");
import { error } from 'console';
// TODO: Import Coupon, Payments, etc. if available

// Import SendGrid transport with type assertion
const sgTransport = require('nodemailer-sendgrid-transport');

// Email validation utility function
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

// Email sending utility function
async function sendEmailChangeVerification(toEmail: string, activationToken: string, userName: string): Promise<boolean> {
  try {
    // Check if we're in development mode or SendGrid is disabled 
    if (process.env.NODE_ENV === 'development' && process.env.DISABLE_EMAIL_SENDING === 'true') {
      console.log('📧 [DEV MODE] Email sending disabled. Would send to:', toEmail);
      console.log('📧 [DEV MODE] Verification URL:', `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/update-email/${activationToken}`);
      return true; // Return true to simulate successful email sending
    }

    const transporter = nodemailer.createTransport(sgTransport({
      auth: {
        api_key: process.env.SENDGRID_API_KEY,
      },
    }));

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/update-email/${activationToken}`;
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@lionheartfitnesskids.com',
      to: toEmail,
      subject: 'Email Change Verification - Lion Heart Fitness Kids',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
            <h2 style="color: #333; margin-bottom: 20px;">Email Change Verification</h2>
            <p style="color: #666; line-height: 1.6;">
              Hello ${userName},
            </p>
            <p style="color: #666; line-height: 1.6;">
              You have requested to change your email address for your Lion Heart Fitness Kids account. 
              To complete this process, please click the verification link below:
            </p>
            <div style="margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email Change
              </a>
            </div>
            <p style="color: #666; line-height: 1.6; font-size: 14px;">
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            <p style="color: #007bff; font-size: 12px; word-break: break-all;">
              ${verificationUrl}
            </p>
            <p style="color: #666; line-height: 1.6; font-size: 14px;">
              This link will expire in 24 hours for security reasons.
            </p>
            <p style="color: #666; line-height: 1.6; font-size: 14px;">
              If you didn't request this email change, please ignore this email or contact support immediately.
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              Lion Heart Fitness Kids<br>
              This is an automated message, please do not reply to this email.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Email verification sent successfully to:', toEmail);
    return true;
  } catch (error) {
    console.error('❌ Error sending email verification:', error);
    
    // Check for specific SendGrid errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Maximum credits exceeded')) {
      console.error('💳 SendGrid credit limit exceeded. Please upgrade your plan or check usage.');
    } else if (errorMessage.includes('Unauthorized')) {
      console.error('🔑 SendGrid API key is invalid or unauthorized.');
    } else if (errorMessage.includes('Forbidden')) {
      console.error('🚫 SendGrid account is suspended or has restrictions.');
    }
    
    return false;
  }
}

// Remove AuthenticatedRequest interface and all req.user logic
// For updatePhoto and update, require user_id in req.body

export class ProfileController {
  // GET /profile
  public async index(req: Request, res: Response) {
    try {
      console.log("heloooooooooooooooooooooooooooooo")

      const user_id = (req as any).user_id;
      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
      }

      console.log('📊 Fetching enhanced profile data for user:', user_id);

      // Fetch user info
      const user = await User.findByPk(user_id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Fetch parent profile
      const profile = await ParentProfile.findOne({ where: { user_id } });

      // Fetch children
      const children = await Child.findAll({ where: { user_id } });

      // Fetch enrollments (limit 5 like PHP)
      const enrollments = await Enrollment.findAll({ 
        where: { user_id },
        limit: 5,
        include: [{
          model: Event,
          as: 'Event',
          attributes: ['splms_event_id', 'title', 'event_start_date']
        }]
      });

      // Fetch active memberships (matching PHP: where("cancel","=",0)->whereHas('event')->limit(5))
      const memberships = await UserMembership.findAll({ 
        where: { 
          user_id,
          cancel: 0  // Only active memberships
        },
        limit: 5,
        include: [{
          model: Event,
          as: 'Event',
          attributes: ['splms_event_id', 'title', 'membership_test', 'freezed']
        }]
      });

            const rosters = await Roster.findAll({
              where: { children_id: children.map(c => c.id) },
              include: [{
                model: Event,
                as: 'event',
                attributes: ['splms_event_id', 'title', 'created_by']
              }]
            });

            // Extract coach IDs from rosters (matching PHP logic)
            const coachIds: number[] = [];
            (rosters as any[]).forEach(roster => {
              if (roster.event && (roster.event as any).created_by) {
                coachIds.push((roster.event as any).created_by);
              }
            });

      // Get unique coach IDs
      const uniqueCoachIds = [...new Set(coachIds)];

      // Fetch coaches (matching PHP: User::whereIn('id',$users)->with('personalApplication')->limit(5)->get())
      let coaches: any[] = [];
      if (uniqueCoachIds.length > 0) {
        coaches = await User.findAll({
          where: { id: uniqueCoachIds },
          limit: 5,
          attributes: ['id', 'first_name', 'last_name', 'email']
          // TODO: Include personalApplication when model is available
        });
      }

      // TODO: Fetch coupons (matching PHP: Coupon::where('individual',\Auth::user()->id)->get())
      // TODO: Fetch coupon users (matching PHP: \Auth::user()->coupons()->withPivot('used')->get())
      // TODO: Calculate coupon count (matching PHP logic)
      const coupons: any[] = []; // Placeholder
      const couponusers: any[] = []; // Placeholder
      let coupon_count_per = 0; // Placeholder

      // Fetch events for active memberships (matching PHP logic)
      let events: any[] = [];
      const activeMemberships = memberships.filter(m => !(m as any).deleted_at);
      
      if (activeMemberships.length > 0) {
        const membershipEventIds = activeMemberships
          .map(m => (m as any).splms_event_id)
          .filter(id => id);

        if (membershipEventIds.length > 0) {
                     events = await Event.findAll({
             where: {
               splms_event_id: membershipEventIds,
               membership_test: 1,
               freezed: { [require('sequelize').Op.ne]: 1 }
             },
             include: [{
               model: SportsRotation,
               as: 'SportsRotation',
               required: false,
               attributes: ['id', 'splms_event_id', 'interval_type', 'interval', 'total_rotation', 'rotation_sports', 'next_sport', 'repeat_cycle', 'next_class_start_date'] // Exclude count_rotation for now
             }]
           });
        }
      }

      // Fetch annual schedules (matching PHP logic)
      let annuals: any[] = [];
      if (events.length > 0) {
        // Filter out virtual classes
        annuals = events.filter(event => (event as any).type_of_event !== 'virtual_class');
      }
      
             // If no annuals from events, get from AnnualSchedule tablec
       if (annuals.length === 0) {
         annuals = await AnnualSchedule.findAll({
        attributes: ['id', 'description', 'start_date', 'end_date', 'enabled', 'created_at', 'updated_at'],
           where: { enabled: true },
           include: [{
             model: Event,
             as: 'event',
             attributes: ['splms_event_id', 'title', 'type_of_event']
           }]
         });
       }

      console.log('✅ Enhanced profile data fetched successfully');

   // Remove sensitive fields from user
const safeUser = user ? {
  ...user.toJSON(),
  password: undefined,
  old_password: undefined
} : null;

// Remove SportsRotation from events
const safeEvents = events.map(e => {
  const ev = e.toJSON();
  delete ev.SportsRotation;
  return ev;
});

return res.status(200).json({
  success: true,
  user: safeUser,
  profile,
  children,
  enrollments: {
    data: enrollments,
    count: enrollments.length
  },
  memberships: {
    data: memberships,
    count: memberships.length,
    active_count: activeMemberships.length
  },
  coaches: {
    data: coaches,
    count: coaches.length
  },
  coupons: {
    data: coupons,
    count: coupons.length,
    total_amount: coupon_count_per
  },
  events: {
    data: safeEvents,
    count: safeEvents.length
  }
});



    } catch (error) {
      console.error('❌ Error fetching enhanced profile data:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch profile data',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

public async memberships(req: Request, res: Response) {
  try {
    const user_id = (req as any).user_id;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const memberships = await UserMembership.findAll({
      where: { user_id, cancel: 0 },
      include: [{
        model: Event,
        as: 'Event',
        attributes: ['splms_event_id', 'title', 'membership_test', 'freezed'],
        include: [{
          model: SportsRotation,
          as: 'SportsRotation',
          required: false,
          attributes: [
            'id',
            'splms_event_id',
            'interval_type',
            'interval',
            'total_rotation',
            'rotation_sports',
            'next_sport',
            'repeat_cycle',
            'next_class_start_date'
          ]
        }]
      }]
    });

    // Transform serialized rotation_sports into JSON
    const safeMemberships = memberships.map(m => {
      const mem = m.toJSON();

      if (mem.Event?.SportsRotation?.length) {
        mem.Event.SportsRotation = mem.Event.SportsRotation.map((sr: any) => {
          let parsedSports: any = sr.rotation_sports; // default
          try {
            parsedSports = unserialize(sr.rotation_sports);
          } catch (e) {
            console.warn("⚠️ Failed to unserialize rotation_sports:", e);
          }
          return {
            ...sr,
            rotation_sports: parsedSports
          };
        });
      }

      return mem;
    });

    return res.status(200).json({
      success: true,
      memberships: {
        data: safeMemberships,
        count: safeMemberships.length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching memberships:', error);
    return res.status(500).json({
      error: 'Failed to fetch memberships',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}

  // GET /profile/auto-enrolls/:alias
  public async autoEnrolls(req: Request, res: Response) {
    try {
      const user_id = (req as any).user_id;
      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
      }

      const alias = req.params.alias;
      if (!alias) {
        return res.status(400).json({ error: 'Class alias is required' });
      }

      console.log('🔍 Auto-enrollment lookup for alias:', alias, 'user_id:', user_id);

      // Step 1: Get user's children (matching PHP: $childs = Auth::user()->children()->pluck('id'))
      const children = await Child.findAll({ 
        where: { user_id: parseInt(user_id) },
        attributes: ['id']
      });
      const childIds = children.map(child => child.id);

      if (childIds.length === 0) {
        return res.status(404).json({ error: 'No children found for this user' });
      }

      console.log('👶 Found children:', childIds);

      // Step 2: Find event by alias with rosters for user's children (matching PHP logic)
      const event = await Event.findOne({
        where: { alias: alias },
        include: [{
          model: Roster,
          as: 'Rosters',
          where: { children_id: childIds },
          required: false
        }]
      });

      if (!event) {
        return res.status(404).json({ error: 'Class not found, might be deleted' });
      }

      console.log('📚 Found event:', event.splms_event_id, 'auto_enroll_id:', event.auto_enroll_id);

      // Step 3: Check if event is expired (matching PHP: $event->event_start_date->startOfDay()->lte(Carbon::now()))
      if (!event.event_start_date) {
        return res.status(400).json({ error: 'Event start date is not available' });
      }
      
      // Step 3: Check if event is expired (matching PHP: $event->event_start_date->startOfDay()->lte(Carbon::now()))
      if (!event.event_start_date) {
        return res.status(400).json({ error: 'Event start date is not available' });
      }
      
      // Skip date check in development mode
      if (process.env.NODE_ENV !== 'development' || process.env.SKIP_DATE_CHECK !== 'true') {
        const eventStartDate = new Date(event.event_start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of day

        if (eventStartDate <= today) {
          return res.status(400).json({ 
            error: 'The link is expired, you cannot end enrollment process for an active session' 
          });
        }
      }
      
      console.log('📅 Event start date:', event.event_start_date);
      console.log('📅 Current date:', new Date().toISOString());
      console.log('🔧 Date check skipped:', process.env.NODE_ENV === 'development' && process.env.SKIP_DATE_CHECK === 'true');

      // Step 4: Get all events with same auto_enroll_id (matching PHP: $same_event = Event::withTrashed()->where('auto_enroll_id', $event->auto_enroll_id)->pluck('splms_event_id'))
      if (!event.auto_enroll_id) {
        return res.status(400).json({ error: 'This class does not have auto-enrollment functionality' });
      }
      
      const sameEvents = await Event.findAll({
        where: { auto_enroll_id: event.auto_enroll_id },
        attributes: ['splms_event_id']
      });
      const sameEventIds = sameEvents.map(e => e.splms_event_id);

      console.log('🔄 Found events with same auto_enroll_id:', sameEventIds);

      // Step 5: Find user's enrollments in the session (matching PHP: $enrollments = Auth::user()->enrollments()->whereIn('event_id',$same_event)->get())
      const enrollments = await Enrollment.findAll({
        where: { 
          user_id: parseInt(user_id),
          event_id: sameEventIds
        },
        include: [{ 
          model: Event,
          as: 'Event',
          attributes: ['splms_event_id', 'title', 'event_start_date', 'auto_enroll_id']
        }]
      });

      console.log('📝 Found enrollments:', enrollments.length);

      // Return response matching PHP view data
      return res.status(200).json({
        success: true,
        enrollments: enrollments,
        event: {
          splms_event_id: event.splms_event_id,
          title: event.title,
          alias: event.alias,
          event_start_date: event.event_start_date,
          auto_enroll_id: event.auto_enroll_id || null
        },
        children: children,
        same_event_ids: sameEventIds,
        message: 'Auto-enrollment data retrieved successfully'
      });

    } catch (error) {
      console.error('❌ Error in autoEnrolls:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch auto-enrollment data',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  // POST /profile/remove-auto-enrollments
  public async removeAutoEnrollments(req: Request, res: Response) {
    try {
      const user_id = (req as any).user_id;
      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
      }

      const { id } = req.body; // Array of enrollment IDs to remove
      if (!id || !Array.isArray(id) || id.length === 0) {
        return res.status(400).json({ error: 'Enrollment IDs are required' });
      }

      console.log('🗑️ Removing auto-enrollments for user:', user_id, 'enrollment IDs:', id);

      let deleteCount = 0;

              // Get enrollments to be deleted
        const enrollments = await Enrollment.findAll({
          where: { 
            user_id: parseInt(user_id),
            id: id
          },
          include: [{
            model: Event,
            as: 'Event',
            attributes: ['splms_event_id', 'auto_enroll_id']
          }]
        }) as any[];

      if (enrollments.length === 0) {
        return res.status(404).json({ error: 'No enrollments found to remove' });
      }

      // Get child IDs from enrollments
      const childIds = enrollments.map(enrollment => enrollment.child_id);

      console.log('👶 Found children involved:', childIds);

      // Process each enrollment
      for (const enrollment of enrollments) {
        const event = enrollment.Event;
        if (!event || !event.auto_enroll_id) {
          console.log('⚠️ Skipping enrollment - no auto_enroll_id:', enrollment.id);
          continue;
        }

        console.log('🔄 Processing enrollment for event:', event.splms_event_id, 'auto_enroll_id:', event.auto_enroll_id);

        // Get all events with same auto_enroll_id that are active and future
        const sameEvents = await Event.findAll({
          where: {
            auto_enroll_id: event.auto_enroll_id,
            event_start_date: { [require('sequelize').Op.gt]: new Date().toISOString().split('T')[0] } // Future dates only
          },
          include: [{
            model: Roster,
            as: 'Rosters',
            where: { children_id: childIds },
            required: false
          }]
        }) as any[];

        console.log('📚 Found same events:', sameEvents.length);

        // Process rosters and payments for each event
        for (const sameEvent of sameEvents) {
          if (sameEvent.Rosters && sameEvent.Rosters.length > 0) {
            for (const roster of sameEvent.Rosters) {
              if (roster.payment_id && roster.payment_id !== 0) {
                console.log('💰 Processing payment for roster:', roster.id, 'payment_id:', roster.payment_id);
                
                // TODO: Import Payments model and implement payment deletion
                // For now, we'll just delete the roster
                // const payment = await Payments.findOne({
                //   where: { 
                //     id: roster.payment_id, 
                //     payment_status: 'unpaid' 
                //   }
                // });
                // if (payment) {
                //   await payment.destroy();
                //   console.log('💸 Deleted unpaid payment:', payment.id);
                // }
                
                await roster.destroy();
                console.log('🗑️ Deleted roster:', roster.id);
              }
            }
          }
        }

        // Delete the enrollment
        await enrollment.destroy();
        deleteCount++;
        console.log('✅ Deleted enrollment:', enrollment.id);
      }

      const success = deleteCount > 0;
      console.log('📊 Auto-enrollment removal completed. Deleted:', deleteCount, 'enrollments');

      return res.status(200).json({
        success: success,
        message: success ? 'Auto-enrollments removed successfully' : 'No auto-enrollments were removed',
        deleted_count: deleteCount,
        enrollment_ids: id
      });

    } catch (error) {
      console.error('❌ Error in removeAutoEnrollments:', error);
      return res.status(500).json({
        error: 'Failed to remove auto-enrollments',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  // POST /profile/remove-enrollments
  public async removeEnrollments(req: Request, res: Response) {
    try {
      const user_id = (req as any).user_id;
      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
      }

      const { id } = req.body; // Array of enrollment IDs to remove
      if (!id || !Array.isArray(id) || id.length === 0) {
        return res.status(400).json({ error: 'Enrollment IDs are required' });
      }

      console.log('🗑️ Removing enrollments for user:', user_id, 'enrollment IDs:', id);

      let deleteCount = 0;

      // Get enrollments to be deleted (matching PHP: Auth::user()->enrollments()->whereIn('id', $request->get('id'))->get())
      const enrollments = await Enrollment.findAll({
        where: { 
          user_id: parseInt(user_id),
          id: id
        },
        include: [{
          model: Event,
          as: 'Event',
          attributes: ['splms_event_id', 'auto_enroll_id']
        }]
      }) as any[];

      if (enrollments.length === 0) {
        return res.status(404).json({ error: 'No enrollments found to remove' });
      }

      // Get child IDs from enrollments (matching PHP: $childs = $enrollments->pluck('child_id'))
      const childIds = enrollments.map(enrollment => enrollment.child_id);

      console.log('👶 Found children involved:', childIds);

      // Process each enrollment (matching PHP foreach loop)
      for (const enrollment of enrollments) {
        const event = enrollment.Event;
        if (!event) {
          console.log('⚠️ Skipping enrollment - no event found:', enrollment.id);
          continue;
        }

        console.log('🔄 Processing enrollment for event:', event.splms_event_id, 'auto_enroll_id:', event.auto_enroll_id);

        // Get all events with same auto_enroll_id that are future dates (matching PHP logic)
        if (event.auto_enroll_id) {
          const sameEvents = await Event.findAll({
            where: {
              auto_enroll_id: event.auto_enroll_id,
              event_start_date: { [require('sequelize').Op.gt]: new Date().toISOString().split('T')[0] } // Future dates only
            },
            include: [{
              model: Roster,
              as: 'Rosters',
              where: { children_id: childIds },
              required: false
            }]
          }) as any[];

          console.log('📚 Found same events:', sameEvents.length);

          // Process rosters and payments for each event (matching PHP nested loops)
          for (const sameEvent of sameEvents) {
            if (sameEvent.Rosters && sameEvent.Rosters.length > 0) {
              for (const roster of sameEvent.Rosters) {
                if (roster.payment_id && roster.payment_id !== 0) {
                  console.log('💰 Processing payment for roster:', roster.id, 'payment_id:', roster.payment_id);
                  
                  // TODO: Import Payments model and implement payment deletion (matching PHP logic)
                  // const payment = await Payments.findOne({
                  //   where: { 
                  //     id: roster.payment_id, 
                  //     payment_status: 'unpaid' 
                  //   }
                  // });
                  // if (payment) {
                  //   await payment.destroy();
                  //   console.log('💸 Deleted unpaid payment:', payment.id);
                  // }
                  
                  await roster.destroy();
                  console.log('🗑️ Deleted roster:', roster.id);
                }
              }
            }
          }
        }

        // Delete the enrollment (matching PHP: $enroll->delete())
        await enrollment.destroy();
        deleteCount++;
        console.log('✅ Deleted enrollment:', enrollment.id);
      }

      const success = deleteCount > 0;
      console.log('📊 Enrollment removal completed. Deleted:', deleteCount, 'enrollments');

      return res.status(200).json({
        success: success,
        message: success ? 'Enrollments removed successfully' : 'No enrollments were removed',
        deleted_count: deleteCount,
        enrollment_ids: id
      });

    } catch (error) {
      console.error('❌ Error in removeEnrollments:', error);
      return res.status(500).json({
        error: 'Failed to remove enrollments',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  // GET /profile/edit
  public async edit(req: Request, res: Response) {
    // No view rendering; just return a placeholder
    return res.status(200).json({ message: 'Edit profile page (placeholder)' });
  }

  // POST /profile/update-photo
  public async updatePhoto(req: Request, res: Response) {
    try {
      const user_id = (req as any).user_id;
      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
      }

      const user = await User.findByPk(user_id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let fileName = '';
      let filePath = '';

      // Create storage directory structure (matching PHP: public/storage/{user_id}/profilephoto/)
      const storagePath = path.join(process.cwd(), 'public', 'storage');
      const userDir = path.join(storagePath, String(user_id));
      const uploadDir = path.join(userDir, 'profilephoto');

      // Create directories if they don't exist (matching PHP logic)
      if (!fs.existsSync(uploadDir)) {
        if (!fs.existsSync(userDir)) {
          fs.mkdirSync(userDir, { recursive: true });
        }
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('📁 Created directory structure:', uploadDir);
      } else {
        console.log('📁 Directory already exists:', uploadDir);
      }

      // Check if existing profile image exists and remove it
      const existingProfilePath = path.join(uploadDir, 'profile.png');
      if (fs.existsSync(existingProfilePath)) {
        fs.unlinkSync(existingProfilePath);
        console.log('🗑️ Removed existing profile image:', existingProfilePath);
      }

      // Method 1: File Upload (raw buffer) - matching PHP file upload
      if (req.body && Buffer.isBuffer(req.body) && req.body.length > 0) {
        console.log('📁 Processing raw file upload, size:', req.body.length, 'bytes');
        
        // Always save as profile.png regardless of original extension (matching PHP behavior)
        fileName = 'profile.png';
        const destPath = path.join(uploadDir, fileName);
        
        // Write buffer directly to file
        fs.writeFileSync(destPath, req.body);
        
        // Store relative path in database (matching PHP format: {user_id}/profilephoto/profile.png)
        filePath = `${user_id}/profilephoto/${fileName}`;
        
        console.log('✅ Raw file uploaded successfully:', filePath);
      }
      // Method 2: Base64 Image (from frontend canvas/JS) - matching PHP base64 handling
      else if (req.body.profilephoto) {
        console.log('🖼️ Processing base64 image upload');
        
        // Remove data URL prefix (matching PHP: str_replace('data:image/png;base64,', '', $request->profilephoto))
        const base64Data = req.body.profilephoto.replace(/^data:image\/[^;]+;base64,/, '');
        
        fileName = 'profile.png';
        const destPath = path.join(uploadDir, fileName);
        
        // Write base64 data to file (matching PHP: \File::put($destinationPath.'/'. $name, base64_decode($profilephoto)))
        fs.writeFileSync(destPath, Buffer.from(base64Data, 'base64'));
        
        // Store relative path in database (matching PHP format)
        filePath = `${user_id}/profilephoto/${fileName}`;
        
        console.log('✅ Base64 image saved successfully:', filePath);
      }
      else {
        return res.status(400).json({ 
          error: 'No file or base64 image provided',
          message: 'Please provide either a file upload or base64 image data'
        });
      }

      // Update user profile image in database (matching PHP: $user->profile_image = $name)
      (user as any).profile_image = filePath;
      await user.save();

      console.log('💾 Updated database with profile image path:', filePath);

      // Return success response (matching PHP redirect with success message)
      return res.status(200).json({
        success: true,
        message: 'Profile photo updated successfully',
        profile_image: filePath,
        image_url: `/storage/${filePath}`, // URL for frontend to display
        user_id: user_id,
        file_name: fileName
      });

    } catch (error) {
      console.error('❌ Error updating profile photo:', error);
      return res.status(500).json({ 
        error: 'Failed to update profile photo',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  // POST /profile/update
  public async update(req: Request, res: Response) {
    try {
      const user_id = (req as any).user_id;
      const { basic_info, contact_info, emergency, email, first_name, last_name, ...rest } = req.body;
      
      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
      }

      const user = await User.findByPk(user_id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      console.log('📝 Updating profile for user:', user_id);

      // Update basic info
      if (basic_info) {
        if (first_name) user.first_name = first_name;
        if (last_name) user.last_name = last_name;
        await user.save();
        
        const profile = await ParentProfile.findOne({ where: { user_id: user.id } });
        if (profile) {
          await profile.update({ first_name, last_name });
        }

        // Handle email change request (matching PHP logic)
        if (email && email !== user.email) {
          console.log('📧 Email change requested:', user.email, '->', email);
          
          // Validate email format
          if (!isValidEmail(email)) {
            console.log('❌ Invalid email format:', email);
            return res.status(400).json({
              error: 'Invalid email format',
              message: 'Please provide a valid email address (e.g., user@example.com)',
              invalid_email: email
            });
          }

          // Check if email is already in use by another user
          const existingUser = await User.findOne({ where: { email: email } });
          if (existingUser && existingUser.id !== parseInt(user_id)) {
            console.log('❌ Email already in use by another user:', email);
            return res.status(409).json({
              error: 'Email already in use',
              message: 'This email address is already registered by another user',
              email: email
            });
          }

          // Check if there's already a pending email change request for this user
          const existingRequest = await ChangeEmailRequest.findOne({
            where: { 
              user_id: parseInt(user_id),
              verified: 0
            }
          });
          if (existingRequest) {
            console.log('⚠️ User already has a pending email change request');
            return res.status(409).json({
              error: 'Pending email change request',
              message: 'You already have a pending email change request. Please check your email or wait before requesting another change.',
              existing_request: {
                email: existingRequest.email,
                created_at: existingRequest.activation_time
              }
            });
          }
          
          // Generate unique activation token (matching PHP: sha1(time() . uniqid() . $request->get('email')))
          const activationToken = require('crypto').createHash('sha1')
            .update(Date.now().toString() + Math.random().toString() + email)
            .digest('hex');

          // Create email change request (matching PHP ChangeEmailRequest::create)
          const changeRequest = await ChangeEmailRequest.create({
            user_id: parseInt(user_id),
            email: email,
            verified: 0,
            activation_link: activationToken,
            activation_time: new Date().toISOString()
          });

          console.log('✅ Email change request created with token:', activationToken);

          // Send verification email
          const userName = user.first_name || user.email.split('@')[0];
          const emailSent = await sendEmailChangeVerification(email, activationToken, userName);
          
          if (emailSent) {
            return res.status(200).json({
              success: true,
              message: 'Email change request created. Verification email sent to your new email address.',
              email_change_request: {
                id: changeRequest.id,
                email: changeRequest.email,
                activation_link: changeRequest.activation_link,
                activation_time: changeRequest.activation_time
              },
              verification_url: `/profile/update-email/${activationToken}`,
              email_sent: true
            });
          } else {
            // If email sending fails, still create the request but inform the user
            return res.status(200).json({
              success: true,
              message: 'Email change request created, but there was an issue sending the verification email. Please contact support.',
              email_change_request: {
                id: changeRequest.id,
                email: changeRequest.email,
                activation_link: changeRequest.activation_link,
                activation_time: changeRequest.activation_time
              },
              verification_url: `/profile/update-email/${activationToken}`,
              email_sent: false,
              warning: 'Email delivery failed, but you can still use the verification link above'
            });
          }
        }
      }

      // Update contact info
      if (contact_info) {
        const profile = await ParentProfile.findOne({ where: { user_id: user.id } });
        if (profile) {
          await profile.update({ ...rest });
        }
        
        if (emergency) {
          const emergencyContact = await EmergencyContact.findOne({ where: { user_id: user.id } });
          if (emergencyContact) {
            await emergencyContact.update(emergency);
          }
        }
      }

      console.log('✅ Profile updated successfully');
      return res.status(200).json({ 
        success: true,
        message: 'Profile updated successfully' 
      });

    } catch (error) {
      console.error('❌ Error in update:', error);
      return res.status(500).json({
        error: 'Failed to update profile',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  // GET /profile/update-email/:token
  public async updateEmail(req: Request, res: Response) {
    console.log(">>>>>> purchasedClasses route hit");

    try {
      const token = req.params.token;
      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      console.log('🔐 Processing email update with token:', token);

      // Find the email change request by token
      const changeRequest = await ChangeEmailRequest.findOne({
        where: { activation_link: token }
      });

      if (!changeRequest) {
        console.log('❌ Email change request not found for token:', token);
        return res.status(404).json({
          error: 'Invalid or expired token',
          message: 'The email change link is invalid or has expired'
        });
      }

      console.log('📧 Found email change request for user:', changeRequest.user_id);

      // Check if request is already verified
      if (changeRequest.verified === 1) {
        console.log('⚠️ Email change request already verified');
        return res.status(400).json({
          error: 'Token already used',
          message: 'This email change link has already been used'
        });
      }

      // Find the user
      const user = await User.findByPk(changeRequest.user_id);
      if (!user) {
        console.log('❌ User not found for email change request');
        return res.status(404).json({
          error: 'User not found',
          message: 'The user associated with this email change request no longer exists'
        });
      }

             console.log('👤 Found user:', user.email, '-> updating to:', changeRequest.email);

       // Validate the email format before updating (extra security check)
       if (!isValidEmail(changeRequest.email)) {
         console.log('❌ Invalid email format in change request:', changeRequest.email);
         return res.status(400).json({
           error: 'Invalid email format in change request',
           message: 'The email address in the change request is not valid',
           invalid_email: changeRequest.email
         });
       }

       // Check if the new email is already in use by another user
       const existingUser = await User.findOne({ where: { email: changeRequest.email } });
       if (existingUser && existingUser.id !== changeRequest.user_id) {
         console.log('❌ Email already in use by another user:', changeRequest.email);
         return res.status(409).json({
           error: 'Email already in use',
           message: 'This email address is already registered by another user',
           email: changeRequest.email
         });
       }

       // Update the email change request as verified
       await changeRequest.update({
         verified: 1,
         activation_link: null,
         activation_time: null
       });

       console.log('✅ Email change request marked as verified');

       // Update the user's email
       await user.update({ email: changeRequest.email });

       console.log('✅ User email updated successfully');

      // Return success response (matching PHP redirect with success message)
      return res.status(200).json({
        success: true,
        message: 'Your email has been updated successfully. Please login with your new email address.',
        old_email: user.email,
        new_email: changeRequest.email,
        user_id: changeRequest.user_id,
        updated_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error in updateEmail:', error);
      return res.status(500).json({
        error: 'Failed to update email',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }


  // POST /profile/remove-membership/:membership_id
  public async removeMembership(req: Request, res: Response) {
    try {
      const user_id = (req as any).user_id;
      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
      }

      const membership_id = req.params.membership_id;
      if (!membership_id) {
        return res.status(400).json({ error: 'Membership ID is required' });
      }

      console.log('🗑️ Removing membership for user:', user_id, 'membership_id:', membership_id);

      // Find the user membership
      const userMembership = await UserMembership.findOne({
        where: {
          id: parseInt(membership_id),
          user_id: parseInt(user_id)
        }
      });

      if (!userMembership) {
        return res.status(404).json({ 
          error: 'Membership not found',
          message: 'The specified membership does not exist or does not belong to this user'
        });
      }

      // Mark membership as cancelled (matching PHP logic: $usermembership->cancel = 1)
      (userMembership as any).cancel = 1;
      await userMembership.save();

      console.log('✅ Membership cancelled successfully:', membership_id);

      return res.status(200).json({
        success: true,
        message: 'Membership removed successfully',
        membership_id: membership_id,
        cancelled_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error in removeMembership:', error);
      return res.status(500).json({
        error: 'Failed to remove membership',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
 

  // GET /profile/purchased-classes
  public async purchasedClasses(req: Request, res: Response) {  
    try {
      const user_id = (req as any).user_id;
      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
      }

      console.log('📜 Fetching purchased classes for user:', user_id);

      // Fetch all children for the user
      const children = await Child.findAll({ where: { user_id: user_id } });
      const childIds = children.map(child => child.id);

      // Fetch all rosters for the user's children, including related event and child data
      const purchasedClasses = await Roster.findAll({
        where: { children_id: childIds },
        include: [
          {
            model: Event,
            as: 'event',
            attributes: ['title', 'event_start_date', 'event_end_date'],
          },
          {
            model: Child,
            attributes: ['first_name', 'last_name'],
          },
        ],
      });

      const now = new Date();
      now.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

      // Filter classes into active and expired, similar to PHP logic
      const activeClasses = purchasedClasses.filter(roster => {
        const event = (roster as any).event;
        return event && new Date(event.event_end_date) >= now;
      });

      const expiredClasses = purchasedClasses.filter(roster => {
        const event = (roster as any).event;
        return !event || new Date(event.event_end_date) < now;
      });

      console.log('✅ Found', activeClasses.length, 'active and', expiredClasses.length, 'expired classes.');

      return res.status(200).json({ success: true, activeClasses, expiredClasses });
    } catch (error) {
      console.error('❌ Error fetching purchased classes:', error);
      return res.status(500).json({ error: 'Failed to fetch purchased classes' });
    }
  }
}
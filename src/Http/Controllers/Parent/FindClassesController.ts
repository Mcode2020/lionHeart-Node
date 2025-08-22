import { Request, Response } from 'express';
import { Event } from '../../../Models/Event';
import { UserMembership } from '../../../Models/UserMembership';
import { Op, Sequelize } from 'sequelize';
import { User } from '../../../Models/User';
import { Zipcode } from '../../../Models/Zipcode';
import axios from 'axios';
import sequelize from '../../../db';
import { QueryTypes } from 'sequelize';
import { AnnualSchedule } from '../../../Models/AnnualSchedule';

const DEFAULT_RADIUS = 30;
const DEFAULT_LIMIT = 5;

// --- Utility: Real geocoding implementation ---
async function getLnt(zipcode: string): Promise<{ lat: number, lng: number, country: string } | null> {
  if (!zipcode) return null;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'YOUR_FALLBACK_API_KEY'; // Use your actual key
  console.log('--- Using Google Maps API Key:', apiKey ? 'Loaded' : 'NOT LOADED ---'); // 1. Check if key is loaded
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${zipcode}&key=${apiKey}`;
  try {
    const response = await axios.get(url);
    const data = response.data;
    console.log('--- Google Maps API Response Status:', data.status, '---'); // 2. Check API response status
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      const countryComponent = data.results[0].address_components.find(
        (comp: any) => comp.types.includes('country')
      );
      const result = {
        lat: location.lat,
        lng: location.lng,
        country: countryComponent ? countryComponent.short_name : 'US',
      };
      console.log('--- Geocoding Result:', result, '---'); // 3. Check the coordinates
      return result;
    }
    console.log('--- Google Maps API returned no results for zipcode:', zipcode, '---');
    return null;
  } catch (error) {
    console.error('--- Error calling Google Maps API:', (error as any).response?.data || error, '---'); // Log detailed error
    return null;
  }
}

// --- Utility: Filter classes by distance ---
function filterClass(classes: any[], start: number, end: number) {
  return classes.filter(cls => cls.distance >= start && cls.distance <= end);
}

// --- Utility: Invitation tracking stub ---
async function ParentVisitSiteActive(invitationId: string) {
  // TODO: Implement invitation tracking logic if needed
  return false;
}

// --- Enhanced determineZipcode ---
async function determineZipcode(req: Request): Promise<any> {
  // Default values
  let zipcode = { latitude: 40.71427, longitude: -74.00597, zipcode: '10007', country: 'US' };
  if (req.query.zipcode) {
    const data = await getLnt(String(req.query.zipcode));
    if (data) {
      zipcode = {
        latitude: data.lat,
        longitude: data.lng,
        zipcode: String(req.query.zipcode),
        country: data.country,
      };
      return zipcode;
    }
  }
  // TODO: Add session, IP, and parent profile logic if available
  return zipcode;
}

export class FindClassesController {
  // GET /class/search
  async search(req: Request, res: Response) {
    try {
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : DEFAULT_LIMIT;
      const radius = req.query.radius ? parseInt(req.query.radius as string) : DEFAULT_RADIUS;
      const term = req.query.term ? req.query.term as string : '';
      // Build the raw SQL query
      let whereClauses = [
        "e.enabled = 1",
        "e.freezed = 0",
        "e.scheduled = 1",
        "e.isprivate != 1",
        "e.type_of_event != 'virtual_class'"
      ];
      if (term) {
        whereClauses.push(`e.title LIKE :term`);
      }
      const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';
      const sql = `SELECT e.*, 
        u.*,
        z.id as zipcode_id, z.country as zipcode_country, z.zipcode as zipcode_zipcode, z.latitude as zipcode_latitude, z.longitude as zipcode_longitude
        FROM level3_splms_events e
        JOIN users u ON e.created_by = u.id
        LEFT JOIN zipcodes z ON e.event_zip = z.zipcode
        ${whereSQL}
        ORDER BY e.event_start_date DESC 
        LIMIT :limit OFFSET :offset`;
      const replacements: any = { limit, offset };
      if (term) replacements.term = `%${term}%`;
      const rows = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
      // Post-process: nest user and zipcode, add computed fields
      const classes = [];
      // List of all user fields to extract from the row
      const userFieldNames = [
        'id','first_name','middle_name','last_name','username','email','password','password_old','activation_time','activation_token','amount','api_token','apple_id','approval_code','bio','card_brand','card_last_four','certificate','coach_final_approve','coach_id','code','coupon_type','created_at','customer_profile','deleted_at','device_token','device_type','facebook_id','fcm_token','google_id','hascoapplicant','havecoapplicant','intro_video','isCoachPaid','isNewUser','isPhoneVerified','is_social','is_webinar','isemailverified','monthly_charge','name','onboarding_stripe_customer_id','otp_code','placeid','product','profile_image','reset_token','revenu_payment','role_id','royalty','sector','standard_account','status','stripe_account_id','stripe_id','subscribe','trial_ends_at','updated_at','visit_count','visit_updated','welcome_code','zipcode'
      ];
      for (const row of rows as any[]) {
        // Dynamically nest all user fields
        const user: any = {};
        for (const key of userFieldNames) {
          if (row.hasOwnProperty(key)) {
            user[key] = row[key];
          }
        }
        // Nest zipcode
        const zipcodeObj = {
          id: row.zipcode_id,
          country: row.zipcode_country,
          zipcode: row.zipcode_zipcode,
          latitude: row.zipcode_latitude,
          longitude: row.zipcode_longitude
        };
        // Remove flat user/zipcode fields
        const {
          // remove all user fields
          id, first_name, middle_name, last_name, username, email, password, password_old, activation_time, activation_token, amount, api_token, apple_id, approval_code, bio, card_brand, card_last_four, certificate, coach_final_approve, coach_id, code, coupon_type, created_at, customer_profile, deleted_at, device_token, device_type, facebook_id, fcm_token, google_id, hascoapplicant, havecoapplicant, intro_video, isCoachPaid, isNewUser, isPhoneVerified, is_social, is_webinar, isemailverified, monthly_charge, name, onboarding_stripe_customer_id, otp_code, placeid, product, profile_image, reset_token, revenu_payment, role_id, royalty, sector, standard_account, status, stripe_account_id, stripe_id, subscribe, trial_ends_at, updated_at, visit_count, visit_updated, welcome_code, zipcode,
          zipcode_id, zipcode_country, zipcode_zipcode, zipcode_latitude, zipcode_longitude,
          ...classData
        } = row;
        // Compute class_start and class_end fields (mimic PHP logic)
        const parseDateTime = (dateStr: any, timeStr: any) => {
          if (!dateStr || !timeStr) return null;
          // Try to parse as ISO, fallback to concatenation
          const date = typeof dateStr === 'string' ? dateStr.split('T')[0] : dateStr;
          return new Date(`${date} ${timeStr}`);
        };
        // class_start logic
        let class_start = null;
        if (row.event_start_date && row.event_time) {
          class_start = parseDateTime(row.event_start_date, row.event_time);
        }
        // class_end logic
        let class_end = null;
        if (row.event_end_date && row.event_end_time) {
          class_end = parseDateTime(row.event_end_date, row.event_end_time);
        }
        classData.class_start = class_start;
        classData.class_end = class_end;
        // Add computed fields
        const totalMembershipUsers = await UserMembership.count({ where: { splms_event_id: classData.splms_event_id } });
        classData.totalMembershipUsers = totalMembershipUsers;
        classData.isMax = (totalMembershipUsers >= (classData.max_participants || 0) && (classData.max_participants || 0) !== 0) ? 1 : 0;
        // Attach nested
        classData.user = user;
        classData.zipcode = zipcodeObj;
        classes.push(classData);
      }
      return res.json(classes);
    } catch (err: any) {
      console.error('Error fetching classes:', err);
      return res.status(500).json({ error: 'Failed to fetch classes', details: err.message });
    }
  }

  // GET /class/live
  async liveClasses(req: Request, res: Response) {
    try {
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : DEFAULT_LIMIT;
      const radius = req.query.radius ? parseInt(req.query.radius as string) : DEFAULT_RADIUS;
      const zipcode = await determineZipcode(req);
      const distanceSelect = Sequelize.literal(`ROUND((3959 * acos(cos(radians(${zipcode.latitude})) * cos(radians(event_latitude)) * cos(radians(event_longitude) - radians(${zipcode.longitude})) + sin(radians(${zipcode.latitude})) * sin(radians(event_latitude)))), 2)`);
      // Apply all filters/scopes, but override type_of_event for virtual_class
      const where = Object.assign(
        {},
        Event.activeMembershipsClasses(),
        Event.regcutoffMembershipClasses(),
        Event.scheduledClasses(),
        Event.parentClasses(),
        Event.publicClasses(),
        Event.filter(req.query),
        {
          event_latitude: { [Op.ne]: null },
          event_longitude: { [Op.ne]: null },
          type_of_event: 'virtual_class',
        }
      );
      const classes = await Event.findAll({
        attributes: {
          include: [[distanceSelect, 'distance']],
        },
        where,
        order: [[Sequelize.col('distance'), 'ASC'], ['event_start_date', 'DESC']],
        offset,
        limit: 500,
      });
      const filteredClasses = (classes as any[]).filter(cls => cls.get('distance') <= radius);
      const limitedClasses = filteredClasses.slice(0, limit);
      return res.json({
        classes: limitedClasses.map(cls => cls.toJSON()),
        totalclassinrange: filteredClasses.length,
        zipcode,
        invalidZipcode: false,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch live classes', details: err.message });
    }
  }

  // GET /class/free-trial
  async freeTrialClass(req: Request, res: Response) {
    try {
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : DEFAULT_LIMIT;
      const radius = req.query.radius ? parseInt(req.query.radius as string) : DEFAULT_RADIUS;
      const zipcode = await determineZipcode(req);
      if (req.query.invitation) {
        await ParentVisitSiteActive(String(req.query.invitation));
      }
      const distanceSelect = Sequelize.literal(`ROUND((3959 * acos(cos(radians(${zipcode.latitude})) * cos(radians(event_latitude)) * cos(radians(event_longitude) - radians(${zipcode.longitude})) + sin(radians(${zipcode.latitude})) * sin(radians(event_latitude)))), 2)`);
      // Apply all filters/scopes, but override membership_test for free trial
      const where = Object.assign(
        {},
        Event.activeMembershipsClasses(),
        Event.regcutoffMembershipClasses(),
        Event.scheduledClasses(),
        Event.parentClasses(),
        Event.publicClasses(),
        Event.filter(req.query),
        {
          event_latitude: { [Op.ne]: null },
          event_longitude: { [Op.ne]: null },
          membership_test: 1,
        }
      );
      const classes = await Event.findAll({
        attributes: {
          include: [[distanceSelect, 'distance']],
        },
        where,
        order: [[Sequelize.col('distance'), 'ASC'], ['event_start_date', 'DESC']],
        offset,
        limit: 500,
      });
      const filteredClasses = (classes as any[]).filter(cls => cls.get('distance') <= radius);
      const limitedClasses = filteredClasses.slice(0, limit);
      return res.json({
        classes: limitedClasses.map(cls => cls.toJSON()),
        totalclassinrange: filteredClasses.length,
        zipcode,
        invalidZipcode: false,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch free trial classes', details: err.message });
    }
  }

  // GET /class/details/:alias
  async classDetails(req: Request, res: Response) {
    try {
      const alias = req.params.alias;
      const invitation = req.query.invitation as string | undefined;
      let user = null;
      if ((req as any).isAuthenticated && (req as any).user) {
        user = (req as any).user.name;
      }
      // Invitation handling
      if (invitation) {
        await ParentVisitSiteActive(invitation);
      }
      // Logging
      console.log(`${req.ip} === ${user} ====== ${alias}`);
      // Fetch class with user
      const cls = await Event.findOne({
        where: { alias },
        include: [{ model: User, as: 'user' }],
      });
      if (!cls) {
        return res.status(404).json({ error: 'This class might be deleted or expired!!' });
      }
      // Count memberships and set isMax
      const totalMembershipUsers = await UserMembership.count({ where: { splms_event_id: cls.splms_event_id } });
      const isMax = (totalMembershipUsers >= (cls.max_participants || 0) && (cls.max_participants || 0) !== 0) ? 1 : 0;
      // Fetch other classes by the same user (excluding current)
      let otherclasses: any[] = [];
      if ((cls as any).user && (cls as any).user.id) {
        otherclasses = await Event.findAll({
          where: {
            created_by: (cls as any).user.id,
            splms_event_id: { [Op.ne]: cls.splms_event_id },
          },
          limit: 8,
        });
      }
      // annuals: just the current class in an array
      const annuals: any[] = [cls];
      return res.json({
        class: cls.toJSON(),
        otherclasses: otherclasses.map(c => c.toJSON()),
        annuals: annuals.map(a => a.toJSON()),
        totalMembershipUsers,
        isMax,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch class details', details: err.message });
    }
  }

  // GET /class/event-by-zipcode
  async getEventUsingZipcode(req: Request, res: Response) {
    try {
      let event = null;
      if (req.query.zipcode) {
        event = await Event.findOne({ where: { event_zip: req.query.zipcode } });
        if (!event) {
          event = await Event.findOne({ where: { event_zip: { [Op.ne]: null } }, order: [['created_at', 'DESC']] });
        }
      } else {
        // TODO: Add user profile zipcode and nearby event logic if available
        event = await Event.findOne({ where: { event_zip: { [Op.ne]: null } }, order: [['created_at', 'DESC']] });
      }
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      return res.json({ event: event.toJSON() });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch event by zipcode', details: err.message });
    }
  }

  // GET /class/location-search - Replicates the main PHP index() method
  async searchByLocation(req: Request, res: Response) {
    try {
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : DEFAULT_LIMIT;
      const radius = req.query.radius ? parseInt(req.query.radius as string) : DEFAULT_RADIUS;
      const zipcode = await determineZipcode(req);
      console.log('--- Using Coordinates for Search:', zipcode, '---'); // 4. Check coordinates used in search
      const distanceSelect = Sequelize.literal(`ROUND((3959 * acos(cos(radians(${zipcode.latitude})) * cos(radians(event_latitude)) * cos(radians(event_longitude) - radians(${zipcode.longitude})) + sin(radians(${zipcode.latitude})) * sin(radians(event_latitude)))), 2)`);
      // Build where clause using all filters/scopes from the PHP controller
      const where = Object.assign(
        {},
        Event.activeMembershipsClasses(),
        Event.regcutoffMembershipClasses(),
        Event.scheduledClasses(),
        Event.parentClasses(),
        Event.publicClasses(),
        Event.filter(req.query),
        {
          event_latitude: { [Op.ne]: null },
          event_longitude: { [Op.ne]: null },
          type_of_event: { [Op.ne]: 'virtual_class' },
        }
      );
      // Fetch classes with distance calculation and eager load user, zipcode
      const classes = await Event.findAll({
        attributes: {
          include: [[distanceSelect, 'distance']],
        },
        where,
        include: [
          { model: User, as: 'user' },
          { model: Zipcode, as: 'zipcode' },
        ],
        order: [[Sequelize.col('distance'), 'ASC'], ['event_start_date', 'DESC']],
        offset,
        limit: 500, // Fetch more to filter by radius in code, matching PHP logic
      });
      // Filter by radius in code after fetching from DB
      console.log('--- Classes Found BEFORE Radius Filter:', classes.length, '---'); // 5. Check results before filter
      const filteredClasses = (classes as any[]).filter(cls => cls.get('distance') <= radius);
      console.log('--- Classes Found AFTER Radius Filter:', filteredClasses.length, '---'); // 6. Check results after filter
      const limitedClasses = filteredClasses.slice(0, limit);
      // Build response in the same structure as the search() method
      const userFieldNames = [
        'id','first_name','middle_name','last_name','username','email','password','password_old','activation_time','activation_token','amount','api_token','apple_id','approval_code','bio','card_brand','card_last_four','certificate','coach_final_approve','coach_id','code','coupon_type','created_at','customer_profile','deleted_at','device_token','device_type','facebook_id','fcm_token','google_id','hascoapplicant','havecoapplicant','intro_video','isCoachPaid','isNewUser','isPhoneVerified','is_social','is_webinar','isemailverified','monthly_charge','name','onboarding_stripe_customer_id','otp_code','placeid','product','profile_image','reset_token','revenu_payment','role_id','royalty','sector','standard_account','status','stripe_account_id','stripe_id','subscribe','trial_ends_at','updated_at','visit_count','visit_updated','welcome_code','zipcode'
      ];
      const processedClasses = [];
      for (const cls of limitedClasses) {
        const classObj = cls.toJSON();
        // Build user object
        const user: any = {};
        if (classObj.user) {
          for (const key of userFieldNames) {
            if (classObj.user.hasOwnProperty(key)) {
              user[key] = classObj.user[key];
            } else {
              user[key] = null;
            }
          }
        }
        // Build zipcode object
        const zipcodeObj = classObj.zipcode ? {
          id: classObj.zipcode.id,
          country: classObj.zipcode.country,
          zipcode: classObj.zipcode.zipcode,
          latitude: classObj.zipcode.latitude,
          longitude: classObj.zipcode.longitude
        } : {};
        // Remove flat user/zipcode fields if present
        delete classObj.user;
        delete classObj.zipcode;
        // Ensure all event fields from /class/search are present
        const eventFieldNames = [
          'splms_event_id','fk_lead_id','fk_invoice_account','school_id','pay_type','session_type','title','alias','description','image','price','event_age','event_sports','event_type','splms_speaker_id','splms_eventcategory_id','event_start_date','event_end_time','event_time','event_end_date','first_session_date','event_state','event_city','event_territory','event_zip','event_address','enabled','ordering','created_by','modified_by','locked_by','locked_on','map','event_latitude','event_longitude','coupon_price','coupon_code','payment_due_date','fk_park_id','fk_special_event_id','old_event_start_date','old_event_time','associate_coach','tmp_alias','invoiceid','isprivate','isprotected','halt_date','auto_enroll_id','no_class_days','creator_id','assign_date','payout_method','payout_hourly_rate','classification','sub_coach_id','sub_class_days','makeup_days','prefered_makup_day','makeup_start_time','makeup_end_time','type_of_event','party_email','party_phone','sport_description','is_bh_invoice','event_category','special_notes','kick_back','scheduled','send_reg_mail','membership_test','membership_type','freezed','unfreezed','rotation','issametitle','timezone','account_id','max_participants','accepted','isNewClass','cancel_class','send_class_invite','associate_coach_id','level','hide_sport_rotation','rev_split','remember_token'
        ];
        for (const key of eventFieldNames) {
          if (!classObj.hasOwnProperty(key)) {
            classObj[key] = null;
          }
        }
        // Add computed fields
        const totalMembershipUsers = await UserMembership.count({ where: { splms_event_id: classObj.splms_event_id } });
        classObj.totalMembershipUsers = totalMembershipUsers;
        classObj.isMax = (totalMembershipUsers >= (classObj.max_participants || 0) && (classObj.max_participants || 0) !== 0) ? 1 : 0;
        // Attach nested
        classObj.user = user;
        classObj.zipcode = zipcodeObj;
        processedClasses.push(classObj);
      }
      // Fetch all annual_sports
      const annual_sports = await AnnualSchedule.findAll({
        attributes: ['id']
      });
      return res.json({
        classes: processedClasses,
        totalclassinrange: filteredClasses.length,
        zipcode,
        invalidZipcode: false,
        annual_sports
      });
    } catch (err: any) {
      console.error('Error fetching classes by location:', err);
      return res.status(500).json({ error: 'Failed to fetch classes by location', details: err.message });
    }
  }
}
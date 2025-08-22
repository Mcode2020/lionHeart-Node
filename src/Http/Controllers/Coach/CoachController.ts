import { Request, Response } from 'express';
import { User } from '../../../Models/User';
import { PersonalApplication } from '../../../Models/PersonalApplication';
import { Op, literal } from 'sequelize';
import sequelize from '../../../db';
import { determineZipcode } from '../zipcodeUtil';
import { Role } from '../../../Models/Role';

export class CoachController {
  /**
   * GET /coaches
   * Query params: latitude, longitude, radius, offset, limit, name
   */
  public async getCoaches(req: Request, res: Response) {
    try {
      // Use shared determineZipcode utility
      const zipcode = await determineZipcode(req);
      console.log('--- Using Coordinates for Coach Search:', zipcode, '---');
      const {
        radius = 30,
        offset = 0,
        limit = 20,
        name
      } = req.query;
      console.log('--- Using Radius for Coach Search:', radius, '---');
      // Name filter
      const nameFilter = name
        ? {
            [Op.or]: [
              { first_name: { [Op.like]: `%${name}%` } },
              { last_name: { [Op.like]: `%${name}%` } }
            ]
          }
        : {};
      // Find all active coaches with location
      const coaches = await User.findAll({
        where: nameFilter,
        include: [
          {
            model: PersonalApplication,
            as: 'personalApplication',
            required: true
          },
          {
            model: Role,
            as: 'Roles',
            through: { attributes: [] }
          }
        ],
        attributes: {
          include: [
            [
              // Haversine formula for distance in miles
              literal(`ROUND((3959 * acos(cos(radians(${zipcode.latitude})) * cos(radians(personalApplication.latitude)) * cos(radians(personalApplication.longitude) - radians(${zipcode.longitude})) + sin(radians(${zipcode.latitude})) * sin(radians(personalApplication.latitude)))), 2)`),
              'distance'
            ]
          ]
        },
        order: literal('distance ASC'),
        offset: Number(offset),
        limit: Number(limit)
      });
      // Filter by radius
      const filtered = coaches.filter((coach: any) => coach.get('distance') <= Number(radius));
      // Map coaches to include all required fields, filling missing ones with PHP-like defaults, and nest personal_application and roles
      const userFieldNames = [
        'id','first_name','middle_name','last_name','username','email','isemailverified','activation_token','activation_time','status','password_old','profile_image','bio','placeid','coach_id','certificate','customer_profile','stripe_id','stripe_account_id','revenu_payment','hascoapplicant','havecoapplicant','card_brand','card_last_four','trial_ends_at','created_at','updated_at','monthly_charge','standard_account','api_token','device_token','device_type','subscribe','royalty','deleted_at','role_id','reset_token','isPhoneVerified','code','product','sector','google_id','facebook_id','apple_id','visit_count','visit_updated','coupon_type','isCoachPaid','coach_final_approve','amount','intro_video','onboarding_stripe_customer_id','isNewUser','welcome_code','approval_code','is_webinar','is_social','otp_code','fcm_token','fullname','name'
      ];
      // Default values based on PHP response
      const defaultValues: Record<string, any> = {
        middle_name: null,
        isemailverified: 0,
        activation_token: null,
        activation_time: null,
        status: null,
        password_old: null,
        profile_image: null,
        bio: '',
        placeid: '',
        coach_id: null,
        certificate: '',
        customer_profile: null,
        stripe_id: '',
        stripe_account_id: null,
        revenu_payment: 0,
        hascoapplicant: 0,
        havecoapplicant: 0,
        card_brand: null,
        card_last_four: null,
        trial_ends_at: null,
        created_at: null,
        updated_at: null,
        monthly_charge: 0,
        standard_account: 0,
        api_token: null,
        device_token: null,
        device_type: null,
        subscribe: 0,
        royalty: 0,
        deleted_at: null,
        role_id: null,
        reset_token: null,
        isPhoneVerified: 0,
        code: '',
        product: '',
        sector: '',
        google_id: '',
        facebook_id: '',
        apple_id: null,
        visit_count: 0,
        visit_updated: null,
        coupon_type: '',
        isCoachPaid: 0,
        coach_final_approve: 0,
        amount: '0',
        intro_video: '',
        onboarding_stripe_customer_id: null,
        isNewUser: 0,
        welcome_code: null,
        approval_code: null,
        is_webinar: 0,
        is_social: 0,
        otp_code: 0,
        fcm_token: null,
        fullname: '',
        name: ''
      };
      const mappedCoaches = filtered.map((coach: any) => {
        const data = coach.toJSON();
        const obj: any = {};
        for (const key of userFieldNames) {
          if (data[key] !== undefined && data[key] !== null) {
            obj[key] = data[key];
          } else if (key === 'fullname' || key === 'name') {
            obj[key] = `${data.first_name || ''} ${data.last_name || ''}`.trim();
          } else if (defaultValues.hasOwnProperty(key)) {
            obj[key] = defaultValues[key];
          } else {
            obj[key] = null;
          }
        }
        // Add lat/lng and distance from personalApplication
        if (data.personalApplication) {
          obj.latitude = String(data.personalApplication.latitude ?? '');
          obj.longitude = String(data.personalApplication.longitude ?? '');
          // Include all fields from personalApplication
          obj.personal_application = { ...data.personalApplication };
        } else {
          obj.latitude = '';
          obj.longitude = '';
          obj.personal_application = null;
        }
        obj.distance = data.distance;
        // Include all fields from roles
        obj.roles = (data.Roles || []).map((role: any) => ({ ...role }));
        obj.coachreviews = [];
        return obj;
      });
      const totalcoachinrange = mappedCoaches.length;
      return res.status(200).json({
        coaches: mappedCoaches,
        totalcoachinrange: totalcoachinrange
      });
    } catch (error) {
      console.error('Error fetching coaches:', error);
      return res.status(500).json({ error: 'Failed to fetch coaches' });
    }
  }

  /**
   * POST /coaches/search
   * Body: { name: string }
   * Returns: { coaches, totalcoachinrange } (compact array)
   * If AJAX: returns JSON with rendered partial view (placeholder)
   * Otherwise: renders full coach list view (placeholder)
   */
  public async search(req: Request, res: Response) {
    try {
      const name = (req.body && req.body.name) || (req.query && req.query.name) || '';
      // Find all coaches whose full name contains the search term
      const coaches = await User.findAll({
        where: {
          // Simulate CONCAT(first_name, ' ', last_name) LIKE %name%
          [Op.and]: [
            sequelize.where(
              sequelize.fn('concat', sequelize.col('first_name'), ' ', sequelize.col('last_name')),
              { [Op.like]: `%${name}%` }
            )
          ]
        }
      });
      // Map coaches to include all required fields, filling missing ones with PHP-like defaults
      const userFieldNames = [
        'id','first_name','middle_name','last_name','username','email','isemailverified','activation_token','activation_time','status','password_old','profile_image','bio','placeid','coach_id','certificate','customer_profile','stripe_id','stripe_account_id','revenu_payment','hascoapplicant','havecoapplicant','card_brand','card_last_four','trial_ends_at','created_at','updated_at','monthly_charge','standard_account','api_token','device_token','device_type','subscribe','royalty','deleted_at','role_id','reset_token','isPhoneVerified','code','product','sector','google_id','facebook_id','apple_id','visit_count','visit_updated','coupon_type','isCoachPaid','coach_final_approve','amount','intro_video','onboarding_stripe_customer_id','isNewUser','welcome_code','approval_code','is_webinar','is_social','otp_code','fcm_token','fullname','name'
      ];
      // Default values based on PHP response
      const defaultValues: Record<string, any> = {
        middle_name: null,
        isemailverified: 0,
        activation_token: null,
        activation_time: null,
        status: null,
        password_old: null,
        profile_image: null,
        bio: '',
        placeid: '',
        coach_id: null,
        certificate: '',
        customer_profile: null,
        stripe_id: '',
        stripe_account_id: null,
        revenu_payment: 0,
        hascoapplicant: 0,
        havecoapplicant: 0,
        card_brand: null,
        card_last_four: null,
        trial_ends_at: null,
        created_at: null,
        updated_at: null,
        monthly_charge: 0,
        standard_account: 0,
        api_token: null,
        device_token: null,
        device_type: null,
        subscribe: 0,
        royalty: 0,
        deleted_at: null,
        role_id: null,
        reset_token: null,
        isPhoneVerified: 0,
        code: '',
        product: '',
        sector: '',
        google_id: '',
        facebook_id: '',
        apple_id: null,
        visit_count: 0,
        visit_updated: null,
        coupon_type: '',
        isCoachPaid: 0,
        coach_final_approve: 0,
        amount: '0',
        intro_video: '',
        onboarding_stripe_customer_id: null,
        isNewUser: 0,
        welcome_code: null,
        approval_code: null,
        is_webinar: 0,
        is_social: 0,
        otp_code: 0,
        fcm_token: null,
        fullname: '',
        name: ''
      };
      const mappedCoaches = coaches.map((coach: any) => {
        const obj: any = {};
        for (const key of userFieldNames) {
          if (coach[key] !== undefined && coach[key] !== null) {
            obj[key] = coach[key];
          } else if (key === 'fullname' || key === 'name') {
            obj[key] = `${coach.first_name || ''} ${coach.last_name || ''}`.trim();
          } else if (defaultValues.hasOwnProperty(key)) {
            obj[key] = defaultValues[key];
          } else {
            obj[key] = null;
          }
        }
        return obj;
      });
      const totalcoachinrange = mappedCoaches.length;
      // AJAX request
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        // Placeholder: Render partial view (replace with actual rendering if using a view engine)
        return res.json({
          data: '<div>Partial coach list view (to be implemented)</div>',
          coaches: mappedCoaches,
          totalcoachinrange
        });
      }
      // POST request (non-AJAX)
      if (req.method === 'POST') {
        return res.json({ coaches: mappedCoaches, totalcoachinrange });
      }
      // Otherwise, render full view (placeholder)
      return res.send('<div>Full coach list view (to be implemented)</div>');
    } catch (error) {
      console.error('Error searching coaches:', error);
      return res.status(500).json({ error: 'Failed to search coaches' });
    }
  }

  /**
   * GET /coaches/:username
   * Returns: full coach profile with all nested data
   */
  public async viewCoachByUsername(req: Request, res: Response) {
    try {
      const { username } = req.params;
      const coach = await User.findOne({
        where: { username },
        include: [
          {
            model: PersonalApplication,
            as: 'personalApplication',
            required: false
          },
          {
            model: Role,
            as: 'Roles',
            through: { attributes: [] }
          }
        ]
      });
      if (!coach) {
        return res.status(404).json({ error: 'Coach not found' });
      }
      const data = coach.toJSON();
      // Map to match the API structure
      const obj: any = { ...data };
      if (data.personalApplication) {
        obj.personal_application = { ...data.personalApplication };
      } else {
        obj.personal_application = null;
      }
      obj.roles = (data.Roles || []).map((role: any) => ({ ...role }));
      obj.coachreviews = [];
      return res.json(obj);
    } catch (error) {
      console.error('Error fetching coach by username:', error);
      return res.status(500).json({ error: 'Failed to fetch coach profile' });
    }
  }
} 
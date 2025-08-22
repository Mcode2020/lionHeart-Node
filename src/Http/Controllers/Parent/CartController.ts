import { Request, Response } from 'express';
import { Event } from '../../../Models/Event';
import { UserMembership } from '../../../Models/UserMembership';
import { Child } from '../../../Models/Child';
import { Roster } from '../../../Models/Roster';
import { Coupon } from '../../../Models/Coupon';
import { Op } from 'sequelize';
import session from 'express-session';

// Define session interface for cart data
interface CartSession extends session.Session {
  cart?: UserCart;
  autoenroll?: boolean;
}

// Extend Express Request type to include cart session
interface CartRequest extends Request {
  session: CartSession;
}

// Sibling discount percentage (20% like PHP)
const SIBLING_DISCOUNT_PERCENTAGE = 20;
// Platform fee per child (align with PHP config('lfk.platform_fees'))
const PLATFORM_FEE_PER_CHILD = Number(process.env.PLATFORM_FEE_PER_CHILD || '0');

type CartItem = {
  rowId: string;
  price: number;
  title?: string;
  childs?: number[];
  sibling_discount?: number;
  created_by?: number;
  membership_type?: string;
  membership_price?: number;
  donation_type?: string;
  type?: 'event' | 'donation';
  coupon?: { code: string; amount: number } | null;
  [key: string]: any;
};
type UserCart = { items: CartItem[]; meta: any };

// Get cart from session or initialize if not exists
function getCart(req: CartRequest): UserCart {
  if (!req.session.cart) {
    req.session.cart = { items: [], meta: {} };
  }
  return req.session.cart;
}

// Calculate sibling discount for cart items
async function calculateSiblingDiscount(cartItems: CartItem[], userId: number): Promise<number> {
  let totalDiscount = 0;
  
  for (const item of cartItems) {
    // Skip donations
    if (item.donation_type) {
      item.sibling_discount = 0;
      continue;
    }
    
    // Check if this is a membership class
    const isMembership = item.membership_type && item.type === 'event';
    let applyToOneChild = false;
    
    // For membership classes, check if user has already registered a child in a membership
    if (isMembership && item.id) {
      try {
        // Get the event ID
        const eventId = Number(item.id);
        
        // Find rosters for this event with payment_id (paid registrations)
        const rosters = await Roster.findAll({
          where: { 
            event_splms_event_id: eventId,
            payment_id: { [Op.ne]: 0 }
          },
          include: [{
            model: Child,
            as: 'Child',
            where: { user_id: userId },
            required: true
          }]
        });
        
        // If we found any paid registrations for this user's children
        if (rosters && rosters.length > 0) {
          applyToOneChild = true;
        }
      } catch (error) {
        console.error('Error checking for previous registrations:', error);
      }
    }
    
    if (applyToOneChild && item.childs && item.childs.length > 0) {
      // Apply discount to all children (including the first one)
      const discountPerChild = (SIBLING_DISCOUNT_PERCENTAGE / 100) * (item.price || 0);
      const itemDiscount = discountPerChild * item.childs.length;
      
      item.sibling_discount = itemDiscount;
      totalDiscount += itemDiscount;
    } else if (item.childs && item.childs.length > 1) {
      // Standard case: Apply discount only to additional children (siblings)
      const additionalChildren = item.childs.length - 1;
      const discountPerChild = (SIBLING_DISCOUNT_PERCENTAGE / 100) * (item.price || 0);
      const itemDiscount = discountPerChild * additionalChildren; 
      
      item.sibling_discount = itemDiscount;
      totalDiscount += itemDiscount;
    } else {
      item.sibling_discount = 0;
    }
  }
  
  return totalDiscount;
}

function calculateCouponDiscount(cartItems: CartItem[]): number {
  // Sum per-item coupon amounts; ensure we only count each coupon code once per item
  return cartItems.reduce((sum, item) => {
    if (item.coupon && typeof item.coupon.amount === 'number') {
      return sum + Number(item.coupon.amount || 0);
    }
    return sum;
  }, 0);
}

function calculatePlatformFees(cartItems: CartItem[]): number {
  const totalChildrenSelected = cartItems
    .filter((i) => i.type !== 'donation')
    .reduce((acc, item) => acc + (item.childs ? item.childs.length : 0), 0);
  return totalChildrenSelected * PLATFORM_FEE_PER_CHILD;
}

// Calculate cart meta with all discounts
async function calculateCartMeta(cartItems: CartItem[], userId: number): Promise<any> {
  const nonDonationItems = cartItems.filter((i) => i.type !== 'donation');
  const subtotal = nonDonationItems.reduce((sum: number, item: CartItem) => sum + (item.price || 0), 0);
  const donations = cartItems.filter((i) => i.type === 'donation').reduce((sum, i) => sum + (i.price || 0), 0);
  const sibling_discount = await calculateSiblingDiscount(nonDonationItems, userId);
  const discount = calculateCouponDiscount(nonDonationItems);
  const fee = calculatePlatformFees(nonDonationItems);

  const membership_price = nonDonationItems.reduce((sum, i) => sum + (i.membership_price || 0), 0);
  const membership_type = (nonDonationItems.find((i) => i.membership_type) || {}).membership_type || '';
  // Check if any item is prorated
  const prorated = nonDonationItems.some(item => item.prorated) ? 1 : 0;

  const total = subtotal - discount - sibling_discount + fee + donations;

  return {
    subtotal,
    discount,
    sibling_discount,
    total,
    fee,
    membership_price,
    membership_type,
    prorated,
    donations,
  };
}

async function getUserCoupon(userId: number) {
  try {
    const coupon = await Coupon.findOne({
      where: { individual: userId, is_active: true },
      order: [['id', 'DESC']],
    });
    return coupon ? coupon.toJSON() : null;
  } catch (e) {
    return null;
  }
}

function isCouponApplied(cartItems: CartItem[], code?: string): boolean {
  if (!code) return false;
  return cartItems.some((i) => i.coupon && i.coupon.code === code);
}

function enforceSingleCoach(cart: UserCart): { ok: boolean; error?: string } {
  const classItems = cart.items.filter((i) => i.type !== 'donation');
  if (classItems.length <= 1) return { ok: true };
  const firstCoach = classItems[0]?.created_by;
  const mismatched = classItems.find((i) => i.created_by !== firstCoach);
  if (mismatched) {
    return { ok: false, error: 'You are not permitted to checkout with multiple classes from different Coaches.' };
  }
  return { ok: true };
}

export class CartController {
  // GET /cart
  async index(req: CartRequest, res: Response) {
    const userId = (req as any).user_id;
    
    // Ensure user is authenticated
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const cart = getCart(req);
    if (cart.items.length === 0) {
      return res.json({ 
        message: 'Cart not found',
        meta: { subtotal: 0, discount: 0, sibling_discount: 0, total: 0, fee: 0, donations: 0 },
        items: []
      });
    }
    // Calculate meta with sibling discount
    cart.meta = await calculateCartMeta(cart.items, userId);
    return res.json({ meta: cart.meta, items: cart.items });
  }

  // GET /cart/membership
  async membershipCart(req: CartRequest, res: Response) {
    const userId = (req as any).user_id;
    
    // Ensure user is authenticated
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const cart = getCart(req);
    if (cart.items.length === 0) {
      return res.json({ 
        message: 'Cart not found',
        meta: { 
          subtotal: 0, 
          discount: 0, 
          sibling_discount: 0, 
          total: 0,
          fee: 0,
          membership_price: 0,
          membership_type: '',
          prorated: 0,
          donations: 0,
        },
        items: []
      });
    }
    // Calculate meta with sibling discount
    cart.meta = await calculateCartMeta(cart.items, userId);
    return res.json({ meta: cart.meta, items: cart.items });
  }

  // POST /cart/add
  async add(req: CartRequest, res: Response) {
    const userId = (req as any).user_id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const classId = req.body.class_id;
    const childIds = req.body.childs || [];
    if (!classId) {
      return res.status(400).json({ error: 'class_id is required' });
    }

    // Validate event exists
    const todayStr = new Date().toISOString().split('T')[0];
    const event = await Event.findOne({
      where: {
        splms_event_id: classId,
        enabled: 1,
        freezed: 0,
        [Op.and]: [
          {
            [Op.or]: [
              { event_end_date: { [Op.gte]: todayStr } },
              { membership_test: 1 },
            ],
          },
          {
            [Op.or]: [
              { halt_date: { [Op.gte]: new Date() } },
              { membership_test: 1 },
            ],
          },
        ],
      },
    });
    if (!event) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Membership flow parity: if class is a membership, guide client to membership flow
    if ((event as any).membership_test === 1) {
      const membershipType = (event as any).membership_type || '';
      const alias = (event as any).alias;
      const redirect = '/membership/' + alias;
      return res.status(200).json({
        success: false,
        membership: true,
        message: 'This class is a membership. Please proceed to membership options.',
        membership_type: membershipType,
        redirect,
      });
    }

    // Password-protected class handling
    if (event.password) {
      return res.status(400).json({ error: 'Password required for this class', redirect: `/password/confirm/list/${classId}` });
    }

    // Validate children belong to user
    let userChildren: any[] = [];
    if (childIds.length > 0) {
      userChildren = await Child.findAll({ where: { user_id: userId } });
      const userChildIds = userChildren.map(child => child.id);
      const invalidChildIds = childIds.filter((id: number) => !userChildIds.includes(id));
      if (invalidChildIds.length > 0) {
        return res.status(403).json({ error: `Invalid child IDs: ${invalidChildIds.join(', ')}` });
      }
      // Check for duplicate enrollments
      for (const childId of childIds) {
        const existing = await Roster.findOne({
          where: { children_id: childId, event_splms_event_id: classId, active: 1 }
        });
        if (existing) {
          const child = userChildren.find(c => c.id === childId);
          return res.status(400).json({ error: `${child ? child.first_name + ' ' + child.last_name : 'Child'} is already enrolled in this class` });
        }
      }
    }

    // Add to session cart
    const cart = getCart(req);
    const rowId = `${classId}-${Date.now()}`;
    const item: CartItem = {
      ...(event.toJSON() as any),
      type: 'event',
      rowId,
      childs: childIds,
      sibling_discount: 0,
      coupon: null,
    };

    // Apply user's individual coupon to this item if not already used in the cart
    const userCoupon = await getUserCoupon(Number(userId));
    if (userCoupon && !isCouponApplied(cart.items as CartItem[], userCoupon.code)) {
      item.coupon = { code: userCoupon.code, amount: Number(userCoupon.amount || 0) };
    }

    cart.items.push(item);

    // Enforce single-coach constraint
    const coachCheck = enforceSingleCoach(cart);
    if (!coachCheck.ok) {
      // Remove the just-added item
      cart.items = cart.items.filter((i) => i.rowId !== rowId);
      return res.status(400).json({ error: coachCheck.error });
    }

    cart.meta = await calculateCartMeta(cart.items as CartItem[], userId);
    return res.json({ success: true, cart });
  }

  // POST /cart/remove
  async remove(req: CartRequest, res: Response) {
    const userId = (req as any).user_id;
    
    // Ensure user is authenticated
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const cart = getCart(req);
    const rowId = req.body.item_id;
    cart.items = cart.items.filter((item: any) => item.rowId !== rowId);
    
    // Recalculate cart meta after removal
    cart.meta = await calculateCartMeta(cart.items as CartItem[], userId);

    // If cart count < 2, disable autoenroll like PHP
    if (cart.items.filter((i: CartItem) => i.type !== 'donation').length < 2) {
      req.session.autoenroll = false;
    }
    
    return res.json({ success: true, cart });
  }

  // POST /cart/update
  async update(req: CartRequest, res: Response) {
    const userId = (req as any).user_id;
    
    // Ensure user is authenticated
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const cart = getCart(req);
    const { cartitem, childs } = req.body;
    
    if (!cartitem) {
      return res.status(400).json({ error: 'Cart item ID is required' });
    }
    
    // Find the cart item
    const cartItem = cart.items.find((item: any) => item.rowId === cartitem) as CartItem | undefined;
    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    
    // Update children if provided - ONLY allow logged-in user's children
    if (childs && Array.isArray(childs)) {
      // Get all children that belong to the authenticated user
      const userChildren = await Child.findAll({
        where: { 
          user_id: parseInt(userId)
        }
      });
      
      // Get the IDs of user's children
      const userChildIds = userChildren.map(child => child.id);
      
      // Check if all provided child IDs belong to the authenticated user
      const invalidChildIds = childs.filter((id: number) => !userChildIds.includes(id));
      
      if (invalidChildIds.length > 0) {
        return res.status(403).json({ 
          error: `You can only assign your own children to the cart. Invalid child IDs: ${invalidChildIds.join(', ')}` 
        });
      }
      
      // Get the actual child objects for validation
      const children = userChildren.filter(child => childs.includes(child.id));
      
      // Check for existing enrollments
      for (const child of children) {
        const existingEnrollment = await Roster.findOne({
          where: {
            children_id: child.id,
            event_splms_event_id: cartItem.splms_event_id,
            active: 1
          }
        });
        
        if (existingEnrollment) {
          return res.status(400).json({ 
            error: `${child.first_name} ${child.last_name} is already enrolled in this class` 
          });
        }
      }
      
      // Update cart item with new children
      cartItem.childs = childs;
    }
    
    // Recalculate cart meta with updated sibling discount
    cart.meta = await calculateCartMeta(cart.items as CartItem[], userId);
    
    return res.json({ success: true, cart });
  }

  // GET /cart/reroute
  async reroute(req: Request, res: Response) {
    return res.redirect('/class/search');
  }

  // POST /cart/autoenroll
  async autoenroll(req: CartRequest, res: Response) {
    const autoenroll = req.body.autoenroll === 'yes';
    req.session.autoenroll = autoenroll;
    
    // Return JSON for API clients instead of redirecting
    const redirect = req.body.redirecttocheckout === '1' ? '/checkout/view' : null;
    return res.status(200).json({ success: true, autoenroll, redirect });
  }

  // GET /password/confirm/list/:classid
  async viewconfirmPassword(req: Request, res: Response) {
    const classId = req.params.classid;
    const event = await Event.findByPk(classId);
    if (!event) {
      return res.status(404).json({ error: 'Class could not be found' });
    }
    return res.json({ class: event });
  }

  // POST /password/confirm/:classid
  async confirmPassword(req: CartRequest, res: Response) {
    const classId = req.params.classid;
    const password = req.body.password;
    const event = await Event.findByPk(classId);
    
    if (!event) {
      return res.status(404).json({ error: 'Class could not be found' });
    }
    
    if (event.password !== password) {
      return res.status(400).json({ error: 'Incorrect Password' });
    }
    
    try {
      // Add class to cart without childs, like PHP addClass
      const userId = (req as any).user_id;
      const cart = getCart(req);
      const rowId = `${event.splms_event_id}-${Date.now()}`;
      const item: CartItem = {
        ...(event.toJSON() as any),
        type: 'event',
        rowId,
        childs: [],
        sibling_discount: 0,
        coupon: null,
      };
      // Apply user's individual coupon to this item if not already used in the cart
      if (userId) {
        const userCoupon = await getUserCoupon(Number(userId));
        if (userCoupon && !isCouponApplied(cart.items as CartItem[], userCoupon.code)) {
          item.coupon = { code: userCoupon.code, amount: Number(userCoupon.amount || 0) };
        }
      }
      cart.items.push(item);

      // Enforce single-coach constraint
      const coachCheck = enforceSingleCoach(cart);
      if (!coachCheck.ok) {
        cart.items = cart.items.filter((i) => i.rowId !== rowId);
        cart.meta = await calculateCartMeta(cart.items as CartItem[], userId);
        return res.status(400).json({ error: coachCheck.error });
      }

      // If autoenroll session flag is set, mark items
      if (req.session.autoenroll === true) {
        cart.items = (cart.items as CartItem[]).map((i) => (i.rowId === rowId ? { ...i, autoenroll: true } : i));
      }
      cart.meta = await calculateCartMeta(cart.items as CartItem[], userId);
      return res.json({ success: true, cart });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  // POST /cart/add-donation
  async addDonation(req: CartRequest, res: Response) {
    const { donation_amount, donation_type } = req.body;
  
    if (!donation_amount || !donation_type) {
      return res.status(400).json({ error: 'Enter valid donation amount and type' });
    }
    
    try {
      const cart = getCart(req);
      const donationItem: CartItem = {
        rowId: `donation-${Date.now()}`,
        price: Number(donation_amount),
        donation_type,
        type: 'donation',
      } as any;
      cart.items.push(donationItem);
      cart.meta = await calculateCartMeta(cart.items as CartItem[], (req as any).user_id);
      return res.json({ success: true, cart });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  // POST /cart/update-donation
  async UpdateDonation(req: CartRequest, res: Response) {
    const { donation_amount, donation_type, cartitem } = req.body;
    
    if (!donation_amount || !donation_type || !cartitem) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
      const cart = getCart(req);
      const item = cart.items.find((i) => i.rowId === cartitem) as CartItem | undefined;
      if (!item || item.type !== 'donation') {
        return res.status(404).json({ error: 'Donation cart item not found' });
      }
      item.price = Number(donation_amount);
      item.donation_type = donation_type;
      cart.meta = await calculateCartMeta(cart.items as CartItem[], (req as any).user_id);
      return res.json({ success: true, cart });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  // GET /cart/add-test-data (for testing purposes)
  async addTestData(req: CartRequest, res: Response) {
    const cart = getCart(req);
    
    // Add some test items to cart with children
    const testItems = [
      {
        splms_event_id: 1,
        title: 'Test Class 1',
        price: 25.00,
        rowId: '1-test-1',
        childs: [1, 2], // Test with 2 children for sibling discount
        sibling_discount: 5.00
      },
      {
        splms_event_id: 2,
        title: 'Test Class 2',
        price: 30.00,
        rowId: '2-test-2',
        childs: [1], // Test with 1 child (no sibling discount)
        sibling_discount: 0
      }
    ];
    
    cart.items = testItems;
    
    // Calculate meta with sibling discount
    cart.meta = await calculateCartMeta(cart.items, (req as any).user_id);
    
    return res.json({ 
      message: 'Test data added to cart',
      meta: cart.meta, 
      items: cart.items 
    });
  }

  // GET /cart/children - Get user's children for dropdown
  async getChildren(req: Request, res: Response) {
    const userId = (req as any).user_id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      const children = await Child.findAll({
        where: { user_id: parseInt(userId) },
        attributes: ['id', 'first_name', 'last_name', 'birthday', 'gender']
      });
      
      return res.json({ children });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch children' });
    }
  }
}


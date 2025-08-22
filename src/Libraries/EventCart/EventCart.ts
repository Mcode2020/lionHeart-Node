import { Event } from '../../Models/Event';
import { Coupon } from '../../Models/Coupon';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

type CartRow = {
  rowId: string;
  id?: string;
  name?: string;
  qty: number;
  price: number; // current price per unit
  priceTax: number; // price + per-row transaction fee component if any
  total: number; // qty * priceTax
  options: Record<string, any>;
};

type UserCartState = {
  items: CartRow[];
};

type Membership = {
  // These keys correspond to the subscription types
  monthly?: number;
  six_months?: number;
  twelve_months?: number;
  exclusive?: number;
  virtual?: number;
  [key: string]: number | undefined; // Index signature
};

/**
 * EventCart: simplified TS port of PHP EventCart core behaviors.
 * - In-memory per-user store. Swap with session/DB for persistence.
 */
export class EventCart {
  private static userCarts: Record<string, UserCartState> = {};

  // Option keys aligned with PHP
  public static KEY_CHILD = 'childs';
  public static KEY_CLASS = 'class';
  public static KEY_COUPON = 'coupon';
  public static KEY_ORIG_PRICE = 'price_orig';
  public static KEY_ORIG_PRICE_TAXED = 'pricetax_orig';
  public static KEY_TRANS_FEE = 'transaction_fee';
  public static KEY_SIB_DIS = 'sibling_discount';
  public static KEY_LOVE_DON = 'love_donation';
  public static KEY_MEMBERSHIP = 'membership';
  public static KEY_MEM_PRICE = 'membership_price';
  public static KEY_MEMBERSHIP_TYPE = 'membership_type';
  public static KEY_PRORATED = 'prorated';
  public static KEY_DON_TYPE = 'donation_type';

  private static SIBLING_DISCOUNT_PERCENTAGE = 20;
  private static PLATFORM_FEE_PER_CHILD = Number(process.env.PLATFORM_FEE_PER_CHILD || '0');

  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    if (!EventCart.userCarts[userId]) {
      EventCart.userCarts[userId] = { items: [] };
    }
  }

  private get state(): UserCartState {
    return EventCart.userCarts[this.userId];
  }

  content(): CartRow[] {
    return this.state.items;
  }

  count(): number {
    return this.state.items.length;
  }

  get(rowId: string): CartRow | undefined {
    return this.state.items.find((r) => r.rowId === rowId);
  }

  /** Add event class as a cart row */
  addClass(event: Event): CartRow {
    const rowId = `${event.splms_event_id}-${Date.now()}`;
    const price = Number((event as any).price || 0);
    const row: CartRow = {
      rowId,
      id: String(event.splms_event_id),
      name: (event as any).title,
      qty: 1,
      price,
      priceTax: price,
      total: price,
      options: {
        [EventCart.KEY_CLASS]: event,
        created_at: new Date().toISOString(),
      },
    };
    this.state.items.push(row);
    this.recalc();
    return row;
  }

  /**
   * Adds a membership class to the cart, calculating prorated pricing.
   * This is a complex method ported from the PHP original.
   * NOTE: This implementation makes assumptions about the structure of the Event and Membership objects.
   */
  addMembershipClass(event: Event, membership: Membership, subscription: keyof Membership): CartRow {
    if (this.hasClass(event)) {
      throw new Error('This class already exist in cart');
    }

    const eventData = event as any;
    const fullMembershipPrice = membership[subscription];
    if (fullMembershipPrice == null) {
      throw new Error(`Invalid subscription type: ${subscription}`);
    }

    let pay_of_month = fullMembershipPrice;
    let prorated = false;
    const current_date = dayjs();
    const class_start = dayjs(eventData.class_start);
    const class_end = dayjs(eventData.class_end);

    if (class_end.isAfter(current_date)) {
      const classWeekday = class_start.day();
      const startOfMonth = class_start.startOf('month');
      const endOfMonth = class_start.endOf('month');

      let total_class_day_of_month = 0;
      for (let day = startOfMonth; day.isSameOrBefore(endOfMonth); day = day.add(1, 'day')) {
        if (day.day() === classWeekday) {
          total_class_day_of_month++;
        }
      }

      let remaining_classes = 0;
      for (let currentSession = class_start; currentSession.isSameOrBefore(class_end); currentSession = currentSession.add(1, 'week')) {
        if (currentSession.isSameOrAfter(current_date)) {
          remaining_classes++;
        }
      }

      prorated = total_class_day_of_month !== remaining_classes;

      if (prorated && total_class_day_of_month > 0) {
        pay_of_month = Math.round((fullMembershipPrice / total_class_day_of_month) * remaining_classes * 100) / 100;
      } else {
        pay_of_month = fullMembershipPrice;
      }

      if (pay_of_month <= 0 && prorated) {
        throw new Error('Class has no remaining sessions in the prorated period.');
      }
    }

    const price = pay_of_month;
    const rowId = `${event.splms_event_id}-${Date.now()}`;
    const row: CartRow = {
      rowId, id: String(event.splms_event_id), name: eventData.title, qty: 1, price, priceTax: price, total: price,
      options: {
        [EventCart.KEY_CLASS]: event, [EventCart.KEY_MEM_PRICE]: fullMembershipPrice, [EventCart.KEY_MEMBERSHIP_TYPE]: subscription, [EventCart.KEY_PRORATED]: prorated, created_at: new Date().toISOString(),
      },
    };

    this.state.items.push(row);
    this.recalc();
    return row;
  }

  /** Update selected children and recompute transaction fees and qty */
  updateChilds(rowId: string, childs: number[]): CartRow | undefined {
    const row = this.get(rowId);
    if (!row) return undefined;
    const options = row.options;
    options[EventCart.KEY_CHILD] = childs;
    // Fee per child
    const fee = (childs?.length || 0) * EventCart.PLATFORM_FEE_PER_CHILD;
    options[EventCart.KEY_TRANS_FEE] = fee;
    // qty rule: 1 if 0-1 child, else number of children
    const qty = !childs || childs.length <= 1 ? 1 : childs.length;
    row.qty = qty;
    // Recalc per-row totals
    row.priceTax = row.price; // base per-unit price, fee is handled via meta but we keep fee also on row options
    row.total = row.qty * row.priceTax;
    this.recalc();
    return row;
  }

  /**
   * Removes a coupon from a row, reverting to original price if stored.
   * Note: This does not handle DB interactions like the PHP version (e.g., detaching user coupons).
   * That logic should be handled by the calling service.
   */
  removeCoupon(rowId: string): CartRow | undefined {
    const row = this.get(rowId);
    if (!row || !row.options[EventCart.KEY_COUPON]) {
      return row;
    }

    // Revert to original price if it exists
    if (row.options[EventCart.KEY_ORIG_PRICE] != null) {
      row.price = row.options[EventCart.KEY_ORIG_PRICE];
      row.priceTax = row.options[EventCart.KEY_ORIG_PRICE_TAXED] ?? row.price;
    }

    // Clean up coupon-related keys from options
    delete row.options[EventCart.KEY_COUPON];
    delete row.options[EventCart.KEY_ORIG_PRICE];
    delete row.options[EventCart.KEY_ORIG_PRICE_TAXED];

    this.recalc();
    return row;
  }

  remove(rowId: string): void {
    // First, revert any coupon logic, then remove the item.
    this.removeCoupon(rowId);
    this.state.items = this.state.items.filter((r) => r.rowId !== rowId);
    this.recalc();
  }

  /**
   * Apply coupon to a row; supports type 'percentage' or 'fixed' via coupon.type.
   * Adjusts row price/priceTax down and stores original prices in options.
   */
  addCoupon(rowId: string, coupon: any) {
    const row = this.get(rowId);
    if (!row || !coupon) return;
    const options = row.options;
    options[EventCart.KEY_COUPON] = coupon;

    if (options[EventCart.KEY_ORIG_PRICE] == null) {
      options[EventCart.KEY_ORIG_PRICE] = row.price;
    }
    if (options[EventCart.KEY_ORIG_PRICE_TAXED] == null) {
      options[EventCart.KEY_ORIG_PRICE_TAXED] = row.priceTax;
    }

    let newPrice = row.price;
    let newPriceTax = row.priceTax;
    const amount = Number(coupon.amount || 0);
    const ctype = String(coupon.type || 'fixed').toLowerCase();
    if (ctype === 'percentage') {
      newPrice -= (amount / 100) * newPrice;
      newPriceTax -= (amount / 100) * row.priceTax;
    } else {
      newPrice -= amount;
      newPriceTax -= amount;
    }
    if (newPrice < 0) newPrice = 0;
    if (newPriceTax < 0) newPriceTax = 0;
    row.price = newPrice;
    row.priceTax = newPriceTax;
    row.total = row.qty * row.priceTax;
    this.recalc();
  }

  hasClass(event: Event): boolean {
    return this.getClasses().some(c => c.splms_event_id === event.splms_event_id);
  }

  hasAnyClass(): boolean {
    return this.getClasses().length > 0;
  }

  /** Classes helpers */
  getClasses(): Event[] {
    return this.state.items
      .map((r) => r.options?.[EventCart.KEY_CLASS])
      .filter((c) => !!c);
  }

  getClass(rowId: string): Event | null {
    const row = this.get(rowId);
    return row?.options?.[EventCart.KEY_CLASS] || null;
  }

  getCoupons(): any[] {
    return this.state.items
      .map((r) => r.options?.[EventCart.KEY_COUPON])
      .filter((c) => !!c);
  }

  getChildren(rowId: string): number[] {
    const row = this.get(rowId);
    const childs = row?.options?.[EventCart.KEY_CHILD];
    return Array.isArray(childs) ? childs.filter(Boolean) : [];
  }

  getChilds(): number[] {
    const all: number[] = [];
    for (const row of this.state.items) {
      const c = this.getChildren(row.rowId);
      all.push(...c);
    }
    return all;
  }

  /** Donations */
  addDonation(amount: number, donationType: string): CartRow {
    const row: CartRow = {
      rowId: `donation-${Date.now()}`,
      id: 'LFK_LOVE_DONATION',
      name: 'LFK Love Donation',
      qty: 1,
      price: Number(amount),
      priceTax: Number(amount),
      total: Number(amount),
      options: { [EventCart.KEY_DON_TYPE]: donationType },
    };
    this.state.items.push(row);
    this.recalc();
    return row;
  }

  updateLoveDonation(rowId: string, amount: number, donationType: string) {
    const row = this.get(rowId);
    if (!row) return;
    row.price = Number(amount);
    row.priceTax = Number(amount);
    row.total = row.qty * row.priceTax;
    row.options[EventCart.KEY_DON_TYPE] = donationType;
    this.recalc();
  }
  
  /**
   * Sets an auto-enroll flag on all class items in the cart.
   */
  autoEnroll(enroll: boolean): void {
    for (const row of this.state.items) {
      if (row.options[EventCart.KEY_CLASS]) {
        row.options['autoenroll'] = enroll;
      }
    }
  }

  /**
   * Finds and returns the love donation row from the cart, if it exists.
   */
  getLoveDonation(): CartRow | undefined {
    return this.state.items.find(item => item.options[EventCart.KEY_DON_TYPE]);
  }

  /**
   * Gets the full (non-prorated) membership price for all membership items in the cart.
   */
  getMembershipPrice(): number {
    return this.state.items.reduce((sum, row) => {
      if (row.options[EventCart.KEY_MEM_PRICE] != null) {
        return sum + Number(row.options[EventCart.KEY_MEM_PRICE]);
      }
      return sum;
    }, 0);
  }

  /**
   * Gets the membership type from the first membership item found in the cart.
   */
  getMembershipType(): string {
    const row = this.state.items.find(r => r.options[EventCart.KEY_MEMBERSHIP_TYPE]);
    return row?.options[EventCart.KEY_MEMBERSHIP_TYPE] || '';
  }

  /**
   * Checks if the first membership item found in the cart is prorated.
   */
  getProrated(): boolean {
    const row = this.state.items.find(r => r.options[EventCart.KEY_PRORATED] != null);
    return !!row?.options[EventCart.KEY_PRORATED];
  }

  /**
   * Gets membership details for a specific cart row.
   */
  getMembership(rowId: string): { membership_price: number; membership_type: string } | null {
    const row = this.get(rowId);
    if (row && row.options[EventCart.KEY_MEM_PRICE] != null) {
      return {
        membership_price: Number(row.options[EventCart.KEY_MEM_PRICE]),
        membership_type: String(row.options[EventCart.KEY_MEMBERSHIP_TYPE] || ''),
      };
    }
    return null;
  }

  /**
   * Formats cart data into an array of classes with their assigned children and membership info.
   * Useful for display or processing before checkout.
   */
  getClassesChilds(): { child_ids: number[]; class: Event | null; membership: { membership_price: number; membership_type: string } | null }[] {
    return this.state.items
      .filter(row => row.options[EventCart.KEY_CLASS])
      .map(row => ({
        child_ids: this.getChildren(row.rowId),
        class: this.getClass(row.rowId),
        membership: this.getMembership(row.rowId),
      }));
  }

  /**
   * Formats cart data into an array suitable for creating roster records in the database.
   */
  getChildClassArray(): { event_splms_event_id: number; children_id: number; active: number; updated_at: string }[] {
    const arr: { event_splms_event_id: number; children_id: number; active: number; updated_at: string }[] = [];
    for (const item of this.content()) {
      const event = this.getClass(item.rowId);
      if (!event) continue;

      for (const childId of this.getChildren(item.rowId)) {
        arr.push({ event_splms_event_id: event.splms_event_id, children_id: childId, active: 1, updated_at: new Date().toISOString() });
      }
    }
    return arr;
  }

  /**
   * Gets the total discount amount for a specific row from a coupon.
   */
  getDiscount(rowId: string): number {
    const row = this.get(rowId);
    if (!row) return 0;

    const options = row.options;
    const originalPrice = options[EventCart.KEY_ORIG_PRICE];

    if (options[EventCart.KEY_COUPON] && originalPrice != null) {
      return originalPrice - row.price;
    }

    return 0;
  }

  /**
   * Validates that every class item in the cart has at least one child selected.
   * Throws an error if validation fails, mirroring the PHP version's exception.
   */
  validateClassesHaveChild(): boolean {
    const errors: string[] = [];
    for (const row of this.state.items) {
      if (row.options[EventCart.KEY_DON_TYPE]) {
        continue;
      }

      if (!row.options[EventCart.KEY_CLASS]) {
        errors.push("Sorry, your cart doesn't seems to have a class into it or it is invalid");
        continue;
      }

      const children = this.getChildren(row.rowId);
      if (!children || children.length === 0) {
        const className = row.name || 'Unnamed Class';
        errors.push(`You have not selected a child to be Registered for ${className}. Please Select a Child from the dropdown to Continue.`);
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }

    return true;
  }

  /**
   * Sums original prices when available; else current price
   */
  subtotal(): number {
    return this.state.items.reduce((sum, r) => {
      const base = r.options?.[EventCart.KEY_ORIG_PRICE] ?? r.price;
      return sum + base * r.qty;
    }, 0);
  }

  private calcSiblingDiscount(): number {
    // 20% discount on additional children for each class row with children selected
    let discount = 0;
    for (const row of this.state.items) {
      if (row.options?.[EventCart.KEY_DON_TYPE]) continue; // skip donations
      const cls: Event | undefined = row.options?.[EventCart.KEY_CLASS];
      const pricePerUnit = row.options?.[EventCart.KEY_ORIG_PRICE] ?? row.price;
      const childs: number[] = this.getChildren(row.rowId);
      if (cls && childs && childs.length > 1) {
        const additional = childs.length - 1;
        const dis = ((EventCart.SIBLING_DISCOUNT_PERCENTAGE * additional) / 100) * pricePerUnit;
        row.options[EventCart.KEY_SIB_DIS] = dis;
        discount += dis;
      } else {
        row.options[EventCart.KEY_SIB_DIS] = 0;
      }
    }
    return discount;
  }

  sibling_discount(): number {
    return this.calcSiblingDiscount();
  }

  getTransactionFees(): number {
    return this.state.items.reduce((sum, r) => sum + Number(r.options?.[EventCart.KEY_TRANS_FEE] || 0), 0);
  }

  totalDiscount(): number {
    const couponSavings = this.state.items.reduce((sum, r) => {
      const orig = r.options?.[EventCart.KEY_ORIG_PRICE];
      if (orig != null) {
        return sum + (orig * r.qty - r.total);
      }
      return sum;
    }, 0);
    return couponSavings - this.calcSiblingDiscount();
  }

  total(): number {
    const itemsTotal = this.state.items.reduce((sum, r) => sum + r.total, 0);
    const fees = this.getTransactionFees();
    const sib = this.calcSiblingDiscount();
    const total = itemsTotal + fees - sib;
    return total > 0 ? total : fees;
  }

  /** Util to recompute totals on each change */
  private recalc() {
    for (const row of this.state.items) {
      row.total = row.qty * row.priceTax;
    }
  }
}

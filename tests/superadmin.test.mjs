// Checkout rules driven by the Super Admin: panel prices, variants, add-ons,
// city delivery, service areas, tax, packaging, full-terms coupons and
// restaurant state. Uses fixture data, no Firebase. Run: npm test
const base = new URL('../api/', import.meta.url).href;
const { priceOrder } = await import(base + '_pricing.js');
const { closedReason, withinWindow, matchArea } = await import(base + '_live.js');
const { haversineKm } = await import(base + '_pricing.js');

let fail = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) fail++; };
const rejects = async (fn, code) => { try { await fn(); return false; } catch (e) { return e.code === code; } };

const afternoon = new Date('2026-09-27T10:30:00Z'); // 16:00 IST, a Sunday
const home = { lat: 14.9651, lng: 74.7105, address: 'Main Road, Yellapur 581359' };

/** A fixture source; override any part per test. */
const fixture = (over = {}) => ({
  menuItems: async (ids) => Object.fromEntries(ids.filter((id) => (over.items || {})[id]).map((id) => [id, over.items[id]])),
  hotels: async (ids) => Object.fromEntries(ids.filter((id) => (over.hotels || {})[id]).map((id) => [id, over.hotels[id]])),
  cities: async (ids) => Object.fromEntries(ids.filter((id) => (over.cities || {})[id]).map((id) => [id, over.cities[id]])),
  areas: async () => over.areas || [],
  business: async () => over.business || {},
  coupon: async (code) => (over.coupons || {})[code] || null,
  customerHistory: async () => over.history || { priorOrders: 0, redemptions: 0 },
  settings: async () => over.settings || {},
});

// 1. A catalogue dish keeps today's price until it is priced in the panel.
const papadKey = 'moms-magic__masala-papad';
let r = await priceOrder({ items: [{ id: 'ff-1', name: 'Masala Papad', price: 69, quantity: 1 }], location: home, now: afternoon,
  source: fixture({ items: { [papadKey]: { name: 'Masala Papad', price: 49, available: true } } }) });
check('unpriced panel dish keeps the catalogue price', r.lines[0].price === 69, `(got ${r.lines[0].price})`);
r = await priceOrder({ items: [{ id: 'ff-1', name: 'Masala Papad', price: 69, quantity: 1 }], location: home, now: afternoon,
  source: fixture({ items: { [papadKey]: { name: 'Masala Papad', price: 79, priceUpdatedAt: '2026-11-01', available: true } } }) });
check('panel-priced dish uses the panel price', r.lines[0].price === 79, `(got ${r.lines[0].price})`);
r = await priceOrder({ items: [{ id: 'ff-1', name: 'Masala Papad', price: 69, quantity: 1 }], location: home, now: afternoon,
  source: fixture({ items: { [papadKey]: { name: 'Masala Papad', price: 79, salePrice: 59, priceUpdatedAt: 'x', available: true } } }) });
check('sale price wins when below price', r.lines[0].price === 59);

// 2. A dish that exists only in the panel, with a variant and add-ons.
const biryani = { hotelId: 'sirsi-diner', name: 'Chicken Biryani', price: 220, priceUpdatedAt: 'x', available: true, category: 'Biryani',
  variants: [{ name: 'Half', price: 150 }, { name: 'Full', price: 220 }], addOns: [{ name: 'Raita', price: 20 }] };
const diner = { name: 'Sirsi Diner', cityId: 'sirsi', status: 'ACTIVE', acceptingOrders: true, lat: 14.62, lng: 74.84 };
const sirsi = { name: 'Sirsi', active: true, paymentMethods: ['online'], delivery: { baseFee: 30, freeKm: 3, perKm: 8, maxKm: 6, codMaxKm: 3, minOrder: 100 } };
const near = { lat: 14.63, lng: 74.85, address: 'MG Road, Sirsi 581401' };
const src = (over = {}) => fixture({ items: { 'sirsi-diner__chicken-biryani': biryani }, hotels: { 'sirsi-diner': diner }, cities: { sirsi }, ...over });
r = await priceOrder({ items: [{ id: 'sirsi-diner__chicken-biryani', name: 'x', price: 1, quantity: 2, variant: 'Half', addOns: ['Raita'] }], location: near, now: afternoon, source: src() });
check('panel-only dish priced from its variant + add-on', r.lines[0].price === 170, `(got ${r.lines[0].price})`);
check('panel-only dish named and placed by the panel', r.lines[0].name === 'Chicken Biryani' && r.groups[0].hotelId === 'sirsi-diner' && r.groups[0].hotelName === 'Sirsi Diner');
check('order group carries the restaurant city', r.groups[0].cityId === 'sirsi');
check('unknown variant refused', await rejects(() => priceOrder({ items: [{ id: 'sirsi-diner__chicken-biryani', name: 'x', price: 1, quantity: 1, variant: 'Jumbo' }], location: near, now: afternoon, source: src() }), 'INVALID_ITEM'));
check('unknown add-on refused', await rejects(() => priceOrder({ items: [{ id: 'sirsi-diner__chicken-biryani', name: 'x', price: 1, quantity: 1, addOns: ['Gold leaf'] }], location: near, now: afternoon, source: src() }), 'INVALID_ITEM'));
check('panel id that does not exist refused', await rejects(() => priceOrder({ items: [{ id: 'sirsi-diner__ghost', name: 'x', price: 1, quantity: 1 }], location: near, now: afternoon, source: src() }), 'INVALID_ITEM'));

// 3. Availability comes back for place-order to refuse.
r = await priceOrder({ items: [{ id: 'sirsi-diner__chicken-biryani', name: 'x', price: 1, quantity: 1 }], location: near, now: afternoon,
  source: src({ items: { 'sirsi-diner__chicken-biryani': { ...biryani, soldOut: true } } }) });
check('sold-out panel dish reported unavailable', r.unavailable.includes('Chicken Biryani'));

// 4. City delivery, limits and payment methods.
r = await priceOrder({ items: [{ id: 'sirsi-diner__chicken-biryani', name: 'x', price: 1, quantity: 1 }], location: near, now: afternoon, source: src() });
const km = Math.ceil(r.distanceKm);
check('delivery uses the city formula from the restaurant', r.deliveryCharge === 30 + Math.max(0, km - 3) * 8, `(km ${r.distanceKm}, got ${r.deliveryCharge})`);
check('city limits returned', r.maxKm === 6 && r.codMaxKm === 3 && r.minOrder === 100);
check('COD not offered when the city does not allow it', r.codOffered === false);

// 5. Service areas.
const area = { id: 'a1', cityId: 'sirsi', type: 'pincode', pincodes: ['581401'], active: true, surcharge: 15 };
r = await priceOrder({ items: [{ id: 'sirsi-diner__chicken-biryani', name: 'x', price: 1, quantity: 1 }], location: near, now: afternoon,
  source: src({ hotels: { 'sirsi-diner': { ...diner, serviceAreaIds: ['a1'] } }, areas: [area] }) });
check('address in a served area: inside, with surcharge', !r.outsideArea && r.areaId === 'a1' && r.deliveryCharge === 30 + Math.max(0, Math.ceil(r.distanceKm) - 3) * 8 + 15);
r = await priceOrder({ items: [{ id: 'sirsi-diner__chicken-biryani', name: 'x', price: 1, quantity: 1 }], location: { ...near, address: 'Elsewhere 581999' }, now: afternoon,
  source: src({ hotels: { 'sirsi-diner': { ...diner, serviceAreaIds: ['a1'] } }, areas: [area] }) });
check('address outside the served areas flagged', r.outsideArea === true);
check('radius area matches by distance', !!matchArea([{ id: 'r', type: 'radius', center: { lat: 14.62, lng: 74.84 }, radiusKm: 3, active: true }], near, '', haversineKm));

// 6. Tax and packaging from business settings.
r = await priceOrder({ items: [{ id: 'sirsi-diner__chicken-biryani', name: 'x', price: 1, quantity: 1 }], location: near, now: afternoon,
  source: src({ business: { taxMode: 'exclusive', defaultTaxRate: 5, defaultPackagingFee: 12 } }) });
check('exclusive tax added', r.taxAmount === 11, `(got ${r.taxAmount})`);
check('default packaging fee applied', r.packagingFee === 12);
check('total includes tax and packaging', r.grandTotal === r.subtotal + r.deliveryCharge + 12 + 11);
r = await priceOrder({ items: [{ id: 'sirsi-diner__chicken-biryani', name: 'x', price: 1, quantity: 1 }], location: near, now: afternoon, source: src() });
check('no business settings: tax included, no packaging', r.taxAmount === 0 && r.packagingFee === 0);

// 7. Coupons with full terms.
const coupon = (over = {}) => ({ code: 'SIRSI20', type: 'percent_discount', value: 50, maxDiscount: 60, minOrderValue: 100, isActive: true, usedCount: 0, ...over });
const withCoupon = async (c, over = {}) => priceOrder({ items: [{ id: 'sirsi-diner__chicken-biryani', name: 'x', price: 1, quantity: 1 }], couponCode: 'SIRSI20', location: near, now: afternoon, customer: { phone: '9876543210' },
  source: src({ coupons: { SIRSI20: c }, ...over }) });
r = await withCoupon(coupon());
check('percent coupon capped at its maximum', r.couponDiscount === 60 && r.couponFullTerms === true, `(got ${r.couponDiscount})`);
r = await withCoupon(coupon({ endAt: '2026-09-01T00:00:00Z' }));
check('expired coupon refused', r.couponDiscount === 0 && r.flags.some((f) => f.includes('expired')));
r = await withCoupon(coupon({ startAt: '2026-12-01T00:00:00Z' }));
check('not-yet-started coupon refused', r.couponDiscount === 0);
r = await withCoupon(coupon({ cityIds: ['yellapur'] }));
check('coupon for another city refused', r.couponDiscount === 0 && r.flags.some((f) => f.includes('city')));
r = await withCoupon(coupon({ hotelIds: ['mumtaz'] }));
check('coupon for another restaurant refused', r.couponDiscount === 0);
r = await withCoupon(coupon({ usageLimit: 5, usedCount: 5 }));
check('used-up coupon refused', r.couponDiscount === 0 && r.flags.some((f) => f.includes('fully used')));
r = await withCoupon(coupon({ newCustomersOnly: true }), { history: { priorOrders: 2, redemptions: 0 } });
check('first-order coupon refused for a returning customer', r.couponDiscount === 0);
r = await withCoupon(coupon({ perCustomerLimit: 1 }), { history: { priorOrders: 0, redemptions: 1 } });
check('per-customer limit enforced', r.couponDiscount === 0);
r = await withCoupon(coupon({ type: 'fixed_discount', value: 5000, minOrderValue: 0 }));
check('discount never exceeds the food, total never negative', r.couponDiscount <= r.subtotal && r.grandTotal >= 0);
r = await withCoupon(coupon({ isActive: false }));
check('switched-off coupon refused', r.couponDiscount === 0 && !r.couponFullTerms);
const legacy = await priceOrder({ items: [{ id: 'ff-1', name: 'Masala Papad', price: 69, quantity: 2 }], couponCode: 'OLD10', location: home, now: afternoon,
  source: fixture({ settings: { coupons: [{ code: 'OLD10', type: 'fixed_discount', value: 10, minOrderValue: 0, isActive: true }] } }) });
check('legacy settings coupon still works', legacy.couponDiscount === 10 && !legacy.couponFullTerms);

// 8. Groups always add up to what is charged.
r = await priceOrder({ items: [{ id: 'sirsi-diner__chicken-biryani', name: 'x', price: 1, quantity: 3 }, { id: 'ff-1', name: 'Masala Papad', price: 69, quantity: 1 }],
  couponCode: 'SIRSI20', location: near, now: afternoon, source: src({ coupons: { SIRSI20: coupon({ hotelIds: ['sirsi-diner'] }) }, business: { taxMode: 'exclusive', defaultTaxRate: 5 } }) });
check('multi-restaurant groups sum to the grand total', r.groups.reduce((s, g) => s + g.total, 0) === r.grandTotal);
check('restaurant-limited coupon discounts only that restaurant', r.groups.find((g) => g.hotelId === 'moms-magic').couponDiscount === 0);

// 9. Restaurant state.
check('active, open restaurant can take orders', closedReason(diner, sirsi, afternoon) === null);
check('paused restaurant closed', closedReason({ ...diner, pausedUntil: '2026-09-27T12:00:00Z' }, sirsi, afternoon) === 'paused');
check('pause in the past ignored', closedReason({ ...diner, pausedUntil: '2026-09-27T09:00:00Z' }, sirsi, afternoon) === null);
check('outside today’s hours closed (IST)', closedReason({ ...diner, hours: { sun: { open: '18:00', close: '23:00', closed: false } } }, sirsi, afternoon) === 'outside_hours');
check('closed for the day', closedReason({ ...diner, hours: { sun: { open: '09:00', close: '23:00', closed: true } } }, sirsi, afternoon) === 'closed_today');
check('inactive city closes its restaurants', closedReason(diner, { ...sirsi, active: false }, afternoon) === 'city_inactive');
check('not taking orders', closedReason({ ...diner, acceptingOrders: false }, sirsi, afternoon) === 'not_accepting');
check('window past midnight', withinWindow('18:00', '01:00', 30) && !withinWindow('18:00', '01:00', 120));

console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);

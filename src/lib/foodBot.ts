// Logic and wording for the guided "Help me choose" bot (FoodBot.tsx).
// Tap-only: no free text and no server calls — it works from the same menu
// data the home page shows.

import type { Product } from '../types';
import { getItemHotel, OWN_KITCHEN } from '../utils/orderHotels';

export type Lang = 'en' | 'kn' | 'hi';
export type Kind = 'food' | 'cake';
export type Diet = 'veg' | 'nonveg' | 'both';

export type CategoryId =
  | 'biryani' | 'rice' | 'starters' | 'curries' | 'breads' | 'southindian'
  | 'fastfood' | 'soups' | 'drinks' | 'other'
  | 'icecake' | 'normalcake';

interface Strings {
  askType: string;
  food: string;
  cake: string;
  askDiet: string;
  veg: string;
  nonveg: string;
  both: string;
  askCategory: string;
  askDish: string;
  results: (dish: string, n: number) => string;
  add: string;
  added: string;
  closed: string;
  more: string;
  back: string;
  restart: string;
  viewCart: string;
  none: string;
  next: string;
  askDetails: string;
  name: string;
  phone: string;
  needName: string;
  badPhone: string;
  askLocation: string;
  noLocation: string;
  chooseLocation: string;
  deliverHere: string;
  change: string;
  outsideArea: string;
  codTooFar: string;
  payOnline: string;
  review: string;
  itemTotal: string;
  feesNote: string;
  placeOrder: string;
  categories: Record<CategoryId, string>;
}

export const LANG_LABEL: Record<Lang, string> = { kn: 'ಕನ್ನಡ', en: 'English', hi: 'हिंदी' };

export const INTRO = 'Choose your language · ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ · अपनी भाषा चुनें';

export const STRINGS: Record<Lang, Strings> = {
  en: {
    askType: 'What would you like?',
    food: 'Food 🍛',
    cake: 'Cake 🎂',
    askDiet: 'Veg or non-veg?',
    veg: 'Veg 🥦',
    nonveg: 'Non-veg 🍗',
    both: 'Both',
    askCategory: 'Pick a category',
    askDish: 'Which dish?',
    results: (dish, n) => `${dish} is available at ${n} ${n === 1 ? 'place' : 'places'}. Pick one:`,
    add: 'Add',
    added: 'Added ✓',
    closed: 'Closed',
    more: 'Show more',
    back: 'Back',
    restart: 'Start over',
    viewCart: 'Go to cart',
    none: 'Nothing here right now. Try another option.',
    next: 'Next',
    askDetails: 'Your name and mobile number, so the rider can reach you:',
    name: 'Your name',
    phone: '10-digit mobile number',
    needName: 'Please enter your name.',
    badPhone: 'Please enter a valid 10-digit mobile number.',
    askLocation: 'Where should we deliver?',
    noLocation: 'Choose your delivery location to continue.',
    chooseLocation: 'Choose location',
    deliverHere: 'Deliver here',
    change: 'Change',
    outsideArea: 'This address is outside our delivery area. Please choose another.',
    codTooFar: 'This address is more than 5 km away, so cash on delivery is not available. Pay online at checkout.',
    payOnline: 'Pay online at checkout',
    review: 'Your order (cash on delivery):',
    itemTotal: 'Item total',
    feesNote: 'Delivery and packing charges, if any, are added and shown in your WhatsApp order message.',
    placeOrder: 'Place order',
    categories: {
      biryani: 'Biryani', rice: 'Rice & Noodles', starters: 'Starters', curries: 'Curries & Gravy',
      breads: 'Roti & Naan', southindian: 'South Indian', fastfood: 'Fast food & Snacks', soups: 'Soups', drinks: 'Drinks & Desserts',
      other: 'Others', icecake: 'Ice cakes', normalcake: 'Normal cakes',
    },
  },
  kn: {
    askType: 'ನಿಮಗೆ ಏನು ಬೇಕು?',
    food: 'ಊಟ 🍛',
    cake: 'ಕೇಕ್ 🎂',
    askDiet: 'ಸಸ್ಯಾಹಾರಿ ಅಥವಾ ಮಾಂಸಾಹಾರಿ?',
    veg: 'ಸಸ್ಯಾಹಾರಿ 🥦',
    nonveg: 'ಮಾಂಸಾಹಾರಿ 🍗',
    both: 'ಎರಡೂ',
    askCategory: 'ವಿಭಾಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    askDish: 'ಯಾವ ಖಾದ್ಯ ಬೇಕು?',
    results: (dish, n) => `${dish} ${n} ಕಡೆ ಲಭ್ಯವಿದೆ. ಒಂದನ್ನು ಆಯ್ಕೆಮಾಡಿ:`,
    add: 'ಸೇರಿಸಿ',
    added: 'ಸೇರಿಸಲಾಗಿದೆ ✓',
    closed: 'ಮುಚ್ಚಿದೆ',
    more: 'ಇನ್ನಷ್ಟು ತೋರಿಸಿ',
    back: 'ಹಿಂದೆ',
    restart: 'ಮತ್ತೆ ಪ್ರಾರಂಭಿಸಿ',
    viewCart: 'ಕಾರ್ಟ್‌ಗೆ ಹೋಗಿ',
    none: 'ಇಲ್ಲಿ ಈಗ ಏನೂ ಇಲ್ಲ. ಬೇರೆ ಆಯ್ಕೆ ಪ್ರಯತ್ನಿಸಿ.',
    next: 'ಮುಂದೆ',
    askDetails: 'ನಿಮ್ಮ ಹೆಸರು ಮತ್ತು ಮೊಬೈಲ್ ಸಂಖ್ಯೆ, ರೈಡರ್ ನಿಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಲು:',
    name: 'ನಿಮ್ಮ ಹೆಸರು',
    phone: '10 ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
    needName: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಹೆಸರನ್ನು ನಮೂದಿಸಿ.',
    badPhone: 'ದಯವಿಟ್ಟು ಸರಿಯಾದ 10 ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ.',
    askLocation: 'ಎಲ್ಲಿಗೆ ತಲುಪಿಸಬೇಕು?',
    noLocation: 'ಮುಂದುವರಿಯಲು ತಲುಪಿಸುವ ಸ್ಥಳವನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
    chooseLocation: 'ಸ್ಥಳ ಆಯ್ಕೆಮಾಡಿ',
    deliverHere: 'ಇಲ್ಲಿಗೆ ತಲುಪಿಸಿ',
    change: 'ಬದಲಿಸಿ',
    outsideArea: 'ಈ ವಿಳಾಸ ನಮ್ಮ ವಿತರಣಾ ಪ್ರದೇಶದ ಹೊರಗಿದೆ. ಬೇರೆ ವಿಳಾಸ ಆಯ್ಕೆಮಾಡಿ.',
    codTooFar: 'ಈ ವಿಳಾಸ 5 ಕಿ.ಮೀ.ಗಿಂತ ದೂರವಿದೆ, ಆದ್ದರಿಂದ ಕ್ಯಾಶ್ ಆನ್ ಡೆಲಿವರಿ ಲಭ್ಯವಿಲ್ಲ. ಚೆಕ್‌ಔಟ್‌ನಲ್ಲಿ ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಪಾವತಿಸಿ.',
    payOnline: 'ಚೆಕ್‌ಔಟ್‌ನಲ್ಲಿ ಆನ್‌ಲೈನ್ ಪಾವತಿ',
    review: 'ನಿಮ್ಮ ಆರ್ಡರ್ (ಕ್ಯಾಶ್ ಆನ್ ಡೆಲಿವರಿ):',
    itemTotal: 'ಐಟಂ ಮೊತ್ತ',
    feesNote: 'ಡೆಲಿವರಿ ಅಥವಾ ಪ್ಯಾಕಿಂಗ್ ಶುಲ್ಕ ಇದ್ದರೆ, ಅದನ್ನು ಸೇರಿಸಿ ನಿಮ್ಮ ವಾಟ್ಸಾಪ್ ಆರ್ಡರ್ ಸಂದೇಶದಲ್ಲಿ ತೋರಿಸಲಾಗುತ್ತದೆ.',
    placeOrder: 'ಆರ್ಡರ್ ಮಾಡಿ',
    categories: {
      biryani: 'ಬಿರಿಯಾನಿ', rice: 'ರೈಸ್ ಮತ್ತು ನೂಡಲ್ಸ್', starters: 'ಸ್ಟಾರ್ಟರ್ಸ್', curries: 'ಕರಿ ಮತ್ತು ಗ್ರೇವಿ',
      breads: 'ರೊಟ್ಟಿ ಮತ್ತು ನಾನ್', southindian: 'ದಕ್ಷಿಣ ಭಾರತೀಯ', fastfood: 'ಫಾಸ್ಟ್ ಫುಡ್ ಮತ್ತು ತಿಂಡಿ', soups: 'ಸೂಪ್', drinks: 'ಪಾನೀಯ ಮತ್ತು ಸಿಹಿ',
      other: 'ಇತರೆ', icecake: 'ಐಸ್ ಕೇಕ್', normalcake: 'ಸಾಮಾನ್ಯ ಕೇಕ್',
    },
  },
  hi: {
    askType: 'आपको क्या चाहिए?',
    food: 'खाना 🍛',
    cake: 'केक 🎂',
    askDiet: 'वेज या नॉन-वेज?',
    veg: 'वेज 🥦',
    nonveg: 'नॉन-वेज 🍗',
    both: 'दोनों',
    askCategory: 'कैटेगरी चुनें',
    askDish: 'कौन सी डिश?',
    results: (dish, n) => `${dish} ${n} जगह मिलती है। एक चुनें:`,
    add: 'जोड़ें',
    added: 'जोड़ा गया ✓',
    closed: 'बंद',
    more: 'और दिखाएँ',
    back: 'पीछे',
    restart: 'फिर से शुरू करें',
    viewCart: 'कार्ट पर जाएँ',
    none: 'अभी यहाँ कुछ नहीं है। कोई और विकल्प चुनें।',
    next: 'आगे',
    askDetails: 'आपका नाम और मोबाइल नंबर, ताकि राइडर आपसे संपर्क कर सके:',
    name: 'आपका नाम',
    phone: '10 अंकों का मोबाइल नंबर',
    needName: 'कृपया अपना नाम लिखें।',
    badPhone: 'कृपया सही 10 अंकों का मोबाइल नंबर लिखें।',
    askLocation: 'कहाँ डिलीवर करें?',
    noLocation: 'आगे बढ़ने के लिए डिलीवरी की जगह चुनें।',
    chooseLocation: 'जगह चुनें',
    deliverHere: 'यहाँ डिलीवर करें',
    change: 'बदलें',
    outsideArea: 'यह पता हमारे डिलीवरी क्षेत्र से बाहर है। कोई और पता चुनें।',
    codTooFar: 'यह पता 5 किमी से ज़्यादा दूर है, इसलिए कैश ऑन डिलीवरी उपलब्ध नहीं है। चेकआउट पर ऑनलाइन भुगतान करें।',
    payOnline: 'चेकआउट पर ऑनलाइन भुगतान',
    review: 'आपका ऑर्डर (कैश ऑन डिलीवरी):',
    itemTotal: 'आइटम कुल',
    feesNote: 'डिलीवरी या पैकिंग शुल्क, अगर कोई हो, जोड़कर आपके व्हाट्सऐप ऑर्डर मैसेज में दिखाया जाएगा।',
    placeOrder: 'ऑर्डर करें',
    categories: {
      biryani: 'बिरयानी', rice: 'राइस और नूडल्स', starters: 'स्टार्टर्स', curries: 'करी और ग्रेवी',
      breads: 'रोटी और नान', southindian: 'साउथ इंडियन', fastfood: 'फास्ट फूड और स्नैक्स', soups: 'सूप', drinks: 'ड्रिंक्स और मिठाई',
      other: 'अन्य', icecake: 'आइस केक', normalcake: 'नॉर्मल केक',
    },
  },
};

export const FOOD_CATEGORIES: CategoryId[] = [
  'biryani', 'rice', 'starters', 'curries', 'breads', 'southindian', 'fastfood', 'soups', 'drinks', 'other',
];
export const CAKE_CATEGORIES: CategoryId[] = ['icecake', 'normalcake'];

// Menus name their sections differently, so dishes are grouped by what they
// are called. Order matters: the first matching rule wins ("Butter Naan" is
// bread, not curry; "Chicken Fried Rice" is rice, not a starter).
const RULES: Array<[CategoryId, RegExp]> = [
  ['drinks', /shake|juice|mojito|curacao|mocktail|coke|sprite|thums|fanta|lassi|ice ?cream|falooda|\btea\b|coffee|water|soda|lime|dessert|gulab|halwa|kheer|kulfi|sundae|brownie|cake/],
  ['soups', /soup/],
  ['biryani', /biryani|biriyani|briyani|biriani|kushka|pulav|pulao/],
  ['southindian', /dosa|idli|vada|uttap|upma|\bpuri\b|poori|thali|khichdi|pongal|kesari|appam/],
  ['breads', /roti|naan|parota|parotta|paratha|kulcha|chapati|phulka|\bbuns?\b/],
  ['rice', /rice|noodle|hakka|maggi|chowmein|chopsuey/],
  ['fastfood', /shawarma|roll|burger|sandwich|pizza|momo|puff|fries|chips|wrap|papad|samosa|\bpav\b|combo|nugget|popcorn|cutlet|bajji|bhaji|pakoda|pakora|omelette|omlet|bread/],
  ['curries', /masala|curry|kari|gravy|handi|kadai|kadhai|makhani|makkhani|makhni|makhanwala|makkanwala|butter chicken|korma|kurma|\bdal\b|daal|palak|rogan|sabji|keema|mughlai|chettinad|do ?pyaza|bhuna|kolhapuri|jeera|mix veg|pahadi|maharaja|hyderabadi|hydrabadi|kundapur|tadka|spl|special/],
  ['starters', /65|chilli|chilly|chili|manchurian|kabab|kebab|tikka|lollipop|fry|crispy|tandoor|grill|sukka|pepper|tawa|dry|roast|sizzler/],
];

export function categoryOf(name: string): CategoryId {
  const n = name.toLowerCase();
  for (const [id, re] of RULES) if (re.test(n)) return id;
  return 'other';
}

/**
 * Same dish across hotels, whatever each menu calls it: spelling variants,
 * portions and "(12 pcs)" do not matter, so every hotel's chicken biryani
 * lands under one "Chicken Biryani". Each hotel's line still shows its own
 * item name, portion and price.
 */
export function dishKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/biriyani|briyani|biriani/g, 'biryani')
    .replace(/chilly|chili\b/g, 'chilli')
    .replace(/kabab/g, 'kebab')
    .replace(/daal/g, 'dal')
    .replace(/&/g, ' and ')
    .replace(/\b\d+\s*pcs?\b/g, ' ')
    .replace(/\b(half|full|mini|large|small|regular|plate|qtr|quarter|single|double|dum|special|spl)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const titleCase = (key: string) => key.replace(/\b[a-z]/g, (c) => c.toUpperCase());

export interface Offer {
  product: Product & { hotelName?: string; hotelPath?: string; showHotelBadge?: boolean };
  hotelId: string;
  hotelName: string;
}

export interface Dish {
  key: string;
  name: string;
  offers: Offer[];
  minPrice: number;
}

export function hotelOf(p: any): { id: string; name: string } {
  if (p.hotelName && p.hotelId) return { id: p.hotelId, name: p.hotelName };
  const h = getItemHotel(p);
  return h ? { id: h.id, name: h.name } : { id: OWN_KITCHEN.id, name: OWN_KITCHEN.name };
}

/** Dishes in a category for a diet, each with every place that sells it, cheapest first. */
export function dishesFor(products: Offer['product'][], category: CategoryId, diet: Diet): Dish[] {
  const map = new Map<string, Dish>();
  for (const p of products) {
    if (diet === 'veg' && !p.isVeg) continue;
    if (diet === 'nonveg' && p.isVeg) continue;
    if (categoryOf(p.name) !== category) continue;
    const key = dishKey(p.name);
    const hotel = hotelOf(p);
    const dish = map.get(key) || { key, name: titleCase(key) || p.name, offers: [], minPrice: Infinity };
    // One line per hotel per dish (some menus list a dish twice).
    if (!dish.offers.some((o) => o.hotelId === hotel.id && o.product.price === p.price)) {
      dish.offers.push({ product: p, hotelId: hotel.id, hotelName: hotel.name });
    }
    dish.minPrice = Math.min(dish.minPrice, p.price);
    map.set(key, dish);
  }
  const dishes = [...map.values()];
  dishes.forEach((d) => d.offers.sort((a, b) => a.product.price - b.product.price));
  // Dishes many hotels make first (that is where comparing helps), then A-Z.
  return dishes.sort((a, b) => b.offers.length - a.offers.length || a.name.localeCompare(b.name));
}

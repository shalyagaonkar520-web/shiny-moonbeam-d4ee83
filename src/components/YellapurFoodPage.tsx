import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useSEO } from '../utils/seo';

// Plain-text landing pages for the searches people actually type ("food
// delivery in Yellapur", "biryani in Yellapur"). Every statement below must be
// true of the app today (restaurants, charges, hours): update it with the app.

interface PageCopy {
  title: string;
  description: string;
  h1: string;
  intro: string;
}

const PAGES: Record<string, PageCopy> = {
  '/food-delivery-yellapur': {
    title: 'Food Delivery in Yellapur - Minto (formerly Moms Magic)',
    description:
      'Minto (formerly Moms Magic) delivers food in Yellapur from local restaurants: biryani, chaats, veg meals, shawarma and more. Free delivery every Saturday and Sunday.',
    h1: 'Food delivery in Yellapur',
    intro:
      'Minto, earlier known as Moms Magic, brings food from Yellapur restaurants to your door. Pick a restaurant, choose your dishes and pay online, or pay cash on delivery for nearby addresses.',
  },
  '/biryani-yellapur': {
    title: 'Biryani in Yellapur - Order Online | Minto (formerly Moms Magic)',
    description:
      'Order chicken biryani and more online in Yellapur from Minto (formerly Moms Magic). Home delivery from local restaurants, free delivery on Saturday and Sunday.',
    h1: 'Order biryani in Yellapur',
    intro:
      'Looking for biryani in Yellapur? Minto (formerly Moms Magic) lists biryani and rice dishes from local restaurants such as Hotel Mumtaz and Moms Magic Kitchen, delivered to your home.',
  },
  '/order-food-online-yellapur': {
    title: 'Order Food Online in Yellapur | Minto (formerly Moms Magic)',
    description:
      'Order food online in Yellapur and nearby areas with Minto (formerly Moms Magic). Several restaurants in one app, simple pricing and free delivery on weekends.',
    h1: 'Order food online in Yellapur',
    intro:
      'Order from several Yellapur restaurants in one place. Minto (formerly Moms Magic) shows the menu, the price and the delivery charge before you pay.',
  },
};

const RESTAURANTS = [
  { name: 'Moms Magic Kitchen', path: '/hotel-moms-magic-kitchen', note: 'Fried rice, noodles and Chinese, orders open from 2:30 PM' },
  { name: 'Hotel Sankalpa', path: '/hotel-sankalpa', note: 'Pure veg meals' },
  { name: 'Hotel Mumtaz', path: '/hotel-mumtaz', note: 'Multi-cuisine and biryani' },
  { name: 'Hotel Malabar', path: '/hotel-malabar', note: 'Coastal fish and multi-cuisine' },
  { name: 'Chetana Masalapuri Center', path: '/hotel-chetana', note: 'Chaats and snacks, from 4 PM' },
  { name: 'Coastal Crown', path: '/hotel-coastal-crown', note: 'Seafood and tandoor' },
  { name: 'Hotel Al Amin', path: '/hotel-al-amin', note: 'Kebabs, rolls and shawarma, when the restaurant is open' },
];

export default function YellapurFoodPage() {
  const { pathname } = useLocation();
  const page = PAGES[pathname] ?? PAGES['/food-delivery-yellapur'];
  useSEO(page.title, page.description);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff1f4]/70 via-[#fff8fa]/60 to-white text-gray-900 pb-32 pt-6 px-4">
      <div className="max-w-md mx-auto space-y-5 text-left">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-9 h-9 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center text-gray-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-black text-gray-900 leading-tight">{page.h1}</h1>
        </div>

        <p className="text-sm text-gray-700 font-medium leading-relaxed">{page.intro}</p>

        <Link
          to="/"
          className="block text-center rounded-xl bg-[#e23744] text-white font-black text-sm py-3 shadow-sm"
        >
          See restaurants and order
        </Link>

        <section className="space-y-2">
          <h2 className="text-sm font-black text-gray-900">Restaurants you can order from</h2>
          <ul className="space-y-1.5">
            {RESTAURANTS.map((r) => (
              <li key={r.path} className="text-xs text-gray-700 font-medium">
                <Link to={r.path} className="font-black text-[#e23744]">{r.name}</Link> - {r.note}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-sm font-black text-gray-900">Delivery charges</h2>
          <p className="text-xs text-gray-700 font-medium leading-relaxed">
            Delivery starts at Rs 20 and goes up by Rs 10 for each km after the first 2 km. We deliver within about 12 km
            of Yellapur. <b>Delivery is free every Saturday and Sunday.</b> The charge is shown at checkout before you pay.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-sm font-black text-gray-900">Payment</h2>
          <p className="text-xs text-gray-700 font-medium leading-relaxed">
            Pay online, or choose cash on delivery for addresses within 5 km.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-sm font-black text-gray-900">About the name</h2>
          <p className="text-xs text-gray-700 font-medium leading-relaxed">
            Minto was earlier called Moms Magic. It is the same service and the same website (momsmagic.shop), now with
            more restaurants. Moms Magic Kitchen is one of the restaurants on Minto.
          </p>
        </section>

        <p className="text-[11px] text-gray-500 font-medium">
          Questions? See <Link to="/about" className="underline">About</Link> or the{' '}
          <Link to="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Plus, Minus, ShoppingBag, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '../store/cartStore';
import { useDishOrderable } from '../store/dishAvailabilityStore';
import { useLiveHotelStore } from '../store/liveHotelStore';
import { PARTNER_HOTEL_PRODUCTS } from '../data/partnerHotelItems';
import { CHETANA_HOTEL_ID, CHETANA_HOTEL_NAME } from '../data/chetanaMenu';
import { useChatsOpen, CHATS_OPENS_AT_LABEL } from '../lib/chatsHours';
import { playSound, SOUNDS } from '../utils/audio';
import { useSEO } from '../utils/seo';

/**
 * Chetana Masalapuri Center: chaats and snacks, Yellapur. The dishes are the
 * same cart items as the home page's "Chats" category (same ids and prices),
 * so an order from here and from there are identical. Open from 4 PM daily.
 */
export default function HotelChetanaMenuPage() {
  useSEO(
    'Chetana Masalapuri Center - Chaats, Pani Puri, Bhel Puri & Samosa in Yellapur',
    'Order from Chetana Masalapuri Center: bhel puri, pani puri, sev puri, dahi puri, masala puri, veg manchurian and masala samosa. 100% vegetarian. Open daily from 4 PM.'
  );
  const navigate = useNavigate();
  const { items: cartItems, addItem, updateQuantity } = useCartStore();
  const isOrderable = useDishOrderable();
  const chatsOpen = useChatsOpen();
  useEffect(() => useLiveHotelStore.getState().subscribe(), []);
  const hotelOpen = useLiveHotelStore((s) => s.isOpen(CHETANA_HOTEL_ID));
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const dishes = PARTNER_HOTEL_PRODUCTS.filter((p) => p.hotelId === CHETANA_HOTEL_ID && isOrderable(p.hotelId, p.name));
  const cartCount = cartItems.reduce((n, i) => n + i.quantity, 0);
  const cartTotal = cartItems.reduce((n, i) => n + i.price * i.quantity, 0);
  const canOrder = chatsOpen && hotelOpen;

  const add = (p: (typeof dishes)[number]) => {
    // Presentation-only fields must not reach the cart (same as the home page).
    const { hotelName, hotelPath, showHotelBadge, ...cartProduct } = p as any;
    addItem(cartProduct);
    if (!canOrder) return; // the cart explains why (closed before 4 PM)
    playSound(SOUNDS.ADD_TO_CART);
    setJustAdded(p.id);
    toast.success(`${p.name} added! 🍽️`, { id: 'chetana-add' });
  };

  return (
    <div className="min-h-screen bg-[#fffaf5] pb-32">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-orange-100 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-orange-50 active:scale-95 text-gray-800 cursor-pointer" aria-label="Back to home">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="truncate">
              <h1 className="text-base font-black text-gray-900 truncate">{CHETANA_HOTEL_NAME}</h1>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-700">
                <MapPin className="w-3 h-3" />
                <span>Yellapur • Chaats &amp; Snacks</span>
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/checkout')} className="relative p-2.5 rounded-full bg-orange-50 text-orange-700 active:scale-95 cursor-pointer" aria-label="View Cart">
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">{cartCount}</span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        <img src="/hotel_chetana.webp" alt={CHETANA_HOTEL_NAME} className="w-full h-52 sm:h-64 object-cover object-top rounded-3xl border border-orange-100 shadow-sm" />

        <div className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold ${
          canOrder ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <Clock className="w-4 h-4 shrink-0" />
          {!hotelOpen
            ? 'Not taking orders right now.'
            : chatsOpen
            ? `Open now • orders daily from ${CHATS_OPENS_AT_LABEL} till midnight`
            : `Opens daily at ${CHATS_OPENS_AT_LABEL}. You can browse now and order from ${CHATS_OPENS_AT_LABEL}.`}
        </div>

        <ul className="space-y-3">
          {dishes.map((p) => {
            const inCart = cartItems.find((i) => i.id === p.id);
            return (
              <li key={p.id} className="flex gap-3 bg-white rounded-2xl border border-gray-100 shadow-xs p-2.5">
                <img src={p.image} alt={p.name} loading="lazy" decoding="async" className="w-24 h-24 rounded-xl object-cover shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <span className="inline-flex w-4 h-4 border-2 border-emerald-600 items-center justify-center rounded-[3px]" aria-label="Vegetarian">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    </span>
                    <h2 className="text-sm font-black text-gray-900 leading-snug">{p.name}</h2>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-gray-900">₹{p.price}</span>
                    {inCart ? (
                      <div className="bg-orange-600 text-white rounded-full flex items-center px-0.5 shadow-md">
                        <button onClick={() => { playSound(SOUNDS.QUANTITY_TICK); updateQuantity(p.id, inCart.quantity - 1); }} aria-label={`Decrease ${p.name}`} className="w-9 h-9 flex items-center justify-center rounded-full cursor-pointer"><Minus className="w-4 h-4 stroke-[3]" /></button>
                        <span className="min-w-[14px] text-center text-xs font-black">{inCart.quantity}</span>
                        <button onClick={() => { playSound(SOUNDS.QUANTITY_TICK); updateQuantity(p.id, inCart.quantity + 1); }} aria-label={`Increase ${p.name}`} className="w-9 h-9 flex items-center justify-center rounded-full cursor-pointer"><Plus className="w-4 h-4 stroke-[3]" /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => add(p)}
                        className={`px-4 h-9 rounded-full text-xs font-black shadow-md active:scale-95 cursor-pointer ${canOrder ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'} ${justAdded === p.id ? 'ring-2 ring-orange-300' : ''}`}
                        aria-label={`Add ${p.name}`}
                      >
                        {canOrder ? 'ADD' : `Opens ${CHATS_OPENS_AT_LABEL}`}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </main>

      {cartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto">
          <button onClick={() => navigate('/checkout')} className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-rose-600 text-white shadow-xl flex items-center justify-between active:scale-98 cursor-pointer">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-sm">{cartCount}</span>
              <div className="text-left">
                <div className="text-xs font-bold leading-none">View Cart</div>
                <div className="text-sm font-black">₹{cartTotal}</div>
              </div>
            </div>
            <span className="text-sm font-black">Checkout →</span>
          </button>
        </div>
      )}
    </div>
  );
}

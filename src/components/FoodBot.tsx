import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, RotateCcw, Bot, ArrowRight, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMenuStore } from '../store/menuStore';
import { useCartStore } from '../store/cartStore';
import { useLiveHotelStore } from '../store/liveHotelStore';
import { useDishOrderable } from '../store/dishAvailabilityStore';
import { PARTNER_HOTEL_PRODUCTS } from '../data/partnerHotelItems';
import { ICE_CAKES, NORMAL_CAKES } from '../data/partyItems';
import { playSound, SOUNDS } from '../utils/audio';
import { useLocationStore, SERVICE_RADIUS_KM } from '../store/locationStore';
import { normaliseIndianMobile } from '../lib/pricing';
import {
  STRINGS, LANG_LABEL, INTRO, FOOD_CATEGORIES, CAKE_CATEGORIES,
  dishesFor, type Lang, type Kind, type Diet, type CategoryId, type Dish, type Offer,
} from '../lib/foodBot';

const PAGE = 12;

interface State {
  lang?: Lang;
  kind?: Kind;
  diet?: Diet;
  category?: CategoryId;
  dish?: string; // dish key
}

// Cash on delivery is allowed up to this distance (same rule as Checkout).
const COD_MAX_KM = 5;

type Stage = 'browse' | 'details' | 'location' | 'review';

const readSaved = (key: string) => {
  try { return localStorage.getItem(key) || ''; } catch { return ''; }
};

/**
 * Quick Order: language -> food or cake -> veg / non-veg / both -> category ->
 * dish -> every place that makes it, cheapest first; then Next -> name and
 * phone (only if not saved) -> delivery location -> review -> Place order.
 * Placing hands the cart to Checkout, which submits it through the normal
 * path (server pricing, kitchen checks, Telegram, WhatsApp) as cash on
 * delivery. Only taps, apart from typing a name and number once.
 */
export default function FoodBot({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [state, setState] = useState<State>({});
  const [shown, setShown] = useState(PAGE);
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const [stage, setStage] = useState<Stage>('browse');
  const [name, setName] = useState(() => readSaved('mintoo_user_name'));
  const [phone, setPhone] = useState(() => readSaved('mintoo_user_phone'));
  const [formError, setFormError] = useState('');
  const { deliveryLocation, openLocationPicker } = useLocationStore();
  const cartItems = useCartStore((s) => s.items);
  const bottomRef = useRef<HTMLDivElement>(null);

  const menuItems = useMenuStore((s) => s.menuItems);
  const addItem = useCartStore((s) => s.addItem);
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const isHotelOpen = useLiveHotelStore((s) => s.isOpen);
  const isOrderable = useDishOrderable();
  useEffect(() => useLiveHotelStore.getState().subscribe(), []);

  // The same dishes the home page lists, minus anything the kitchen switched off.
  const foodProducts = useMemo(
    () => [
      ...menuItems.filter((p) => isOrderable('al_amin', p.name)),
      ...PARTNER_HOTEL_PRODUCTS.filter((p) => isOrderable(p.hotelId, p.name)),
    ] as Offer['product'][],
    [menuItems, isOrderable]
  );

  const t = STRINGS[state.lang || 'en'];
  const products = state.kind === 'cake'
    ? ((state.category === 'icecake' ? ICE_CAKES : NORMAL_CAKES) as Offer['product'][])
    : foodProducts;
  // Cakes are all vegetarian and sit in their own lists, so they skip the diet
  // question and are grouped by their list rather than by name.
  const dishes: Dish[] = useMemo(() => {
    if (!state.category) return [];
    if (state.kind === 'cake') return cakeDishes(products);
    return dishesFor(products, state.category, state.diet || 'both');
  }, [state.kind, state.category, state.diet, products]);
  const dish = dishes.find((d) => d.key === state.dish);

  // Categories with nothing in them for this diet are not offered.
  const categories = state.kind === 'cake'
    ? CAKE_CATEGORIES
    : FOOD_CATEGORIES.filter((c) => dishesFor(foodProducts, c, state.diet || 'both').length > 0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [state, shown]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (next: State) => { setState(next); setShown(PAGE); };

  const detailsSaved = !!name.trim() && !!normaliseIndianMobile(phone);

  const goNext = () => {
    setFormError('');
    setStage(detailsSaved ? 'location' : 'details');
  };

  const saveDetails = () => {
    const cleanPhone = normaliseIndianMobile(phone);
    if (!name.trim()) return setFormError(t.needName);
    if (!cleanPhone) return setFormError(t.badPhone);
    try {
      localStorage.setItem('mintoo_user_name', name.trim());
      localStorage.setItem('mintoo_user_phone', cleanPhone);
    } catch { /* storage full: Checkout still validates the details */ }
    setPhone(cleanPhone);
    setFormError('');
    setStage('location');
  };

  const placeOrder = () => {
    onClose();
    navigate('/checkout', { state: { quickOrder: true } });
  };

  const back = () => {
    if (stage === 'review') return setStage('location');
    if (stage === 'location') return setStage('browse');
    if (stage === 'details') return setStage('browse');
    if (state.dish) return set({ ...state, dish: undefined });
    if (state.category) return set({ ...state, category: undefined });
    if (state.diet) return set({ ...state, diet: undefined });
    if (state.kind) return set({ lang: state.lang });
    return set({});
  };

  const add = (o: Offer) => {
    // Presentation-only fields on partner hotel items must not reach the cart.
    const { hotelName, hotelPath, showHotelBadge, ...cartProduct } = o.product as any;
    addItem(cartProduct);
    playSound(SOUNDS.ADD_TO_CART);
    setAdded((a) => ({ ...a, [`${o.hotelId}:${o.product.id}`]: true }));
    toast.success(`${o.product.name} · ${o.hotelName}`, { icon: '✨', id: 'bot-add' });
  };

  // ---- transcript: each answered question, then the customer's answer
  const turns: Array<{ q: string; a: string }> = [];
  if (state.lang) turns.push({ q: INTRO, a: LANG_LABEL[state.lang] });
  if (state.kind) turns.push({ q: t.askType, a: state.kind === 'cake' ? t.cake : t.food });
  if (state.diet) turns.push({ q: t.askDiet, a: t[state.diet] });
  if (state.category) turns.push({ q: t.askCategory, a: t.categories[state.category] });
  if (dish) turns.push({ q: t.askDish, a: dish.name });

  // ---- the current question and its choices
  let question = INTRO;
  let choices: Array<{ label: string; onClick: () => void }> = [];
  if (!state.lang) {
    choices = (['kn', 'en', 'hi'] as Lang[]).map((l) => ({ label: LANG_LABEL[l], onClick: () => set({ lang: l }) }));
  } else if (!state.kind) {
    question = t.askType;
    choices = [
      { label: t.food, onClick: () => set({ ...state, kind: 'food' }) },
      { label: t.cake, onClick: () => set({ ...state, kind: 'cake', diet: 'veg' }) },
    ];
  } else if (!state.diet) {
    question = t.askDiet;
    choices = (['veg', 'nonveg', 'both'] as Diet[]).map((d) => ({ label: t[d], onClick: () => set({ ...state, diet: d }) }));
  } else if (!state.category) {
    question = t.askCategory;
    choices = categories.map((c) => ({ label: t.categories[c], onClick: () => set({ ...state, category: c }) }));
  } else if (!dish) {
    question = dishes.length ? t.askDish : t.none;
    choices = dishes.slice(0, shown).map((d) => ({
      // "from" when hotels charge different prices for it.
      label: `${d.name} · ${d.offers.length > 1 ? `₹${d.minPrice}+ · ${d.offers.length}🏨` : `₹${d.minPrice}`}`,
      onClick: () => set({ ...state, dish: d.key }),
    }));
  }

  // Cake questions skip the diet step, so the transcript should too.
  const visibleTurns = state.kind === 'cake' ? turns.filter((x) => x.q !== t.askDiet) : turns;

  return createPortal(
    <div className="fixed inset-0 z-[9000] bg-black/40 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="foodbot-title" onClick={onClose}>
      <div
        className="w-full max-w-md h-[88vh] sm:h-[80vh] bg-gradient-to-b from-[#fff1f4] via-[#fff8fa] to-white rounded-t-[26px] sm:rounded-[26px] shadow-2xl flex flex-col overflow-hidden text-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-rose-100">
          <div className="w-9 h-9 rounded-full bg-[#e11d48] text-white flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="foodbot-title" className="text-sm font-black">Quick Order</h2>
            <p className="text-[10px] font-semibold text-gray-500">Kannada · English · Hindi</p>
          </div>
          {state.lang && (
            <button onClick={() => set({})} aria-label={t.restart} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-rose-50">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-rose-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* conversation */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {visibleTurns.map((turn, i) => (
            <div key={i} className="space-y-2">
              <BotBubble text={turn.q} />
              <div className="flex justify-end">
                <span className="max-w-[80%] px-3.5 py-2 rounded-2xl rounded-br-md bg-[#e11d48] text-white text-sm font-bold">{turn.a}</span>
              </div>
            </div>
          ))}

          {stage !== 'browse' ? (
            <CheckoutSteps
              stage={stage}
              t={t}
              name={name}
              phone={phone}
              setName={setName}
              setPhone={setPhone}
              formError={formError}
              saveDetails={saveDetails}
              deliveryLocation={deliveryLocation}
              openLocationPicker={openLocationPicker}
              toReview={() => setStage('review')}
              toCheckout={() => { onClose(); navigate('/checkout'); }}
              cartItems={cartItems}
              placeOrder={placeOrder}
            />
          ) : dish ? (
            <>
              <BotBubble text={t.results(dish.name, dish.offers.length)} />
              <ul className="space-y-2">
                {dish.offers.map((o) => {
                  const open = isHotelOpen(o.hotelId);
                  const done = added[`${o.hotelId}:${o.product.id}`];
                  return (
                    <li key={`${o.hotelId}:${o.product.id}`} className="bg-white rounded-2xl border border-rose-100 p-3 flex items-center gap-3 shadow-sm">
                      <span
                        aria-label={o.product.isVeg ? 'Veg' : 'Non-veg'}
                        className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 ${o.product.isVeg ? 'border-emerald-600' : 'border-rose-600'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${o.product.isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black truncate">{o.hotelName}</p>
                        <p className="text-xs font-semibold text-gray-500 truncate">{o.product.name}</p>
                      </div>
                      <span className="text-sm font-black shrink-0">₹{o.product.price}</span>
                      <button
                        onClick={() => add(o)}
                        disabled={!open}
                        className={`shrink-0 min-w-[72px] h-10 px-3 rounded-xl text-xs font-black ${
                          !open ? 'bg-gray-100 text-gray-400' : done ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-[#e11d48] text-white'
                        }`}
                      >
                        {!open ? t.closed : done ? t.added : t.add}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <>
              <BotBubble text={question} />
              <div className="flex flex-wrap gap-2">
                {choices.map((c) => (
                  <button
                    key={c.label}
                    onClick={c.onClick}
                    className="px-4 py-2.5 min-h-[44px] rounded-2xl bg-white border border-rose-200 text-sm font-bold text-gray-900 hover:bg-rose-50 active:scale-[0.97] transition-transform text-left"
                  >
                    {c.label}
                  </button>
                ))}
                {state.category && !dish && dishes.length > shown && (
                  <button onClick={() => setShown((n) => n + PAGE)} className="px-4 py-2.5 min-h-[44px] rounded-2xl text-sm font-black text-[#e11d48] underline">
                    {t.more}
                  </button>
                )}
              </div>
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* footer */}
        {state.lang && (
          <div className="flex gap-2 px-4 py-3 bg-white border-t border-rose-100">
            <button onClick={back} className="flex-1 h-11 rounded-xl border border-rose-200 text-sm font-black flex items-center justify-center gap-1">
              <ChevronLeft className="w-4 h-4" /> {t.back}
            </button>
            {stage === 'browse' && cartCount > 0 && (
              <button
                onClick={goNext}
                className="flex-1 h-11 rounded-xl bg-[#e11d48] text-white text-sm font-black flex items-center justify-center gap-1.5"
              >
                {t.next} ({cartCount}) <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function BotBubble({ text }: { text: string }) {
  return (
    <div className="flex">
      <span className="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-bl-md bg-white border border-rose-100 text-sm font-semibold text-gray-800 shadow-sm">{text}</span>
    </div>
  );
}

/** Every cake in the chosen list, one "place" each (Minto bakes them). */
function cakeDishes(products: Offer['product'][]): Dish[] {
  return products.map((p) => ({
    key: String(p.id),
    name: p.name,
    minPrice: p.price,
    offers: [{ product: p, hotelId: 'moms-magic', hotelName: 'Minto' }],
  }));
}

type Strings = (typeof STRINGS)['en'];

interface StepsProps {
  stage: Exclude<Stage, 'browse'>;
  t: Strings;
  name: string;
  phone: string;
  setName: (v: string) => void;
  setPhone: (v: string) => void;
  formError: string;
  saveDetails: () => void;
  deliveryLocation: { address: string; distance: number } | null;
  openLocationPicker: () => void;
  toReview: () => void;
  toCheckout: () => void;
  cartItems: Array<{ id?: string; name: string; price: number; quantity: number }>;
  placeOrder: () => void;
}

/** The ordering steps after Next: details, location, review. */
function CheckoutSteps(p: StepsProps) {
  const { t } = p;
  const primary = 'w-full h-12 rounded-2xl bg-[#e11d48] text-white text-sm font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-transform';
  const secondary = 'w-full h-11 rounded-2xl bg-white border border-rose-200 text-sm font-black text-gray-900';
  const input = 'w-full h-12 px-3 rounded-xl bg-white border border-rose-200 text-sm font-semibold outline-none focus:border-[#e11d48]';

  if (p.stage === 'details') {
    return (
      <div className="space-y-3">
        <BotBubble text={t.askDetails} />
        <input className={input} value={p.name} onChange={(e) => p.setName(e.target.value)} placeholder={t.name} autoComplete="name" aria-label={t.name} />
        <input
          className={input}
          value={p.phone}
          onChange={(e) => p.setPhone(e.target.value.replace(/[^\d+ ]/g, ''))}
          placeholder={t.phone}
          inputMode="numeric"
          type="tel"
          maxLength={16}
          autoComplete="tel"
          aria-label={t.phone}
        />
        {p.formError && <p role="alert" className="text-xs font-bold text-[#e11d48]">{p.formError}</p>}
        <button className={primary} onClick={p.saveDetails}>{t.next} <ArrowRight className="w-4 h-4" /></button>
      </div>
    );
  }

  if (p.stage === 'location') {
    const loc = p.deliveryLocation;
    const outside = !!loc && loc.distance > SERVICE_RADIUS_KM;
    const tooFarForCash = !!loc && !outside && loc.distance > COD_MAX_KM;
    return (
      <div className="space-y-3">
        <BotBubble text={loc ? t.askLocation : t.noLocation} />
        {loc && (
          <div className="bg-white rounded-2xl border border-rose-100 p-3 flex items-start gap-2.5 shadow-sm">
            <MapPin className="w-4 h-4 text-[#e11d48] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900">{loc.address}</p>
              <p className="text-xs font-semibold text-gray-500">{loc.distance} km</p>
            </div>
          </div>
        )}
        {outside && <BotBubble text={t.outsideArea} />}
        {tooFarForCash && <BotBubble text={t.codTooFar} />}
        {loc && !outside && !tooFarForCash && (
          <button className={primary} onClick={p.toReview}>{t.deliverHere} <ArrowRight className="w-4 h-4" /></button>
        )}
        {tooFarForCash && <button className={primary} onClick={p.toCheckout}>{t.payOnline}</button>}
        <button className={secondary} onClick={p.openLocationPicker}>{loc ? t.change : t.chooseLocation}</button>
      </div>
    );
  }

  const total = p.cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return (
    <div className="space-y-3">
      <BotBubble text={t.review} />
      <ul className="bg-white rounded-2xl border border-rose-100 divide-y divide-rose-50 shadow-sm">
        {p.cartItems.map((i) => (
          <li key={i.id || i.name} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
            <span className="font-semibold text-gray-800 min-w-0 truncate">{i.quantity}× {i.name}</span>
            <span className="font-black shrink-0">₹{i.price * i.quantity}</span>
          </li>
        ))}
        <li className="flex items-center justify-between px-3 py-2.5 text-sm">
          <span className="font-black">{t.itemTotal}</span>
          <span className="font-black text-[#e11d48]">₹{total}</span>
        </li>
      </ul>
      <p className="text-xs font-semibold text-gray-500">{t.feesNote}</p>
      <p className="text-xs font-semibold text-gray-600">{p.name} · {p.phone}</p>
      <button className={primary} onClick={p.placeOrder}>{t.placeOrder} <ArrowRight className="w-4 h-4" /></button>
    </div>
  );
}

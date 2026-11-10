import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, RotateCcw, Zap } from 'lucide-react';
import { useLocationStore } from '../store/locationStore';
import { isInYellapur } from '../lib/yellapur';
import { MENSWEAR_MIN_PRICE } from '../data/mensWear';

/** Remembered for the browser session, so the question is asked once per visit. */
const CHOSEN_KEY = 'mintoo_yellapur_choice';

function alreadyChosen(): boolean {
  try {
    return !!sessionStorage.getItem(CHOSEN_KEY);
  } catch {
    return false;
  }
}

/**
 * In Yellapur the app sells two things, so the home page first asks which:
 * Food stays on the home page, Men's Wear goes to the shop. Elsewhere there
 * is only food, so nothing is shown.
 */
export default function YellapurChooser() {
  const navigate = useNavigate();
  const deliveryLocation = useLocationStore((s) => s.deliveryLocation);
  const [open, setOpen] = useState(() => !alreadyChosen());

  if (!open || !isInYellapur(deliveryLocation)) return null;

  const choose = (choice: 'food' | 'menswear') => {
    try {
      sessionStorage.setItem(CHOSEN_KEY, choice);
    } catch {}
    setOpen(false);
    if (choice === 'menswear') navigate('/menswear');
  };

  return createPortal(
    <div className="fixed inset-0 z-[150] bg-gradient-to-b from-[#fff1f4] via-[#fff8fa] to-white overflow-y-auto" role="dialog" aria-modal="true" aria-label="What would you like to order?">
      <div className="min-h-full max-w-3xl mx-auto px-4 py-8 md:py-14 flex flex-col justify-center">
        <p className="text-center text-[11px] font-black uppercase tracking-[0.18em] text-[#e11d48]">Minto in Yellapur</p>
        <h1 className="text-center text-2xl md:text-4xl font-black text-gray-900 mt-1">What would you like today?</h1>
        <p className="text-center text-sm text-gray-500 mt-1.5">Both delivered to your door in minutes</p>

        <div className="grid md:grid-cols-2 gap-3 md:gap-5 mt-7">
          <button
            onClick={() => choose('food')}
            className="group text-left rounded-3xl overflow-hidden bg-white border border-rose-100 shadow-sm hover:shadow-xl active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="relative h-36 md:h-52 bg-gradient-to-br from-[#ff4d6d] to-[#e11d48] flex items-center justify-center">
              <span className="text-6xl md:text-7xl group-hover:scale-110 transition-transform">🍛</span>
              <span className="absolute top-3 left-3 text-4xl opacity-80">🍗</span>
              <span className="absolute bottom-3 right-4 text-4xl opacity-80">🍜</span>
            </div>
            <div className="p-4 md:p-5 flex items-center gap-3">
              <div className="flex-1">
                <h2 className="text-lg md:text-xl font-black text-gray-900">Food</h2>
                <p className="text-xs md:text-sm text-gray-500">Biryani, Chinese, meals, cakes and more</p>
              </div>
              <ChevronRight className="w-6 h-6 text-[#e11d48] shrink-0" />
            </div>
          </button>

          <button
            onClick={() => choose('menswear')}
            className="group text-left rounded-3xl overflow-hidden bg-white border border-indigo-100 shadow-sm hover:shadow-xl active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="relative h-36 md:h-52 bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 overflow-hidden">
              <div className="absolute inset-0 flex justify-center gap-2 pt-4 px-4">
                {['/menswear/green-03-varsity-shirt-1.webp', '/menswear/black-puffer-jacket-1.webp', '/menswear/navy-graphic-hoodie-1.webp'].map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className={`w-1/3 max-w-[120px] aspect-[3/4] object-cover rounded-xl shadow-lg group-hover:-translate-y-1 transition-transform ${i === 1 ? 'mt-0' : 'mt-5'}`}
                  />
                ))}
              </div>
              <span className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full">New</span>
            </div>
            <div className="p-4 md:p-5 flex items-center gap-3">
              <div className="flex-1">
                <h2 className="text-lg md:text-xl font-black text-gray-900">Men's Wear</h2>
                <p className="text-xs md:text-sm text-gray-500">Shirts, jeans, hoodies, jackets from ₹{MENSWEAR_MIN_PRICE}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-800 rounded-full px-2 py-0.5">
                    <Zap className="w-3 h-3" /> 10-min delivery
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-800 rounded-full px-2 py-0.5">
                    <RotateCcw className="w-3 h-3" /> 2-day returns
                  </span>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-indigo-700 shrink-0" />
            </div>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

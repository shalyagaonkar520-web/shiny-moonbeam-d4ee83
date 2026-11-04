import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, PackageSearch } from 'lucide-react';
import { useSEO } from '../utils/seo';

/**
 * Stands in for the tracking screens (/track and /track/:orderId) while live
 * tracking is switched off. Checkout still sends customers to /track/<id>
 * after ordering, so with an id this confirms the order was received rather
 * than showing a bare "coming soon". The real pages (TrackOrderPage,
 * TrackingPage) are untouched; App.tsx routes back to them when this ends.
 */
export default function TrackComingSoon() {
  useSEO('Order tracking', 'Live order tracking is coming soon to Minto.');
  const navigate = useNavigate();
  const { orderId } = useParams();

  return (
    <div className="min-h-screen bg-[#f6f6f7] px-4 pt-16 pb-32 flex flex-col items-center text-center">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-sm border border-gray-100 space-y-4">
        {orderId ? (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h1 className="text-xl font-black text-gray-900">Order received</h1>
            <p className="text-xs text-gray-500">
              Order <span className="font-bold text-gray-800">#{orderId.slice(-6).toUpperCase()}</span> is with the kitchen.
            </p>
          </>
        ) : (
          <div className="w-16 h-16 rounded-full bg-rose-50 text-[#e11d48] flex items-center justify-center mx-auto">
            <PackageSearch className="w-9 h-9" />
          </div>
        )}
        <div className="pt-1">
          <span className="inline-block text-[10px] font-black uppercase tracking-wider text-[#e11d48] bg-rose-50 rounded-full px-3 py-1">
            Coming soon
          </span>
          <h2 className="text-base font-black text-gray-900 mt-3">Live order tracking</h2>
          <p className="text-xs text-gray-500 mt-1">
            You'll soon be able to follow your order here. For now, we'll keep you posted on WhatsApp.
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 rounded-2xl bg-[#e11d48] text-white font-bold text-sm active:scale-95 transition-all cursor-pointer"
        >
          Back to home
        </button>
      </div>
    </div>
  );
}

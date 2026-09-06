import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '../store/cartStore';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSystemStore } from '../store/systemStore';

export default function BottomCartBar() {
  const { items, total } = useCartStore();
  const navigate = useNavigate();
  const location = useLocation();
  const settings = useSystemStore(state => state.settings);
  
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const isVisible = itemCount > 0 && location.pathname !== '/checkout';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="bottom-cart-bar"
          initial={{ y: 60, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 60, opacity: 0, scale: 0.95 }}
          className="fixed bottom-[64px] md:bottom-6 left-3 right-3 md:left-1/2 md:-translate-x-1/2 md:max-w-md z-[95] pointer-events-auto"
        >
          <motion.div 
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/checkout')}
            className="relative bg-gradient-to-r from-[#ffdbe6] via-[#ffeef3] to-[#ffffff] rounded-[24px] p-3 flex items-center justify-between border border-rose-300 ring-1 ring-rose-200 shadow-[0_12px_35px_rgba(244,63,94,0.18)] cursor-pointer overflow-hidden group"
          >
            <div className="flex items-center gap-3 relative z-10">
              {/* Bag Icon with Counter */}
              <div className="w-11 h-11 rounded-2xl bg-white border border-rose-200/90 flex items-center justify-center relative shadow-xs shrink-0">
                <svg className="w-5 h-5 text-[#e11d48]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                <span className="absolute -top-1.5 -right-1.5 bg-[#e11d48] text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border border-white shadow-xs">
                  {itemCount}
                </span>
              </div>

              {/* Total Info */}
              <div className="flex flex-col text-left">
                <span className="text-rose-600 text-[9px] font-black uppercase tracking-wider">Cart Total</span>
                <span className="text-gray-900 text-xl sm:text-2xl font-black tracking-tight leading-none mt-0.5">
                  ₹{total}
                </span>
              </div>
            </div>

            {/* View Cart / Checkout Button */}
            <motion.div 
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff2e74] to-[#e11d48] text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-rose-500/25 relative z-10 shrink-0"
            >
              <span>View Cart</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </motion.div>
          </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}

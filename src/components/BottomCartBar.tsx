import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '../store/cartStore';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

// The floating "view cart" strip above the bottom nav.
//
// One solid bar with the count and total on the left and the action on the
// right, the way the major food apps do it. It used to be a pink gradient card
// with a bordered icon tile, an all-caps "CART TOTAL" label and a second
// gradient button inside it -- three surfaces doing the job of one.
export default function BottomCartBar() {
  const { items, total } = useCartStore();
  const navigate = useNavigate();
  const location = useLocation();

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const isVisible = itemCount > 0 && location.pathname !== '/checkout';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="bottom-cart-bar"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="fixed bottom-[calc(64px+env(safe-area-inset-bottom,0px))] md:bottom-6 left-3 right-3 md:left-1/2 md:-translate-x-1/2 md:max-w-md z-[95] pointer-events-auto"
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/checkout')}
            aria-label={`View cart, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}, ₹${total}`}
            className="w-full bg-[#e11d48] hover:bg-[#be123c] text-white rounded-xl pl-4 pr-3 py-3 flex items-center justify-between shadow-lg shadow-rose-600/25 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <ShoppingBag className="w-5 h-5 shrink-0" />
              <span className="text-sm font-bold truncate">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
                <span className="mx-2 opacity-60">|</span>
                ₹{total}
              </span>
            </span>
            <span className="flex items-center gap-0.5 text-sm font-black shrink-0">
              View cart
              <ChevronRight className="w-4 h-4" />
            </span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

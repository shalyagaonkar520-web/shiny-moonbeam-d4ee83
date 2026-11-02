import { lazy, Suspense, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

// The bot's code downloads only when someone taps the button.
const FoodBot = lazy(() => import('./FoodBot'));

const SHOW_ON = ['/', '/food'];

/** Floating "Quick Order" button on the menu pages; opens the guided ordering chat. */
export default function FoodBotLauncher() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const cartHasItems = useCartStore((s) => s.items.length > 0);

  if (!SHOW_ON.includes(pathname) && !open) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Quick Order"
          // Just above the bottom nav (64px); lifted over the cart bar (~68px) only while it shows.
          className={`fixed right-4 ${cartHasItems ? 'bottom-[calc(140px+env(safe-area-inset-bottom,0px))] md:bottom-28' : 'bottom-[calc(76px+env(safe-area-inset-bottom,0px))] md:bottom-24'} z-[96] flex items-center gap-2 pl-3 pr-4 h-12 rounded-full bg-[#e11d48] text-white font-black text-sm shadow-lg shadow-rose-500/30 active:scale-95 transition-all`}
        >
          <Bot className="w-5 h-5" />
          Quick Order
        </button>
      )}
      {open && (
        <Suspense fallback={null}>
          <FoodBot onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}

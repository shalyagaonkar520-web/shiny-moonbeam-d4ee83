import { lazy, Suspense, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot } from 'lucide-react';

// The bot's code downloads only when someone taps the button.
const FoodBot = lazy(() => import('./FoodBot'));

const SHOW_ON = ['/', '/food'];

/** Floating "Help me choose" button on the menu pages; opens the guided bot. */
export default function FoodBotLauncher() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  if (!SHOW_ON.includes(pathname) && !open) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Help me choose food"
          // Above the bottom nav (64px) and the cart bar (~68px) when it shows.
          className="fixed right-4 bottom-[calc(148px+env(safe-area-inset-bottom,0px))] md:bottom-28 z-[96] flex items-center gap-2 pl-3 pr-4 h-12 rounded-full bg-[#e11d48] text-white font-black text-sm shadow-lg shadow-rose-500/30 active:scale-95 transition-transform"
        >
          <Bot className="w-5 h-5" />
          Help me choose
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

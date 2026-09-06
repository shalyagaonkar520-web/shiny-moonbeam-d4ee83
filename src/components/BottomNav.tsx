import { Link, useLocation } from 'react-router-dom';
import { UtensilsCrossed, Cake, ShoppingBag, User } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

export default function BottomNav() {
  const location = useLocation();
  const { items } = useCartStore();
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-xl border-t border-rose-100 shadow-[0_-4px_25px_rgba(244,63,94,0.06)] py-1.5 px-4 sm:px-6">
      <div className="max-w-md mx-auto flex items-center justify-between">
        
        {/* 1. Food (Home) */}
        <Link 
          to="/" 
          className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${
            isActive('/') ? 'text-[#e11d48]' : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <UtensilsCrossed className={`w-5 h-5 ${isActive('/') ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[10px] ${isActive('/') ? 'font-black text-[#e11d48]' : 'font-semibold'}`}>
            Food
          </span>
        </Link>

        {/* 2. Cakes & B'day (Redirects to /bulk celebration page) */}
        <Link 
          to="/bulk" 
          className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${
            isActive('/bulk') ? 'text-[#e11d48]' : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <Cake className={`w-5 h-5 ${isActive('/bulk') ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[10px] ${isActive('/bulk') ? 'font-black text-[#e11d48]' : 'font-semibold'}`}>
            Cakes & B'day
          </span>
        </Link>

        {/* 3. Cart */}
        <Link 
          to="/checkout" 
          className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors relative ${
            isActive('/checkout') ? 'text-[#e11d48]' : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <div className="relative">
            <ShoppingBag className={`w-5 h-5 ${isActive('/checkout') ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#e11d48] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                {itemCount}
              </span>
            )}
          </div>
          <span className={`text-[10px] ${isActive('/checkout') ? 'font-black text-[#e11d48]' : 'font-semibold'}`}>
            Cart
          </span>
        </Link>

        {/* 4. Account (Profile) */}
        <Link 
          to="/profile" 
          className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${
            isActive('/profile') ? 'text-[#e11d48]' : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <User className={`w-5 h-5 ${isActive('/profile') ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[10px] ${isActive('/profile') ? 'font-black text-[#e11d48]' : 'font-semibold'}`}>
            Account
          </span>
        </Link>
      </div>
    </nav>
  );
}

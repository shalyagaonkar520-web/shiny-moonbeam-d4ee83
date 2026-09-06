import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, User, Bell, Menu, X, Compass, PartyPopper, Utensils, LogOut, PackageSearch, Clock, Download } from 'lucide-react';
import { useLocationStore } from '../store/locationStore';
import { useNavigate, Link } from 'react-router-dom';
import { useSystemStore } from '../store/systemStore';
import { useAuthStore } from '../store/authStore';
import AuthModal from './AuthModal';
import toast from 'react-hot-toast';

export default function Header() {
  const { deliveryLocation, openLocationPicker } = useLocationStore();
  const navigate = useNavigate();
  const settings = useSystemStore(state => state.settings);
  const { user, profile } = useAuthStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('User install choice:', outcome);
      setDeferredPrompt(null);
    } else {
      const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isiOS) {
        toast('To install: Tap the Share button (📤) and choose "Add to Home Screen" 📲', {
          duration: 5000,
          icon: '📱',
          style: {
            background: '#0B0E14',
            color: '#FFFFFF',
            border: '1px solid #4CD964',
            borderRadius: '16px'
          }
        });
      } else {
        toast('To install: Tap the browser menu (⋮) and choose "Install App" or "Add to Home Screen" 📲', {
          duration: 5000,
          icon: '📱',
          style: {
            background: '#0B0E14',
            color: '#FFFFFF',
            border: '1px solid #4CD964',
            borderRadius: '16px'
          }
        });
      }
    }
  };

  const formatTime12h = (time24: string) => {
    try {
      const [hStr, mStr] = time24.split(':');
      const h = parseInt(hStr, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHours = h % 12 || 12;
      return `${displayHours}:${mStr} ${ampm}`;
    } catch (e) {
      return time24;
    }
  };

  const isStoreOpen = () => true;

  return (
    <>
      <header className="sticky top-0 z-[100] bg-[#050505]/95 backdrop-blur-md px-4 py-3 border-b border-[#4CD964]/10 shadow-[0_2px_15px_rgba(0,0,0,0.5)]">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3">
          {/* Left Side: Delivery Details */}
          <div className="flex flex-col text-left">
            {/* Delivery Time Badge */}
            <div className="flex items-center gap-1.5 w-fit">
              <span className="bg-[#4CD964]/10 text-[#4CD964] text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg shadow-sm flex items-center gap-1">
                ⚡ 10 Minutes
              </span>
              <span className="bg-[#4CD964]/10 border border-[#4CD964]/20 text-[#4CD964] text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg shadow-sm flex items-center gap-1.5 animate-pulse">
                🟢 Open Now (24/7)
              </span>
              <span className="bg-white/5 border border-white/10 text-white/60 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-[#4CD964]" /> 24/7 Open
              </span>
            </div>
            
            {/* Location Picker Dropdown */}
            <button 
              onClick={openLocationPicker}
              className="flex items-center gap-1 text-[11px] font-extrabold text-white mt-1 max-w-[180px] sm:max-w-xs transition-colors hover:text-[#4CD964] outline-none"
            >
              <span className="truncate">
                {deliveryLocation ? deliveryLocation.address : 'Balaji PG, Bengaluru'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-white/40 shrink-0" />
            </button>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/food" className="text-xs font-black uppercase tracking-widest text-white/70 hover:text-[#4CD964] transition-colors flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-[#4CD964]" /> Food Order
              </Link>
              <Link to="/bulk" className="text-xs font-black uppercase tracking-widest text-white/70 hover:text-[#4CD964] transition-colors flex items-center gap-1.5">
                <PartyPopper className="w-3.5 h-3.5 text-[#4CD964]" /> Party Specials
              </Link>
              {user && (
                <Link to="/profile" className="text-xs font-black uppercase tracking-widest text-white/70 hover:text-[#4CD964] transition-colors flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#4CD964]" /> My Profile
                </Link>
              )}
            </nav>

            {/* Auth & Install Buttons at Top Right */}
            <div className="flex items-center gap-2">
              {user ? (
                <motion.button
                  whileHover={{ y: -2, scale: 1.03 }}
                  whileTap={{ y: -4, scale: 1.06 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-2 bg-white/5 border border-[#4CD964]/20 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-black text-white hover:border-[#4CD964] transition-colors cursor-pointer"
                >
                  <div className="w-5 h-5 rounded-full bg-[#4CD964]/10 border border-[#4CD964]/30 flex items-center justify-center text-[10px] text-[#4CD964] uppercase font-black shrink-0">
                    {profile?.name?.charAt(0) || user.displayName?.charAt(0) || 'U'}
                  </div>
                  <span className="max-w-[70px] sm:max-w-[120px] truncate uppercase tracking-wider text-[10px] sm:text-xs">
                    {profile?.name || user.displayName || 'Profile'}
                  </span>
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ y: -2, scale: 1.03 }}
                  whileTap={{ y: -4, scale: 1.06 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-gradient-to-r from-[#4CD964] to-[#3AC152] text-white font-black text-[10px] uppercase tracking-[1px] px-3 sm:px-4 py-2 rounded-xl shadow-[0_4px_12px_rgba(76,217,100,0.2)] cursor-pointer whitespace-nowrap"
                >
                  Login
                </motion.button>
              )}

              {/* Install App Button to the Right of Login */}
              <motion.button
                whileHover={{ y: -2, scale: 1.03 }}
                whileTap={{ y: -4, scale: 1.06 }}
                transition={{ type: "spring", stiffness: 500, damping: 18 }}
                onClick={handleInstallClick}
                className="flex items-center gap-1 bg-[#4CD964]/10 hover:bg-[#4CD964]/20 border border-[#4CD964]/30 text-[#4CD964] hover:text-white px-2.5 sm:px-3 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm shrink-0"
                title="Install Mom's Magic App"
              >
                <Download className="w-3.5 h-3.5 text-[#4CD964] animate-bounce" />
                <span>Install</span>
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}

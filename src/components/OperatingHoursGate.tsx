import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Moon, MessageCircle, Phone, ShieldCheck } from 'lucide-react';

export default function OperatingHoursGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  // Strict operating hours: 12:30 PM (750m) to 10:45 PM (1365m)
  const isTimeWithinOperatingHours = () => {
    // Only bypass if navigating the admin portal
    if (location.pathname.startsWith('/admin')) {
      return true;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // 12:30 PM = 12 * 60 + 30 = 750
    // 10:45 PM = 22 * 60 + 45 = 1365
    const openMinutes = 12 * 60 + 30; // 750
    const closeMinutes = 22 * 60 + 45; // 1365

    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  };

  const getNextOpenTarget = (now: Date) => {
    let target = new Date(now);
    target.setHours(12, 30, 0, 0);

    // If current time is past 12:30 PM today, next opening is tomorrow at 12:30 PM
    if (now.getTime() >= target.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return target;
  };

  const computeCountdown = () => {
    const now = new Date();
    const target = getNextOpenTarget(now);
    const diff = Math.max(0, target.getTime() - now.getTime());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0'),
    };
  };

  // Synchronously initialize state so there is zero flash or delay
  const [isOpen, setIsOpen] = useState(isTimeWithinOperatingHours);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [countdown, setCountdown] = useState(computeCountdown);

  // Live real-time check & countdown ticking every 1 second
  useEffect(() => {
    const update = () => {
      const open = isTimeWithinOperatingHours();
      setIsOpen(open);
      setCurrentTime(new Date());
      setCountdown(computeCountdown());
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  // If within operating hours (or admin route), render the app normally
  if (isOpen) {
    return <>{children}</>;
  }

  const hours = currentTime.getHours();
  const isNight = hours >= 22 || hours < 6;

  // Otherwise, FULL SCREEN is covered by this ONE single Closed page
  return (
    <div className="fixed inset-0 z-[99999] min-h-screen w-full bg-gradient-to-b from-[#fff1f4] via-[#fff8fa] to-[#ffffff] text-gray-900 flex items-center justify-center p-4 sm:p-6 overflow-y-auto select-none">
      {/* Soft Ambient Rose Decorative Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[380px] h-[380px] bg-rose-400/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[380px] h-[380px] bg-pink-300/15 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl border border-rose-100 shadow-2xl shadow-rose-500/10 p-6 sm:p-8 relative z-10 text-center my-auto"
      >
        {/* Closed Status Badge */}
        <div className="inline-flex items-center gap-2 bg-rose-50 border border-rose-200 text-[#e11d48] px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-5 shadow-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-[#e11d48] animate-ping" />
          <span>Currently Closed</span>
        </div>

        {/* Central Platter / Dish Icon */}
        <div className="relative mx-auto w-24 h-24 mb-5">
          <div className="absolute inset-0 bg-rose-400/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-[#ff4d6d] to-[#e11d48] text-white flex items-center justify-center shadow-xl shadow-rose-500/25 border-4 border-white">
            {isNight ? (
              <Moon className="w-11 h-11 text-white animate-pulse" />
            ) : (
              <span className="text-4xl animate-bounce">🍲</span>
            )}
          </div>
        </div>

        {/* Heading & Notice */}
        <div className="space-y-2 mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            We'll Be Back Soon!
          </h1>
          <p className="text-xs sm:text-sm font-medium text-gray-600 max-w-xs mx-auto leading-relaxed">
            Mom's Magic accepts food orders daily strictly from{' '}
            <span className="font-bold text-[#e11d48]">12:30 PM</span> to{' '}
            <span className="font-bold text-[#e11d48]">10:45 PM</span>.
          </p>
        </div>

        {/* LIVE COUNTDOWN TIMER CARD */}
        <div className="mb-6 p-4 sm:p-5 bg-gradient-to-b from-rose-50/60 to-white rounded-2xl border border-rose-200/80 shadow-inner">
          <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-widest text-[#e11d48] mb-3">
            <Clock className="w-3.5 h-3.5" />
            <span>Next Opening In</span>
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-3 font-mono">
            {/* Hours */}
            <div className="flex flex-col items-center bg-white border border-rose-200 rounded-2xl py-2.5 px-3 sm:px-4 min-w-[66px] shadow-xs">
              <span className="text-2xl sm:text-3xl font-black text-[#e11d48]">{countdown.hours}</span>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-500 mt-0.5">Hours</span>
            </div>
            <span className="text-2xl font-black text-rose-300 -mt-3">:</span>
            {/* Minutes */}
            <div className="flex flex-col items-center bg-white border border-rose-200 rounded-2xl py-2.5 px-3 sm:px-4 min-w-[66px] shadow-xs">
              <span className="text-2xl sm:text-3xl font-black text-[#e11d48]">{countdown.minutes}</span>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-500 mt-0.5">Mins</span>
            </div>
            <span className="text-2xl font-black text-rose-300 -mt-3">:</span>
            {/* Seconds */}
            <div className="flex flex-col items-center bg-white border border-rose-200 rounded-2xl py-2.5 px-3 sm:px-4 min-w-[66px] shadow-xs">
              <span className="text-2xl sm:text-3xl font-black text-[#e11d48]">{countdown.seconds}</span>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-500 mt-0.5">Secs</span>
            </div>
          </div>
        </div>

        {/* Operating Hours Summary */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-3 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-0.5">Opens Daily</span>
            <p className="text-base sm:text-lg font-black text-gray-900">
              12:30 <span className="text-xs font-bold text-[#e11d48]">PM</span>
            </p>
          </div>
          <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-3 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-0.5">Closes Daily</span>
            <p className="text-base sm:text-lg font-black text-gray-900">
              10:45 <span className="text-xs font-bold text-[#e11d48]">PM</span>
            </p>
          </div>
        </div>

        {/* Advance Party & Cake Booking Note */}
        <div className="bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200/70 rounded-2xl p-4 text-center mb-5 shadow-xs">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-lg">🎂</span>
            <span className="text-xs font-black uppercase tracking-wider text-amber-900">Advance Cakes & Bulk Orders</span>
          </div>
          <p className="text-xs text-gray-600 mb-2.5">
            Planning a birthday or event feast? Contact us on WhatsApp anytime for advance bookings!
          </p>
          <a
            href="https://wa.me/917483187572?text=Hi%20Mom%27s%20Magic%2C%20I%20want%20to%20place%20an%20advance%20party%20or%20cake%20order"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 py-2 px-4 bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Book via WhatsApp</span>
          </a>
        </div>

        {/* Direct Contact Support Buttons */}
        <div className="flex items-center justify-center gap-2.5 pt-1">
          <a
            href="https://wa.me/917483187572?text=Hi%20Mom%27s%20Magic%2C%20I%20have%20an%20inquiry"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-extrabold rounded-xl transition-colors shadow-xs"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </a>
          <a
            href="tel:+917483187572"
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[#e11d48] text-xs font-extrabold rounded-xl transition-colors shadow-xs"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call Kitchen</span>
          </a>
        </div>

        {/* Store Manager / Admin Link */}
        <div className="mt-5 pt-4 border-t border-rose-100/80 text-center">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-[#e11d48] transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Store Manager / Admin Portal</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

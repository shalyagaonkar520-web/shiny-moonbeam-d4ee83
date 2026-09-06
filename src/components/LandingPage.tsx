import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Star, Plus, Minus, ChevronDown, Clock, Zap, 
  ArrowRight, X, Sparkles, User, ShoppingBag, Flame,
  Store, Image as ImageIcon, Bell, Phone, HelpCircle, MessageCircle, Download, LogIn
} from 'lucide-react';
import { useMenuStore } from '../store/menuStore';
import { useCartStore } from '../store/cartStore';
import { useSystemStore } from '../store/systemStore';
import { useLocationStore } from '../store/locationStore';
import { useAuthStore } from '../store/authStore';
import { useInstallModalStore } from '../store/installModalStore';
import AuthModal from './AuthModal';
import toast from 'react-hot-toast';
import { playSound, SOUNDS } from '../utils/audio';
import { useSEO } from '../utils/seo';

const getStableRating = (id: string | number) => {
  const str = String(id);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const rating = 4.2 + (Math.abs(hash) % 8) * 0.1;
  return rating.toFixed(1);
};

const ROTATING_SEARCH_PLACEHOLDERS = [
  'Search "Chicken Dum Biryani"',
  'Search "Shawarma"',
  'Search "Hotel Mumtaz"',
  'Search "Hotel Sankalpa"',
  'Search "Paneer Tikka"',
  'Search "Butter Naan"'
];

// Partner Hotels (Requested: Mumtaz, Mulbar, Sankalpa, Coastal Crown, Al Amin)
// Photo is empty placeholder until user provides reference photo!
const PARTNER_HOTELS = [
  {
    id: 'moms_magic',
    name: "Mom's Magic",
    tagline: "All Orders",
    isOpen: true,
    badge: "Open Now",
    deliveryTime: "10-15 mins",
    image: "/logo.png",
    hasCustomPhoto: true
  },
  {
    id: 'mumtaz',
    name: "Hotel Mumtaz",
    tagline: "Multi-Cuisine & Biryani",
    isOpen: false,
    badge: "Coming Soon",
    deliveryTime: "Coming Soon",
    image: "/hotel_mumtaz.jpg",
    hasCustomPhoto: true
  },
  {
    id: 'malabar',
    name: "Hotel Malabar",
    tagline: "Coastal & Kerala Specials",
    isOpen: false,
    badge: "Coming Soon",
    deliveryTime: "Coming Soon",
    image: "/hotel_malabar.jpg",
    hasCustomPhoto: true
  },
  {
    id: 'sankalpa',
    name: "Hotel Sankalpa",
    tagline: "Pure Veg Heritage Feasts",
    isOpen: false,
    badge: "Coming Soon",
    deliveryTime: "Coming Soon",
    image: "/hotel_sankalpa.jpg",
    hasCustomPhoto: true
  },
  {
    id: 'coastal_crown',
    name: "Coastal Crown",
    tagline: "Seafood & Tandoor Magic",
    isOpen: false,
    badge: "Coming Soon",
    deliveryTime: "Coming Soon",
    image: "/hotel_coastal_crown_dining.jpg",
    hasCustomPhoto: true
  },
  {
    id: 'al_amin',
    name: "Hotel Al Amin",
    tagline: "Kebabs, Rolls & Shawarma",
    isOpen: false,
    badge: "Coming Soon",
    deliveryTime: "Coming Soon",
    image: "/hotel_al_amin.jpg",
    hasCustomPhoto: true
  }
];

// "What's On Your Mind?" Circular Dish Plates (Matching user's reference photo)
const WHATS_ON_YOUR_MIND = [
  {
    id: 'biryani',
    name: 'Biryani',
    image: '/chicken_biryani_new.png'
  },
  {
    id: 'north_indian',
    name: 'North Indian',
    image: '/dal_tadka.png'
  },
  {
    id: 'south_indian',
    name: 'South Indian',
    image: '/parota.jpg'
  },
  {
    id: 'chinese',
    name: 'Chinese',
    image: '/chicken_65_chinese.png'
  },
  {
    id: 'rolls',
    name: 'Rolls & Fast Food',
    image: '/roll_combo.jpg'
  },
  {
    id: 'cakes',
    name: 'Cakes & Sweets',
    image: '/black_forest_cake.png'
  },
  {
    id: 'drinks',
    name: 'Drinks & Shakes',
    image: '/classic_mojito.png'
  }
];

export default function LandingPage() {
  useSEO(
    "Mom's Magic - Food Order",
    "Order Chicken Biryani, Shawarma, Noodles, Veg Meals, Fast Food and Special Combo Offers from Moms Magic. Fast delivery in Yellapur, Dandeli and nearby areas."
  );

  const navigate = useNavigate();
  const { addItem, items: cartItems, updateQuantity } = useCartStore();
  const settings = useSystemStore(state => state.settings);
  const { menuItems } = useMenuStore();
  const { deliveryLocation, openLocationPicker } = useLocationStore();
  const { user, profile } = useAuthStore();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'nonveg'>('all');
  const [selectedMindCategory, setSelectedMindCategory] = useState<string | null>(null);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('All');
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [showHelpToOrder, setShowHelpToOrder] = useState(false);
  const openInstallModal = useInstallModalStore(state => state.openModal);
  const bestsellersRef = useRef<HTMLDivElement>(null);

  const adminToken = localStorage.getItem('moms_magic_admin_token');
  const userPhone = localStorage.getItem('moms_magic_user_phone');
  const isAdmin = adminToken === 'mock-jwt-admin-token-123456' || 
                  userPhone === '+917483187572' || 
                  userPhone === '+919606001790' || 
                  userPhone === '7483187572' || 
                  userPhone === '9606001790';

  // Time lock restriction removed - store is always open
  const isClosed = false;

  // Rotating Search Placeholders
  useEffect(() => {
    const timer = setInterval(() => {
      setSearchIndex((prev) => (prev + 1) % ROTATING_SEARCH_PLACEHOLDERS.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  // Auto rotate banner slides
  useEffect(() => {
    const bannerTimer = setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % 2);
    }, 5000);
    return () => clearInterval(bannerTimer);
  }, []);

  const handleHotelClick = (hotel: typeof PARTNER_HOTELS[0]) => {
    if (!hotel.isOpen) {
      playSound(SOUNDS.CLICK || SOUNDS.ADD_TO_CART);
      toast(`${hotel.name} is coming soon to Mom's Magic! 🔒 We are setting up their delicious menu.`, {
        icon: '⏳',
        style: {
          background: '#1e3a8a',
          color: '#ffffff',
          borderRadius: '16px',
          fontWeight: '700',
          padding: '14px 20px',
          boxShadow: '0 8px 30px rgba(30,58,138,0.3)'
        }
      });
      return;
    }
    // Mom's magic is active, scroll to menu
    bestsellersRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAddToCart = (product: any) => {
    if (isClosed) {
      toast.error('Ordering is currently closed! Please check operating hours.', {
        style: { background: '#1e293b', color: '#fff', border: '1px solid #ef4444' }
      });
      return;
    }
    playSound(SOUNDS.ADD_TO_CART);
    addItem(product);
    toast.success(`${product.name} added! 🍽️`, {
      style: {
        background: '#FFFFFF',
        color: '#111827',
        border: '1px solid rgba(225, 29, 72, 0.2)',
        borderRadius: '16px',
        padding: '12px 20px',
        fontWeight: '700',
        boxShadow: '0 8px 30px rgba(0,0,0,0.1)'
      },
      icon: '✨'
    });
  };

  // Products
  const allProducts = [...menuItems];

  // Bestsellers under 149
  const bestsellersUnder149 = allProducts.filter(item => {
    const matchPrice = item.price <= 149;
    const matchDiet = dietFilter === 'veg' ? item.isVeg : dietFilter === 'nonveg' ? !item.isVeg : true;
    return matchPrice && matchDiet;
  });

  const CATEGORY_TABS = [
    'All',
    'Biryani',
    'Fast Food',
    'Starters',
    'Veg / Gravy',
    'Roti',
    'Burgers & Rolls',
    'Drinks',
    'Party Special'
  ];

  const filteredProducts = allProducts.filter(item => {
    // Diet filter (Veg / Non-Veg / All)
    if (dietFilter === 'veg' && !item.isVeg) return false;
    if (dietFilter === 'nonveg' && item.isVeg) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchCat = (item.category || '').toLowerCase().includes(q);
      const matchDesc = (item.description || '').toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchDesc) return false;
    }

    // What's on your mind filter
    if (selectedMindCategory) {
      if (selectedMindCategory === 'biryani') {
        return item.category === 'Biryani' || item.name.toLowerCase().includes('biryani') || item.name.toLowerCase().includes('kushka');
      }
      if (selectedMindCategory === 'north_indian') {
        return item.category === 'Veg / Gravy' || item.category === 'Roti' || item.name.toLowerCase().includes('paneer') || item.name.toLowerCase().includes('dal');
      }
      if (selectedMindCategory === 'south_indian') {
        return item.name.toLowerCase().includes('parota') || item.name.toLowerCase().includes('chapati') || item.name.toLowerCase().includes('roti') || item.name.toLowerCase().includes('rice');
      }
      if (selectedMindCategory === 'chinese') {
        return item.category === 'Starters' || item.name.toLowerCase().includes('fried rice') || item.name.toLowerCase().includes('noodles') || item.name.toLowerCase().includes('manchurian') || item.name.toLowerCase().includes('chilli');
      }
      if (selectedMindCategory === 'rolls') {
        return item.category === 'Fast Food' || item.category === 'Burgers & Rolls' || item.name.toLowerCase().includes('roll') || item.name.toLowerCase().includes('shawarma') || item.name.toLowerCase().includes('burger');
      }
      if (selectedMindCategory === 'cakes') {
        return item.category === 'Party Special' || item.name.toLowerCase().includes('cake');
      }
      if (selectedMindCategory === 'drinks') {
        return item.category === 'Drinks' || item.name.toLowerCase().includes('shake') || item.name.toLowerCase().includes('coke') || item.name.toLowerCase().includes('mojito');
      }
    }

    // Category tab filter
    if (selectedCategoryTab !== 'All') {
      return item.category === selectedCategoryTab;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff1f4]/70 via-[#fff8fa]/60 to-[#ffffff] text-gray-900 font-sans pb-36">
      
      {/* 1. THE ROYAL BLUE FRAME (TOP HEADER) - CLEAN BLUE AND WHITE */}
      <header className="bg-gradient-to-b from-[#1836c2] via-[#1534be] to-[#102ea8] text-white pt-3.5 pb-5 px-4 rounded-b-[32px] shadow-[0_10px_35px_rgba(24,54,194,0.25)] relative z-40">
        <div className="max-w-xl mx-auto">
          
          {/* Top Row: Location Selector + Help to Order + Profile */}
          <div className="flex items-center justify-between gap-2">
            
            {/* Left: Location Dropdown */}
            <div 
              onClick={openLocationPicker}
              className="flex flex-col cursor-pointer group select-none max-w-[170px] sm:max-w-xs"
            >
              <div className="flex items-center gap-1">
                <span className="text-xs sm:text-[13px] font-black tracking-tight flex items-center gap-1 group-hover:text-amber-300 transition-colors">
                  Current location
                  <ChevronDown className="w-3.5 h-3.5 text-white/80 group-hover:translate-y-0.5 transition-transform" />
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-white/85 font-medium truncate leading-tight mt-0.5">
                {deliveryLocation ? deliveryLocation.address : '471, 10th Cross Road, Neeladri Nagar, Yellapur'}
              </p>
            </div>

            {/* Right: Install App + Help to Order Button + Sign In / Login */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={openInstallModal}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs border border-white/30 active:scale-95 transition-all cursor-pointer shadow-xs"
                title="Install Mom's Magic App"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>

              <button
                type="button"
                onClick={() => setShowHelpToOrder(true)}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs border border-white/30 active:scale-95 transition-all cursor-pointer shadow-xs"
                title="Need Help with Ordering?"
              >
                <span>Help? ❓</span>
              </button>

              {/* SIGN IN / LOGIN ADDED AT SIDE OF HELP */}
              {!user && !profile ? (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-blue-950 font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                  title="Sign In / Login to Mom's Magic"
                >
                  <LogIn className="w-3.5 h-3.5 text-blue-950" />
                  <span>Sign In / Login</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs border border-white/30 active:scale-95 transition-all cursor-pointer shadow-xs"
                  title="My Profile & Account"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 text-blue-950 font-black text-[10px] flex items-center justify-center uppercase shrink-0">
                    {profile?.name?.charAt(0) || user?.displayName?.charAt(0) || 'U'}
                  </div>
                  <span className="max-w-[70px] sm:max-w-[100px] truncate">
                    {profile?.name || user?.displayName || 'Account'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Search Bar: White Rounded Pill */}
          <div className="mt-3.5 relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={ROTATING_SEARCH_PLACEHOLDERS[searchIndex]}
                className="w-full bg-white text-gray-800 text-xs sm:text-sm font-semibold rounded-full pl-11 pr-9 py-2.5 sm:py-3 shadow-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 text-gray-400 hover:text-gray-700 p-0.5 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* THAT BANNER THING: MUMTAZ, MULBAR, SANKALPA, COASTAL CROWN, AL AMIN - COMING SOON BANNER */}
          <div className="mt-4 relative rounded-2xl overflow-hidden shadow-xl border border-white/20 bg-blue-950">
            <div className="relative h-44 sm:h-52 w-full overflow-hidden">
              <AnimatePresence mode="wait">
                {activeBannerIndex === 0 ? (
                  /* Slide 1: Hotels Coming Soon Banner */
                  <motion.div
                    key="hotels-banner"
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 bg-gradient-to-r from-[#0c2269] via-[#102d8a] to-[#1a44c2] p-4 sm:p-5 flex flex-col justify-between text-left"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="bg-amber-400 text-blue-950 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                          <Sparkles className="w-3 h-3 fill-blue-950" /> NEW PARTNERS
                        </span>
                        <span className="bg-white/20 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                          COMING SOON 🔒
                        </span>
                      </div>
                      <h2 className="text-white text-sm sm:text-base font-black uppercase tracking-tight leading-snug">
                        Mumtaz • Malabar • Sankalpa • Coastal Crown • Al Amin
                      </h2>
                      <p className="text-amber-300 font-extrabold text-xs sm:text-sm uppercase tracking-wide mt-1">
                        Joining Mom's Magic Fast Delivery! 🚀
                      </p>
                      <p className="text-white/80 text-[10px] sm:text-xs font-medium mt-0.5 line-clamp-1 max-w-[280px]">
                        Your favorite restaurants from Yellapur & nearby are arriving soon.
                      </p>
                    </div>

                    <div>
                      <button
                        onClick={() => {
                          toast("We'll notify you as soon as Mumtaz, Malabar, Sankalpa, Coastal Crown & Al Amin go live! 🔔", {
                            icon: '🎉',
                            style: { background: '#1e3a8a', color: '#fff', borderRadius: '16px' }
                          });
                        }}
                        className="bg-gradient-to-r from-[#ff2e74] to-[#e11d48] hover:from-[#ff1a66] text-white text-[10px] sm:text-xs font-black uppercase tracking-wider px-4 py-2 rounded-full shadow-[0_4px_15px_rgba(225,29,72,0.4)] border-t border-white/30 flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
                      >
                        <Bell className="w-3.5 h-3.5" /> NOTIFY ME WHEN LIVE →
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  /* Slide 2: Mom's Magic Feast Banner with Real Food Photo */
                  <motion.div
                    key="feast-banner"
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0"
                  >
                    <img
                      src="/banner_food_feast.jpg"
                      alt="Food Feast"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0c2269]/95 via-[#0d277d]/80 to-transparent" />
                    <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between text-left z-10">
                      <div>
                        <span className="inline-block bg-amber-400 text-black text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                          MOM'S SPECIAL FEAST 🔥
                        </span>
                        <h2 className="text-white text-base sm:text-xl font-black uppercase tracking-tight leading-tight mt-1.5 max-w-[240px]">
                          SAVE BIG ON YOUR CRAVINGS
                        </h2>
                        <p className="text-amber-300 font-black text-xs sm:text-sm uppercase tracking-wide mt-0.5">
                          WIN UPTO ₹500 CASHBACK
                        </p>
                      </div>

                      <div>
                        <button
                          onClick={() => bestsellersRef.current?.scrollIntoView({ behavior: 'smooth' })}
                          className="bg-gradient-to-r from-[#ff2e74] to-[#e11d48] text-white text-[10px] sm:text-xs font-black uppercase tracking-wider px-4 py-2 rounded-full shadow-md flex items-center gap-1 active:scale-95 transition-transform"
                        >
                          ORDER NOW →
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Slider Dots */}
              <div className="absolute bottom-2.5 right-3.5 z-20 flex items-center gap-1.5">
                {[0, 1].map((idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveBannerIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      activeBannerIndex === idx 
                        ? 'w-5 bg-amber-400' 
                        : 'w-1.5 bg-white/50 hover:bg-white'
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN BODY: PURE BLUE AND WHITE, NO BLACK! */}
      <main className="max-w-xl mx-auto px-4 mt-5 space-y-6">
        
        {searchQuery.trim() ? (
          /* SEARCH RESULTS DIRECTLY AT THE VERY TOP */
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-gray-900 font-black text-base sm:text-lg tracking-tight leading-tight flex items-center gap-2">
                  <span>Search Results</span>
                  <span className="bg-[#e11d48]/10 text-[#e11d48] text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
                  </span>
                </h2>
                <p className="text-xs text-gray-500 font-medium">Dishes matching "{searchQuery}"</p>
              </div>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-[#e11d48] bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
              >
                Clear Search ✕
              </button>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-rose-100 p-6 shadow-xs space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-[#e11d48] mx-auto flex items-center justify-center text-xl">
                  🔍
                </div>
                <h3 className="text-gray-900 font-black text-sm">No dishes found for "{searchQuery}"</h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Try searching for Biryani, Chicken Kabab, Shawarma, Puffs, or Fried Rice.
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs font-bold text-white bg-[#e11d48] hover:bg-[#ff2e74] px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  View All Dishes
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {filteredProducts.map((product) => {
                  const inCart = cartItems.find(i => i.id === product.id);
                  const originalPrice = Math.round(product.price * 1.25);

                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-2xl p-2.5 sm:p-3 border border-rose-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden text-left"
                    >
                      {/* Food Image with Floating Plus Button */}
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 mb-2">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          loading="lazy"
                        />

                        {product.fires && product.fires >= 2 && (
                          <span className="absolute top-1.5 left-1.5 bg-rose-500 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                            <Flame className="w-2.5 h-2.5" /> Hot
                          </span>
                        )}

                        {/* Floating Pink Circular "+" / Stepper */}
                        <div className="absolute bottom-1.5 right-1.5 z-20">
                          {inCart ? (
                            <div className="bg-[#e11d48] text-white rounded-full flex items-center gap-1.5 px-2 py-1 shadow-md">
                              <button
                                onClick={() => {
                                  playSound(SOUNDS.QUANTITY_TICK);
                                  updateQuantity(product.id, inCart.quantity - 1);
                                }}
                                className="text-white hover:text-white/80 active:scale-75 text-xs font-bold cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-[11px] font-black">{inCart.quantity}</span>
                              <button
                                onClick={() => {
                                  playSound(SOUNDS.QUANTITY_TICK);
                                  updateQuantity(product.id, inCart.quantity + 1);
                                }}
                                className="text-white hover:text-white/80 active:scale-75 text-xs font-bold cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAddToCart(product)}
                              disabled={isClosed}
                              className="w-8 h-8 rounded-full bg-[#ff2e74] hover:bg-[#e11d48] text-white shadow-md flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                              title="Add dish"
                            >
                              <Plus className="w-4 h-4 stroke-[3]" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`w-3 h-3 rounded-xs border flex items-center justify-center shrink-0 ${
                                product.isVeg ? 'border-emerald-600' : 'border-rose-600'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  product.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                                }`}
                              />
                            </span>
                            <span className="text-[10px] font-extrabold text-amber-500 flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                              {getStableRating(product.id)}
                            </span>
                          </div>

                          <h3 className="font-extrabold text-xs sm:text-[13px] text-gray-900 leading-snug line-clamp-2">
                            {product.name}
                          </h3>
                        </div>

                        {/* Price & Meta */}
                        <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs sm:text-sm font-black text-[#e11d48]">
                              ₹{product.price}
                            </span>
                            <span className="text-[10px] text-gray-400 line-through">
                              ₹{originalPrice}
                            </span>
                          </div>

                          <div className="flex items-center gap-0.5 text-amber-600 font-bold text-[10px]">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            <span>{getStableRating(product.id)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* 2. HOTELS SECTION JUST DOWN OF THAT BLUE BOX (IN ROUNDED BOXES, PHOTO BE EMPTY) */}
            <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <h2 className="text-gray-900 font-black text-base sm:text-lg tracking-tight leading-tight">
                Top Hotels & Restaurants
              </h2>
              <p className="text-xs text-gray-500 font-medium">Yellapur's most loved kitchens</p>
            </div>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
              6 Locations
            </span>
          </div>

          {/* Horizontal Scroll of Rounded Hotel Boxes */}
          <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar py-1">
            {PARTNER_HOTELS.map((hotel) => (
              <motion.div
                key={hotel.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleHotelClick(hotel)}
                className={`w-[130px] sm:w-[145px] rounded-2xl p-2.5 flex flex-col justify-between shrink-0 cursor-pointer transition-all bg-white border ${
                  hotel.isOpen 
                    ? 'border-blue-600/30 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/20' 
                    : 'border-gray-200 hover:border-blue-300 shadow-sm'
                }`}
              >
                {/* Hotel Photo Container (Empty Placeholder for Coming Soon hotels as requested) */}
                <div className="relative aspect-square rounded-xl overflow-hidden mb-2 bg-gray-50 flex items-center justify-center border border-gray-100">
                  {hotel.hasCustomPhoto && hotel.image ? (
                    <img 
                      src={hotel.image} 
                      alt={hotel.name}
                      className={`w-full h-full ${hotel.id === 'moms_magic' ? 'object-contain p-1.5' : 'object-cover'}`} 
                    />
                  ) : (
                    /* Clean Empty Photo Box Placeholder */
                    <div className="w-full h-full bg-gradient-to-b from-blue-50/70 to-slate-100 flex flex-col items-center justify-center p-2 text-center">
                      <div className="w-8 h-8 rounded-full bg-white shadow-xs flex items-center justify-center mb-1 text-blue-500">
                        <Store className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-bold text-blue-600/80">Photo</span>
                    </div>
                  )}

                  {/* Status Badge */}
                  <span className={`absolute top-1.5 right-1.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shadow-xs ${
                    hotel.isOpen 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-amber-400 text-blue-950'
                  }`}>
                    {hotel.isOpen ? 'OPEN' : 'SOON 🔒'}
                  </span>
                </div>

                {/* Hotel Info */}
                <div className="text-left flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black text-gray-900 truncate leading-snug">
                      {hotel.name}
                    </h3>
                    <p className="text-[10px] text-gray-500 line-clamp-1 leading-tight mt-0.5">
                      {hotel.tagline}
                    </p>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between">
                    <span className={`text-[9px] font-bold ${
                      hotel.isOpen ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {hotel.deliveryTime}
                    </span>
                    <span className="text-[10px] text-gray-400">→</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 3. "WHAT'S ON YOUR MIND?" SECTION (CIRCULAR DISH PLATES LIKE USER'S REFERENCE) */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-gray-900 font-black text-base sm:text-lg tracking-tight">
              What's On Your Mind?
            </h2>
            {selectedMindCategory && (
              <button 
                onClick={() => setSelectedMindCategory(null)}
                className="text-xs font-bold text-[#1836c2] hover:underline"
              >
                Reset
              </button>
            )}
          </div>

          {/* Horizontal Scroll of Circular Clean PNG Food Plates */}
          <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1">
            {WHATS_ON_YOUR_MIND.map((cat) => {
              const isSelected = selectedMindCategory === cat.id;
              return (
                <motion.button
                  key={cat.id}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    setSelectedMindCategory(isSelected ? null : cat.id);
                  }}
                  className="flex flex-col items-center flex-shrink-0 group cursor-pointer focus:outline-none"
                >
                  {/* Circular Plate */}
                  <div 
                    className={`w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] rounded-full p-1.5 flex items-center justify-center bg-white border shadow-sm transition-all duration-200 ${
                      isSelected 
                        ? 'border-[#1836c2] ring-3 ring-blue-600/20 scale-105 shadow-md' 
                        : 'border-gray-200 group-hover:border-blue-300 group-hover:scale-105'
                    }`}
                  >
                    <img 
                      src={cat.image} 
                      alt={cat.name}
                      className="w-full h-full object-cover rounded-full transition-transform group-hover:scale-110"
                    />
                  </div>
                  <span className={`text-[11px] font-bold mt-1.5 tracking-tight text-center max-w-[70px] truncate transition-colors ${
                    isSelected ? 'text-[#1836c2] font-black' : 'text-gray-800'
                  }`}>
                    {cat.name}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* 4. "BESTSELLERS UNDER ₹149" (CURATED SECTION) */}
        {bestsellersUnder149.length > 0 && !selectedMindCategory && (
          <section ref={bestsellersRef} className="bg-white rounded-3xl p-4 border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <h3 className="text-xl font-black text-[#e11d48] tracking-tight leading-none">
                  Bestsellers
                </h3>
                <span className="text-xs font-bold text-amber-600 block mt-0.5">
                  under ₹149 ✨
                </span>
              </div>
            </div>

            {/* Horizontal Food Items Carousel */}
            <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar py-1">
              {bestsellersUnder149.slice(0, 10).map((product) => {
                const inCart = cartItems.find(i => i.id === product.id);
                const originalPrice = Math.round(product.price * 1.25);

                return (
                  <div
                    key={product.id}
                    className="w-[155px] sm:w-[170px] bg-white rounded-2xl p-2.5 border border-gray-150 shadow-xs flex flex-col justify-between shrink-0 hover:shadow-md transition-shadow"
                  >
                    {/* Food Image Container with Floating Pink "+" */}
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />

                      {/* Floating Pink Add Button or Stepper */}
                      <div className="absolute bottom-1.5 right-1.5 z-20">
                        {inCart ? (
                          <div className="bg-[#e11d48] text-white rounded-full flex items-center gap-1.5 px-2 py-1 shadow-md">
                            <button
                              onClick={() => {
                                playSound(SOUNDS.QUANTITY_TICK);
                                updateQuantity(product.id, inCart.quantity - 1);
                              }}
                              className="text-white hover:text-white/80 active:scale-75 text-xs font-bold"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-[11px] font-black">{inCart.quantity}</span>
                            <button
                              onClick={() => {
                                playSound(SOUNDS.QUANTITY_TICK);
                                updateQuantity(product.id, inCart.quantity + 1);
                              }}
                              className="text-white hover:text-white/80 active:scale-75 text-xs font-bold"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddToCart(product)}
                            disabled={isClosed}
                            className="w-8 h-8 rounded-full bg-[#ff2e74] hover:bg-[#e11d48] text-white shadow-md flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                            title="Add dish"
                          >
                            <Plus className="w-4 h-4 stroke-[3]" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="mt-2 text-left flex-1 flex flex-col justify-between">
                      <div>
                        {/* Veg / Non-Veg Indicator */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 ${
                              product.isVeg ? 'border-emerald-600' : 'border-rose-600'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                product.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                              }`}
                            />
                          </span>
                          <span className="text-[9px] font-bold text-gray-500 uppercase">
                            {product.isVeg ? 'Veg' : 'Non-Veg'}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug">
                          {product.name}
                        </h4>
                      </div>

                      {/* Pricing & Delivery Info */}
                      <div className="mt-2 pt-1.5 border-t border-gray-100">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs sm:text-sm font-black text-[#e11d48]">
                            ₹{product.price}
                          </span>
                          <span className="text-[10px] text-gray-400 line-through">
                            ₹{originalPrice}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
                          <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>25 mins</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-amber-600 font-bold">★ {getStableRating(product.id)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 5. EXPLORE DISHES SECTION WITH CATEGORY PILLS */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 px-1 gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-gray-900 font-black text-base sm:text-lg tracking-tight">
                {selectedMindCategory ? `Dishes for "${selectedMindCategory.replace('_', ' ').toUpperCase()}"` : 'All Dishes'}
              </h3>
              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {filteredProducts.length} items
              </span>
            </div>

            {/* VEG / NON-VEG BUTTONS (JUST BESIDE ALL DISHES) */}
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl border border-gray-200/80 w-fit">
              <button
                onClick={() => setDietFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dietFilter === 'all'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setDietFilter(dietFilter === 'veg' ? 'all' : 'veg')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dietFilter === 'veg'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-emerald-700 border border-emerald-200/80 hover:bg-emerald-50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-[3px] border border-current flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                </span>
                <span>Veg</span>
              </button>
              <button
                onClick={() => setDietFilter(dietFilter === 'nonveg' ? 'all' : 'nonveg')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dietFilter === 'nonveg'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white text-rose-700 border border-rose-200/80 hover:bg-rose-50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-[3px] border border-current flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                </span>
                <span>Non-Veg</span>
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
            {CATEGORY_TABS.map((cat) => {
              const isActive = selectedCategoryTab === cat && !selectedMindCategory;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedMindCategory(null);
                    setSelectedCategoryTab(cat);
                  }}
                  className={`flex-shrink-0 text-xs font-bold px-4 py-2 rounded-full transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-[#1836c2] text-white shadow-sm' 
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-3xl border border-gray-200 p-8 shadow-xs">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-700 font-bold text-sm">No dishes found in this selection</p>
              <button
                onClick={() => {
                  setSelectedCategoryTab('All');
                  setSelectedMindCategory(null);
                  setSearchQuery('');
                  setDietFilter('all');
                }}
                className="mt-3 text-xs font-bold text-[#1836c2] bg-blue-50 px-4 py-2 rounded-full"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3">
              {filteredProducts.map((product) => {
                const inCart = cartItems.find(i => i.id === product.id);
                const originalPrice = Math.round(product.price * 1.25);

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl p-2.5 sm:p-3 border border-gray-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden text-left"
                  >
                    {/* Food Image with Floating Plus Button */}
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 mb-2">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        loading="lazy"
                      />

                      {product.fires && product.fires >= 2 && (
                        <span className="absolute top-1.5 left-1.5 bg-rose-500 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5" /> Hot
                        </span>
                      )}

                      {/* Floating Pink Circular "+" / Stepper */}
                      <div className="absolute bottom-1.5 right-1.5 z-20">
                        {inCart ? (
                          <div className="bg-[#e11d48] text-white rounded-full flex items-center gap-1.5 px-2 py-1 shadow-md">
                            <button
                              onClick={() => {
                                playSound(SOUNDS.QUANTITY_TICK);
                                updateQuantity(product.id, inCart.quantity - 1);
                              }}
                              className="text-white hover:text-white/80 active:scale-75 text-xs font-bold"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-[11px] font-black">{inCart.quantity}</span>
                            <button
                              onClick={() => {
                                playSound(SOUNDS.QUANTITY_TICK);
                                updateQuantity(product.id, inCart.quantity + 1);
                              }}
                              className="text-white hover:text-white/80 active:scale-75 text-xs font-bold"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddToCart(product)}
                            disabled={isClosed}
                            className="w-8 h-8 rounded-full bg-[#ff2e74] hover:bg-[#e11d48] text-white shadow-md flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                            title="Add dish"
                          >
                            <Plus className="w-4 h-4 stroke-[3]" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        {/* Veg / Non-Veg Indicator */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 ${
                              product.isVeg ? 'border-emerald-600' : 'border-rose-600'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                product.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                              }`}
                            />
                          </span>
                          <span className="text-[9px] font-bold text-gray-500 uppercase">
                            {product.isVeg ? 'Veg' : 'Non-Veg'}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs sm:text-[13px] font-bold text-gray-900 line-clamp-2 leading-snug">
                          {product.name}
                        </h4>
                        
                        {product.description && (
                          <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                            {product.description}
                          </p>
                        )}
                      </div>

                      {/* Price & Meta */}
                      <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs sm:text-sm font-black text-[#e11d48]">
                              ₹{product.price}
                            </span>
                            <span className="text-[10px] text-gray-400 line-through">
                              ₹{originalPrice}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 text-amber-600 font-bold text-[10px]">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          <span>{getStableRating(product.id)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        </>
        )}
      </main>

      {/* Help to Order Modal */}
      <AnimatePresence>
        {showHelpToOrder && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-sm rounded-[28px] p-6 shadow-2xl border border-rose-100 relative overflow-hidden text-left"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowHelpToOrder(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-13 h-13 rounded-2xl bg-rose-50 text-[#e11d48] flex items-center justify-center mb-3.5 shadow-inner">
                <HelpCircle className="w-7 h-7" />
              </div>

              <h3 className="text-xl font-black text-gray-900 tracking-tight">Help to Order? 🍲</h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Contact us! We will tell you how to order and take care of your delicious meal step-by-step.
              </p>

              <div className="mt-5 space-y-3">
                {/* Number 1: 7483187572 */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-50/70 to-pink-50/40 border border-rose-100 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Kitchen Support 1</span>
                    <span className="text-sm sm:text-base font-black text-gray-900">+91 7483187572</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a
                      href="tel:+917483187572"
                      className="p-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm flex items-center justify-center"
                      title="Call Now"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    <a
                      href="https://wa.me/917483187572?text=Hi%2C%20I%20need%20help%20to%20order%20food%20from%20Mom%27s%20Magic!"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors shadow-sm flex items-center justify-center"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Number 2: 9483235488 */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-50/70 to-pink-50/40 border border-rose-100 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Kitchen Support 2</span>
                    <span className="text-sm sm:text-base font-black text-gray-900">+91 9483235488</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a
                      href="tel:+919483235488"
                      className="p-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm flex items-center justify-center"
                      title="Call Now"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    <a
                      href="https://wa.me/919483235488?text=Hi%2C%20I%20need%20help%20to%20order%20food%20from%20Mom%27s%20Magic!"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors shadow-sm flex items-center justify-center"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-center text-center">
                <span className="text-[11px] font-semibold text-rose-600">
                  ✨ Instant assistance • Homestyle cooking with love
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}

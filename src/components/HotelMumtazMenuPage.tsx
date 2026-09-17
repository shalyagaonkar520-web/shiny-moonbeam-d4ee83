import { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  MapPin, 
  Clock, 
  Search, 
  X, 
  ArrowUp, 
  BookOpen, 
  Utensils, 
  Star,
  Info,
  Plus,
  Minus
} from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import toast from 'react-hot-toast';
import { playSound, SOUNDS } from '../utils/audio';
import { HOTEL_MUMTAZ_MENU } from '../data/hotelMumtazMenu';
import { 
  resolveMumtazDishImage, 
  getFallbackDishImage, 
  isNonVegItem, 
  isBestseller 
} from '../data/hotelMumtazMenuImages';
import { useSEO } from '../utils/seo';

// Friendly emoji icons for menu categories
const CATEGORY_ICONS: Record<string, string> = {
  'Soups': '🍲',
  'Chicken Starters': '🍗',
  'Mutton Starters': '🥩',
  'Egg Starters': '🍳',
  'Veg Starters': '🥦',
  'Egg Main Course': '🍳',
  'Chicken Main Course': '🍛',
  'Veg Main Course': '🥘',
  'Mutton Main Course': '🍖',
  'Chicken Family Pack': '🍱',
  'Mutton Family Pack': '🍱',
  'Fish Masala': '🐟',
  'Fish Thali': '🍱',
  'Fish Starters': '🍤',
  'Kaka Traditional Biryani': '🍚',
  'Thalis': '🍛',
  'Roti / Paratha': '🫓',
  'Rice': '🍚',
  'Veg Fried Rice & Noodles': '🍜',
  'Noodles & Fried Rice (Non-Veg)': '🥡',
  'Raita & Salad': '🥗',
  'Desserts & Falooda': '🍨',
  'Fruit Desserts': '🍓',
  'Icecreams': '🍦',
  'Milk Shakes': '🥤',
  'Fresh Juices': '🍹',
  'Beverages': '🧋',
  'Pizza - Nonveg': '🍕',
  'Pizza - Veg': '🍕',
  'Make to Order (Pizza Base)': '🍕',
  'Pizza Extras': '🧀',
  'Hot Beverages': '☕',
  'Shawarma & Rolls': '🌯',
  'Mutton & Fish Starters': '🥩',
  'Veg Starters & Main Course': '🥦',
  'Rice, Rolls & Drinks': '🥡',
};

type DietFilter = 'all' | 'veg' | 'non-veg' | 'bestseller';

export default function HotelMumtazMenuPage() {
  useSEO(
    'Hotel Mumtaz Menu - Full Food Menu',
    'Browse the complete Hotel Mumtaz family restaurant menu — authentic biryani, starters, kababs, curries, desserts and drinks with full photos and prices.'
  );

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [dietFilter, setDietFilter] = useState<DietFilter>('all');
  const [activeCategory, setActiveCategory] = useState(HOTEL_MUMTAZ_MENU[0].title);
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const { items: cartItems, addItem, updateQuantity } = useCartStore();
  const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleAddToCart = (
    item: { name: string; price: number | null },
    image: string,
    nonVeg: boolean,
    categoryTitle: string
  ) => {
    if (item.price === null) return;
    playSound(SOUNDS.ADD_TO_CART);
    const itemId = `mumtaz-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    addItem({
      id: itemId,
      hotelId: 'mumtaz',
      name: item.name,
      price: item.price,
      image: image,
      category: categoryTitle,
      type: 'food',
      isVeg: !nonVeg,
      description: `Authentic Hotel Mumtaz ${item.name}`
    });
    toast.success(`${item.name} added! 🍽️`, {
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

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const quickNavRef = useRef<HTMLDivElement | null>(null);

  // Monitor scroll for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Jump smoothly to a specific menu category
  const scrollToCategory = (title: string) => {
    setActiveCategory(title);
    setShowCategoryDrawer(false);
    const target = sectionRefs.current[title];
    if (target) {
      const topOffset = 135;
      const elementPosition = target.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filtered menu calculation
  const filteredMenu = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return HOTEL_MUMTAZ_MENU.map((category) => {
      const filteredItems = category.items.filter((item) => {
        // Search text check
        if (query) {
          const matchName = item.name.toLowerCase().includes(query);
          const matchCat = category.title.toLowerCase().includes(query);
          if (!matchName && !matchCat) return false;
        }

        // Diet / Bestseller check
        const nonVeg = isNonVegItem(category.title, item.name);
        if (dietFilter === 'veg' && nonVeg) return false;
        if (dietFilter === 'non-veg' && !nonVeg) return false;
        if (dietFilter === 'bestseller' && !isBestseller(category.title, item.name)) return false;

        return true;
      });

      return {
        ...category,
        items: filteredItems
      };
    }).filter((cat) => cat.items.length > 0);
  }, [searchQuery, dietFilter]);

  // Total item count across all categories
  const totalCount = useMemo(
    () => HOTEL_MUMTAZ_MENU.reduce((sum, c) => sum + c.items.length, 0),
    []
  );

  const activeCount = useMemo(
    () => filteredMenu.reduce((sum, c) => sum + c.items.length, 0),
    [filteredMenu]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff1f4]/70 via-[#fff8fa]/60 to-[#ffffff] text-gray-900 font-sans pb-36">
      {/* 1. TOP APP BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-rose-100 shadow-xs">
        <div className="max-w-[1150px] mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/')}
              aria-label="Back to home"
              className="w-10 h-10 rounded-full bg-rose-50 hover:bg-rose-100 flex items-center justify-center transition-colors shrink-0 text-[#e11d48] active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-gray-900 truncate tracking-tight">Hotel Mumtaz</h1>
                <span className="bg-rose-50 text-[#e11d48] border border-rose-200/70 text-[10px] font-black px-2 py-0.5 rounded-md hidden sm:inline-block">
                  EST. 1933
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium truncate flex items-center gap-1.5">
                <span>The Original Kaka Hotel</span>
                <span>&bull;</span>
                <span className="text-[#e11d48] font-bold">{totalCount} Signature Dishes</span>
              </p>
            </div>
          </div>

          {/* Partner Badge */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-[#ff2e74] to-[#e11d48] hover:from-[#ff1a66] text-white text-xs font-bold px-4 py-2 rounded-full shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <span>Order on Mom's Magic</span>
          </button>
        </div>
      </header>

      {/* 2. RICH RESTAURANT HERO BANNER */}
      <section className="relative w-full overflow-hidden bg-gray-900 border-b border-gray-200">
        <div className="relative h-56 sm:h-72 w-full">
          <img
            src="/hotel_mumtaz.webp"
            alt="Hotel Mumtaz Restaurant"
            className="w-full h-full object-cover opacity-85 scale-105"
            onError={(e) => {
              e.currentTarget.src = '/chicken_biryani_new.webp';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-black/30" />
        </div>

        {/* Floating Info Overlay */}
        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 max-w-[1150px] mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="bg-amber-400 text-amber-950 text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
              The Original Kaka Hotel &bull; Since 1933
            </span>
            <span className="bg-emerald-500/90 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Open Now &bull; Halal Certified
            </span>
          </div>

          <h2 className="text-white text-2xl sm:text-4xl font-black tracking-tight leading-none drop-shadow-md">
            Hotel Mumtaz
          </h2>
          <p className="text-gray-200 text-xs sm:text-sm font-medium mt-1.5 max-w-xl">
            Multi-Cuisine Family Restaurant &bull; World Famous Kakas Traditional Biryani, Tandoor &amp; Starters
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-white/90 text-xs font-medium">
            <span className="flex items-center gap-1 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> 11:00 AM - 11:30 PM
            </span>
            <span className="flex items-center gap-1 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-lg">
              <MapPin className="w-3.5 h-3.5 text-red-400" /> Margao &amp; Fatorda, Goa
            </span>
            <span className="flex items-center gap-1 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-lg font-bold text-amber-300">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> 4.4 (1.4K+ Reviews)
            </span>
          </div>
        </div>
      </section>

      {/* 3. ORDERING NOTICE BANNER */}
      <div className="max-w-[1150px] mx-auto px-4 mt-3">
        <div className="bg-gradient-to-r from-[#fff1f4] to-[#ffe4ec] border border-rose-200/90 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#ff2e74] to-[#e11d48] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Info className="w-4 h-4" />
            </div>
            <p className="text-xs text-gray-700 font-medium">
              <strong className="text-[#e11d48] font-black">Mom's Magic Exclusive Menu:</strong> Browse the official Hotel Mumtaz signature dishes below with ultra-clear food photography and authentic prices.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="shrink-0 bg-white border border-rose-200 text-[#e11d48] hover:bg-rose-50 text-[11px] font-black px-3.5 py-1.5 rounded-xl transition-colors shadow-xs cursor-pointer active:scale-95"
          >
            Mom's Magic Home
          </button>
        </div>
      </div>

      {/* 4. SEARCH & FILTER CONTROLS (Sticky) */}
      <div className="sticky top-[57px] z-30 bg-white/95 backdrop-blur-md border-b border-rose-100 shadow-xs mt-3">
        <div className="max-w-[1150px] mx-auto px-4 py-2.5 space-y-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Mumtaz signature dishes (e.g. Chicken Kadai, Tikka Masala, Rogan Josh...)"
              className="w-full pl-10 pr-10 py-2 bg-rose-50/50 hover:bg-rose-50 focus:bg-white border border-rose-200/80 focus:border-[#e11d48] focus:ring-2 focus:ring-[#e11d48]/15 rounded-xl text-xs sm:text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-hidden transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400 hover:text-rose-600 p-1"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {/* All */}
            <button
              onClick={() => setDietFilter('all')}
              className={`text-xs font-bold px-3 py-1 rounded-full border transition-all shrink-0 ${
                dietFilter === 'all'
                  ? 'bg-gradient-to-r from-[#ff2e74] to-[#e11d48] text-white border-[#e11d48] shadow-xs'
                  : 'bg-white text-gray-600 border-rose-200/70 hover:bg-rose-50'
              }`}
            >
              All ({totalCount})
            </button>

            {/* Veg Only */}
            <button
              onClick={() => setDietFilter(dietFilter === 'veg' ? 'all' : 'veg')}
              className={`text-xs font-bold px-3 py-1 rounded-full border transition-all shrink-0 flex items-center gap-1.5 ${
                dietFilter === 'veg'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-gray-700 border-rose-200/70 hover:bg-emerald-50 hover:border-emerald-200'
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-sm border border-emerald-600 flex items-center justify-center bg-white">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              </span>
              Pure Veg
            </button>

            {/* Non-Veg Only */}
            <button
              onClick={() => setDietFilter(dietFilter === 'non-veg' ? 'all' : 'non-veg')}
              className={`text-xs font-bold px-3 py-1 rounded-full border transition-all shrink-0 flex items-center gap-1.5 ${
                dietFilter === 'non-veg'
                  ? 'bg-red-600 text-white border-red-600 shadow-xs'
                  : 'bg-white text-gray-700 border-rose-200/70 hover:bg-red-50 hover:border-red-200'
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-sm border border-red-600 flex items-center justify-center bg-white">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
              </span>
              Non-Veg
            </button>

            {/* Bestsellers */}
            <button
              onClick={() => setDietFilter(dietFilter === 'bestseller' ? 'all' : 'bestseller')}
              className={`text-xs font-bold px-3 py-1 rounded-full border transition-all shrink-0 flex items-center gap-1 ${
                dietFilter === 'bestseller'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                  : 'bg-white text-amber-700 border-rose-200/70 hover:bg-amber-50'
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              Bestsellers
            </button>

            <div className="h-4 w-px bg-rose-200 shrink-0 mx-1" />

            {/* Quick Category Jump Button */}
            <button
              onClick={() => setShowCategoryDrawer(true)}
              className="text-xs font-black text-[#e11d48] bg-rose-50 border border-rose-200 hover:bg-rose-100 px-3 py-1 rounded-full shrink-0 flex items-center gap-1"
            >
              <BookOpen className="w-3 h-3" />
              Jump to Category &darr;
            </button>
          </div>
        </div>

        {/* Quick-Nav Category Ribbon */}
        <div ref={quickNavRef} className="max-w-[1150px] mx-auto px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-rose-100 bg-rose-50/30">
          {HOTEL_MUMTAZ_MENU.map((cat) => {
            const isActive = activeCategory === cat.title;
            const icon = CATEGORY_ICONS[cat.title] || '🍽️';
            return (
              <button
                key={cat.title}
                onClick={() => scrollToCategory(cat.title)}
                className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#ff2e74] to-[#e11d48] text-white shadow-xs scale-[1.02]'
                    : 'bg-white text-gray-700 border border-rose-200/80 hover:border-rose-300 hover:bg-rose-50/60'
                }`}
              >
                <span>{icon}</span>
                <span>{cat.title}</span>
                <span className={`text-[9px] px-1 rounded-full ${isActive ? 'bg-white/25 text-white' : 'bg-rose-100 text-[#e11d48]'}`}>
                  {cat.items.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. SEARCH SUMMARY BAR */}
      {(searchQuery || dietFilter !== 'all') && (
        <div className="max-w-[1150px] mx-auto px-4 pt-3 flex items-center justify-between text-xs text-gray-600">
          <p>
            Showing <strong className="text-gray-900">{activeCount}</strong> matching items
            {searchQuery && <> for &ldquo;<span className="text-[#e11d48] font-semibold">{searchQuery}</span>&rdquo;</>}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setDietFilter('all');
            }}
            className="text-[#e11d48] hover:underline font-bold cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* 6. MAIN MENU DISH LISTINGS */}
      <main className="max-w-[1150px] mx-auto px-4 pt-5 space-y-9">
        {filteredMenu.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-3xl border border-rose-100 shadow-xs my-6">
            <div className="w-16 h-16 bg-rose-50 text-[#e11d48] rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-gray-900">No dishes found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              We couldn't find any dishes matching "{searchQuery}". Try a different keyword or reset your filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setDietFilter('all');
              }}
              className="mt-4 bg-gradient-to-r from-[#ff2e74] to-[#e11d48] hover:from-[#ff1a66] text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-sm transition-all cursor-pointer"
            >
              Show Full Menu ({totalCount} items)
            </button>
          </div>
        ) : (
          filteredMenu.map((category) => {
            const icon = CATEGORY_ICONS[category.title] || '🍽️';
            return (
              <section
                key={category.title}
                ref={(el) => {
                  sectionRefs.current[category.title] = el;
                }}
                className="scroll-mt-[135px]"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between pb-2.5 mb-3.5 border-b-2 border-rose-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xl" role="img" aria-label={category.title}>
                      {icon}
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                      {category.title}
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-[#e11d48] bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full">
                    {category.items.length} {category.items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Dish Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {category.items.map((item) => {
                    const nonVeg = isNonVegItem(category.title, item.name);
                    const bestseller = isBestseller(category.title, item.name);
                    const dishImage = item.image || resolveMumtazDishImage(category.title, item.name);
                    const fallbackImage = item.image || getFallbackDishImage(category.title);
                    const itemId = `mumtaz-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                    const inCart = cartItems.find((ci) => ci.id === itemId || ci.name === item.name);

                    return (
                      <motion.div
                        key={item.name}
                        whileHover={{ y: -3 }}
                        transition={{ duration: 0.18 }}
                        className="bg-white rounded-2xl border border-rose-100 shadow-xs hover:shadow-md hover:border-rose-200 transition-all duration-200 overflow-hidden flex flex-col group relative"
                      >
                        {/* Dish Photo Container */}
                        <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                          <img
                            src={dishImage}
                            alt={item.name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              // Ensure no broken image is ever displayed
                              if (e.currentTarget.src !== fallbackImage) {
                                e.currentTarget.src = fallbackImage;
                              }
                            }}
                          />

                          {/* Subtle Image Gradient Overlay for text contrast */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/15 pointer-events-none" />

                          {/* Veg / Non-Veg Indicator Badge */}
                          <span
                            title={nonVeg ? 'Non-Vegetarian' : 'Vegetarian'}
                            className={`absolute top-2 left-2 w-4 h-4 rounded-sm border-2 flex items-center justify-center bg-white shadow-xs ${
                              nonVeg ? 'border-red-600' : 'border-emerald-600'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                nonVeg ? 'bg-red-600' : 'bg-emerald-600'
                              }`}
                            />
                          </span>

                          {/* Bestseller Badge */}
                          {bestseller && (
                            <span className="absolute top-2 right-2 bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-current" />
                              Bestseller
                            </span>
                          )}

                          {/* Category Tag overlay on image */}
                          <span className="absolute bottom-1.5 left-2 text-[10px] font-bold text-white/90 drop-shadow-sm truncate max-w-[85%]">
                            {category.title}
                          </span>
                        </div>

                        {/* Dish Info & Price */}
                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 
                              className="text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-2 min-h-[2.4em]"
                              title={item.name}
                            >
                              {item.name}
                            </h4>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-rose-100/60 flex items-center justify-between gap-1">
                            {item.price !== null ? (
                              <div className="flex items-baseline gap-0.5">
                                <span className="text-base sm:text-lg font-black text-[#e11d48] tracking-tight">
                                  &#8377;{item.price}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                                {item.note || 'Market Price'}
                              </span>
                            )}

                            {/* ADD Button or Quantity Stepper */}
                            {item.price !== null && (
                              inCart ? (
                                <div className="bg-[#e11d48] text-white rounded-xl flex items-center gap-1 px-2 py-1 shadow-xs">
                                  <button
                                    onClick={() => {
                                      playSound(SOUNDS.QUANTITY_TICK);
                                      updateQuantity(inCart.id || itemId, inCart.quantity - 1);
                                    }}
                                    className="text-white hover:text-white/80 active:scale-75 p-0.5 cursor-pointer"
                                    title="Decrease quantity"
                                  >
                                    <Minus className="w-3.5 h-3.5 stroke-[3]" />
                                  </button>
                                  <span className="text-xs font-black px-1 min-w-[14px] text-center">
                                    {inCart.quantity}
                                  </span>
                                  <button
                                    onClick={() => {
                                      playSound(SOUNDS.QUANTITY_TICK);
                                      updateQuantity(inCart.id || itemId, inCart.quantity + 1);
                                    }}
                                    className="text-white hover:text-white/80 active:scale-75 p-0.5 cursor-pointer"
                                    title="Increase quantity"
                                  >
                                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleAddToCart(item, dishImage, nonVeg, category.title)}
                                  className="bg-white hover:bg-rose-50 text-[#e11d48] border-2 border-[#e11d48] hover:border-[#ff2e74] text-xs font-black px-3.5 py-1 rounded-xl shadow-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                                  title={`Add ${item.name} to cart`}
                                >
                                  <span>ADD</span>
                                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </main>

      {/* 7. RESTAURANT FOOTER INFO */}
      <footer className="max-w-[1150px] mx-auto px-4 mt-14">
        <div className="bg-white border border-rose-100 rounded-3xl p-6 sm:p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#e11d48] border border-rose-100 flex items-center justify-center mx-auto mb-3 font-black text-xl">
            🏛️
          </div>
          <h3 className="text-lg font-black text-gray-900">Hotel Mumtaz &bull; Family Restaurant</h3>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Famous for Kaka's Traditional Dum Biryani, Starters &amp; Multi-Cuisine Dining Since 1933.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-[#ff2e74] to-[#e11d48] hover:from-[#ff1a66] text-white text-xs font-bold px-7 py-3 rounded-full shadow-sm transition-all cursor-pointer active:scale-95"
            >
              Browse Mom's Magic Dishes
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-rose-100">
            <p className="text-[11px] text-gray-400 font-medium">
              Food photography provided by{' '}
              <a
                href="https://www.pexels.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#e11d48] hover:underline font-semibold"
              >
                Pexels
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* 8. FLOATING CATEGORY BROWSER BUTTON ("BROWSE MENU") */}
      <div className={`fixed inset-x-0 z-30 flex justify-center pointer-events-none transition-all duration-300 ${cartItemCount > 0 ? 'bottom-[136px] md:bottom-20' : 'bottom-20 md:bottom-8'}`}>
        <div className="flex items-center gap-2 pointer-events-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCategoryDrawer(true)}
            className="bg-gradient-to-r from-[#ff2e74] to-[#e11d48] hover:from-[#ff1a66] text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-full shadow-[0_4px_20px_rgba(225,29,72,0.4)] flex items-center gap-2 border border-rose-300/40 transition-all cursor-pointer"
          >
            <Utensils className="w-4 h-4 text-white" />
            <span>Browse Menu</span>
            <span className="bg-white/25 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {HOTEL_MUMTAZ_MENU.length}
            </span>
          </motion.button>

          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={scrollToTop}
              aria-label="Scroll to top"
              className="w-11 h-11 rounded-full bg-white text-[#e11d48] border border-rose-100 shadow-xl flex items-center justify-center hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <ArrowUp className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>

      {/* 9. CATEGORY JUMP MODAL / BOTTOM SHEET */}
      <AnimatePresence>
        {showCategoryDrawer && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCategoryDrawer(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 w-full sm:max-w-lg max-h-[80vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#ff2e74] to-[#e11d48] text-white flex items-center justify-center font-bold shadow-xs">
                    📋
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900">Browse Menu Categories</h3>
                    <p className="text-[11px] text-gray-500 font-medium">
                      Select a category to jump directly to its dishes
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCategoryDrawer(false)}
                  className="w-8 h-8 rounded-full bg-rose-100 hover:bg-rose-200 flex items-center justify-center text-[#e11d48] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Categories Scrollable List */}
              <div className="p-3 overflow-y-auto divide-y divide-rose-50">
                {HOTEL_MUMTAZ_MENU.map((cat) => {
                  const icon = CATEGORY_ICONS[cat.title] || '🍽️';
                  const isCurrent = activeCategory === cat.title;

                  return (
                    <button
                      key={cat.title}
                      onClick={() => scrollToCategory(cat.title)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                        isCurrent
                          ? 'bg-rose-50 text-[#e11d48] font-black border-l-4 border-[#e11d48]'
                          : 'hover:bg-rose-50/60 text-gray-800 font-bold'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{icon}</span>
                        <span className="text-xs sm:text-sm">{cat.title}</span>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          isCurrent
                            ? 'bg-gradient-to-r from-[#ff2e74] to-[#e11d48] text-white'
                            : 'bg-rose-100/70 text-[#e11d48]'
                        }`}
                      >
                        {cat.items.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

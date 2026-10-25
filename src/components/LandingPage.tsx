import React, { useState, useEffect, useRef, useMemo } from 'react';
import MenuFilterChips from './MenuFilterChips';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Minus, ChevronDown, Clock,
  ArrowRight, X, Sparkles, User, ShoppingBag, Flame,
  Store, Image as ImageIcon, Phone, HelpCircle, MessageCircle, Download, LogIn,
  ChevronRight, MapPin
} from 'lucide-react';
import { useMenuStore } from '../store/menuStore';
import { useCartStore } from '../store/cartStore';
import { useLiveHotelStore } from '../store/liveHotelStore';
import { useSystemStore } from '../store/systemStore';
import { useLocationStore } from '../store/locationStore';
import { useAuthStore } from '../store/authStore';
import AuthModal from './AuthModal';
import toast from 'react-hot-toast';
import { playSound, SOUNDS } from '../utils/audio';
import { useSEO } from '../utils/seo';
import DishImage from './DishImage';
import { PARTNER_HOTEL_PRODUCTS } from '../data/partnerHotelItems';
import { useDishOrderable } from '../store/dishAvailabilityStore';

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
    id: 'mintoo',
    name: "Minto",
    tagline: "All Orders",
    isOpen: true,
    badge: "Open Now",
    image: "/logo-sm.webp",
    hasCustomPhoto: true
  },
  {
    id: 'mumtaz',
    name: "Hotel Mumtaz",
    tagline: "Multi-Cuisine & Biryani",
    isOpen: true,
    badge: "View Menu",
    image: "/hotel_mumtaz.webp",
    hasCustomPhoto: true
  },
  {
    id: 'malabar',
    name: "Hotel Malabar",
    tagline: "Coastal Fish & Multi-Cuisine",
    isOpen: true,
    badge: "View Menu",
    image: "/hotel_malabar.webp",
    hasCustomPhoto: true
  },
  {
    id: 'sankalpa',
    name: "Hotel Sankalpa",
    tagline: "Pure Veg Heritage Feasts",
    isOpen: true,
    badge: "View Menu",
    image: "/hotel_sankalpa.webp",
    hasCustomPhoto: true
  },
  {
    id: 'coastal_crown',
    name: "Coastal Crown",
    tagline: "Seafood & Tandoor Magic",
    isOpen: true,
    badge: "View Menu",
    image: "/hotel_coastal_crown_dining.webp",
    hasCustomPhoto: true
  },
  {
    id: 'al_amin',
    name: "Hotel Al Amin",
    tagline: "Kebabs, Rolls & Shawarma",
    isOpen: true,
    badge: "View Menu",
    image: "/hotel_al_amin.webp",
    hasCustomPhoto: true
  }
];

// "What's on your mind?" Circular Dish Plates (Matching user's reference photo)
const WHATS_ON_YOUR_MIND = [
  {
    id: 'biryani',
    name: 'Biryani',
    image: '/chicken_biryani_new.webp'
  },
  {
    id: 'north_indian',
    name: 'North Indian',
    image: '/dal_tadka.webp'
  },
  {
    id: 'south_indian',
    name: 'South Indian',
    image: '/parota.webp'
  },
  {
    id: 'chinese',
    name: 'Chinese',
    image: '/chicken_65_chinese.webp'
  },
  {
    id: 'rolls',
    name: 'Rolls & Fast Food',
    image: '/roll_combo.webp'
  },
  {
    id: 'cakes',
    name: 'Cakes & Sweets',
    image: '/black_forest_cake.webp'
  },
  {
    id: 'drinks',
    name: 'Drinks & Shakes',
    image: '/classic_mojito.webp'
  }
];

export default function LandingPage() {
  useSEO(
    "Minto - Food Order",
    "Order Chicken Biryani, Shawarma, Noodles, Veg Meals, Fast Food and Special Combo Offers from Minto. Fast delivery in Yellapur, Dandeli and nearby areas."
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
  const [priceSort, setPriceSort] = useState<'relevance' | 'low' | 'high'>('relevance');
  const [priceCap, setPriceCap] = useState<number | null>(null);
  const [selectedMindCategory, setSelectedMindCategory] = useState<string | null>(null);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('All');
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [showHelpToOrder, setShowHelpToOrder] = useState(false);
  const bestsellersRef = useRef<HTMLDivElement>(null);
  const hotelsRef = useRef<HTMLElement>(null);
  // The home grid lists every hotel's menu (230+ dishes). Rendering them all at
  // once costs about 6,500 DOM nodes and made scrolling noticeably heavier on a
  // phone, so cards are appended a page at a time as the user reaches the end.
  const PAGE_SIZE = 40;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

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

  // Live availability from JIS Kitchen. A hotel deactivated there, or one
  // whose kitchen switched itself off, must close here too.
  const isHotelOpen = useLiveHotelStore((s) => s.isOpen);
  useEffect(() => useLiveHotelStore.getState().subscribe(), []);

  const handleHotelClick = (hotel: typeof PARTNER_HOTELS[0]) => {
    if (!isHotelOpen(hotel.id)) {
      toast(hotel.name + ' is not taking orders right now.');
      return;
    }

    if (hotel.id === 'mumtaz') {
      navigate('/hotel-mumtaz');
      return;
    }
    if (hotel.id === 'al_amin') {
      navigate('/hotel-al-amin');
      return;
    }
    if (hotel.id === 'coastal_crown') {
      navigate('/hotel-coastal-crown');
      return;
    }
    if (hotel.id === 'malabar') {
      navigate('/hotel-malabar');
      return;
    }
    if (hotel.id === 'sankalpa') {
      navigate('/hotel-sankalpa');
      return;
    }
    if (!hotel.isOpen) {
      playSound(SOUNDS.CLICK || SOUNDS.ADD_TO_CART);
      toast(`${hotel.name} is coming soon to Minto! 🔒 We are setting up their delicious menu.`, {
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
    // Minto is active, scroll to menu
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
    // Presentation-only fields on partner hotel items must not reach the cart.
    const { hotelName, hotelPath, showHotelBadge, ...cartProduct } = product;
    addItem(cartProduct);
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

  // Products.
  // `menuItems` is Hotel Al Amin's menu, so it stays first and its cards carry
  // no hotel badge; PARTNER_HOTEL_PRODUCTS then adds Sankalpa followed by the
  // remaining hotels, each badged with the hotel that cooks it.
  // Dishes switched off in the panel are left out everywhere on this screen.
  const isOrderable = useDishOrderable();
  const allProducts = useMemo(
    () => [
      ...menuItems.filter((item) => isOrderable('al_amin', item.name)),
      ...PARTNER_HOTEL_PRODUCTS.filter((item) => isOrderable(item.hotelId, item.name)),
    ],
    [menuItems, isOrderable]
  );

  /** Hotel name to print on a card, or null for Al Amin / Minto items. */
  const hotelBadgeOf = (product: any): string | null =>
    product?.showHotelBadge ? product.hotelName : null;

  /**
   * Card blurb. Hotel menus that ship no real description fall back to
   * "<Hotel> <Dish>", which would just repeat the badge and the title, so
   * those are dropped rather than printed a second time.
   */
  const blurbOf = (product: any): string | null => {
    const text: string | undefined = product?.description;
    if (!text) return null;
    const filler = `${product.hotelName} ${product.name}`;
    if (text === filler || text.replace(/^Authentic /, '') === filler) return null;
    return text;
  };

  // Bestsellers under 149
  const bestsellersUnder149 = useMemo(() => allProducts.filter(item => {
    const matchPrice = item.price <= 149;
    const matchDiet = dietFilter === 'veg' ? item.isVeg : dietFilter === 'nonveg' ? !item.isVeg : true;
    return matchPrice && matchDiet;
  }), [allProducts, dietFilter]);

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

  const searchTerms = useMemo(
    () => searchQuery.toLowerCase().split(/\s+/).filter((t) => t && t !== 'hotel'),
    [searchQuery]
  );
  const searchHaystack = (item: any) =>
    `${item.name} ${item.category || ''} ${item.description || ''} ${item.hotelName || ''}`.toLowerCase();

  const matchedProducts = useMemo(() => allProducts.filter(item => {
    // Diet filter (Veg / Non-Veg / All)
    if (dietFilter === 'veg' && !item.isVeg) return false;
    if (dietFilter === 'nonveg' && item.isVeg) return false;

    if (priceCap !== null && item.price > priceCap) return false;

    // Search query filter. Every word must appear somewhere in the dish name,
    // category, description or restaurant name, so "mumtaz biryani" and
    // "Hotel Sankalpa" (both suggested in the search box) find something.
    if (searchTerms.length) {
      const haystack = searchHaystack(item);
      if (!searchTerms.every((t) => haystack.includes(t))) return false;
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
  }), [allProducts, dietFilter, priceCap, searchTerms, selectedMindCategory, selectedCategoryTab]);

  // Search puts dishes whose name matches first; price sort overrides that.
  const filteredProducts = useMemo(() => {
    const nameRank = (item: any) => {
      if (!searchTerms.length) return 0;
      const name = item.name.toLowerCase();
      if (name.startsWith(searchTerms[0])) return 0;
      return searchTerms.every((t) => name.includes(t)) ? 1 : 2;
    };
    return priceSort === 'low' ? [...matchedProducts].sort((a, b) => a.price - b.price)
      : priceSort === 'high' ? [...matchedProducts].sort((a, b) => b.price - a.price)
      : searchTerms.length ? [...matchedProducts].sort((a, b) => nameRank(a) - nameRank(b))
      : matchedProducts;
  }, [matchedProducts, priceSort, searchTerms]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMoreProducts = filteredProducts.length > visibleCount;

  // Any change of filter, tab or search starts the list again from the top.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, dietFilter, selectedMindCategory, selectedCategoryTab, priceSort, priceCap]);

  // Append the next page when the sentinel below the grid scrolls into view.
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMoreProducts) return;
    // Very old browsers have no IntersectionObserver. Constructing one there
    // threw inside this effect, which unmounted the tree and left a blank page;
    // without it the "Show more dishes" button still reveals the rest.
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((count) => count + PAGE_SIZE);
        }
      },
      { rootMargin: '600px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreProducts, visibleProducts.length]);

  // The header shows the address the way food apps do: the first part bold
  // ("Main Road") and the rest underneath in grey ("Yellapur, Karnataka").
  const addressParts = (deliveryLocation?.address || '')
    .split(',')
    .map((part: string) => part.trim())
    .filter(Boolean);
  const locationHeading = addressParts[0] || 'Set location';
  const locationDetail = addressParts.length > 1
    ? addressParts.slice(1).join(', ')
    : deliveryLocation ? 'Delivery location' : 'Choose where to deliver';

  return (
    <div className="min-h-screen bg-[#f6f6f7] text-gray-900 font-sans pb-36">

      {/* Header. White, like every major food app: where it's going on the
          left, who's ordering on the right, search underneath. It used to be a
          royal-blue block with a yellow Sign In pill and a red "?", which put
          three accent colours on screen before a single dish. */}
      <header className="safe-top bg-white border-b border-gray-100">
        <div className="max-w-xl mx-auto px-4 pt-3 pb-3">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={openLocationPicker}
              className="flex items-start gap-2 min-w-0 flex-1 text-left cursor-pointer group"
              aria-label="Change delivery location"
            >
              <MapPin className="w-5 h-5 text-[#e11d48] mt-0.5 shrink-0" strokeWidth={2.5} />
              <span className="min-w-0">
                <span className="flex items-center gap-1">
                  <span className="text-[15px] font-black text-gray-900 truncate">
                    {locationHeading}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-700 shrink-0 group-hover:translate-y-0.5 transition-transform" />
                </span>
                <span className="block text-xs text-gray-500 font-medium truncate leading-tight">
                  {locationDetail}
                </span>
              </span>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowHelpToOrder(true)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                title="Help with your order"
                aria-label="Help with your order"
              >
                <HelpCircle className="w-[18px] h-[18px]" />
              </button>

              {!user && !profile ? (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="h-9 pl-2.5 pr-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  title="Sign in to Minto"
                >
                  <User className="w-4 h-4" />
                  Sign in
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="w-9 h-9 rounded-full bg-[#e11d48] text-white font-black text-sm flex items-center justify-center uppercase active:scale-95 transition-all cursor-pointer"
                  title="My account"
                  aria-label="My account"
                >
                  {profile?.name?.charAt(0) || user?.displayName?.charAt(0) || 'U'}
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="mt-3 relative flex items-center">
            <Search className="w-[18px] h-[18px] text-gray-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={ROTATING_SEARCH_PLACEHOLDERS[searchIndex]}
              aria-label="Search for dishes or restaurants"
              className="w-full bg-gray-100 text-gray-900 text-sm font-medium rounded-xl pl-11 pr-10 py-3 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#e11d48]/30 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-1.5 w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-700 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Offers carousel. Hidden while searching so results sit directly
          under the search box. Sentence case: a page of all-caps headings
          reads as shouting rather than as a menu. */}
      {!searchQuery.trim() && (
        <div className="max-w-xl mx-auto px-4 mt-3">
          <div className="relative rounded-2xl overflow-hidden shadow-sm bg-gray-900">
            <div className="relative h-40 sm:h-48 w-full overflow-hidden">
              <AnimatePresence mode="wait">
                {activeBannerIndex === 0 ? (
                  <motion.div
                    key="hotels-banner"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="absolute inset-0 bg-gradient-to-br from-[#e11d48] via-[#d6194a] to-[#9f1239] p-4 sm:p-5 flex flex-col justify-between text-left"
                  >
                    <div>
                      <span className="inline-flex items-center gap-1 bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                        <Sparkles className="w-3 h-3" /> 5 partner kitchens
                      </span>
                      <h2 className="text-white text-lg sm:text-xl font-black leading-tight mt-2 max-w-[260px]">
                        Yellapur&apos;s favourite hotels, one cart
                      </h2>
                      <p className="text-white/80 text-xs font-medium mt-1 line-clamp-1 max-w-[270px]">
                        Order from any of them in one cart
                      </p>
                    </div>
                    <div>
                      <button
                        onClick={() => hotelsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                        className="bg-white text-[#e11d48] text-xs font-black px-4 py-2 rounded-full shadow-sm flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
                      >
                        <Store className="w-3.5 h-3.5" /> See hotels
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="feast-banner"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="absolute inset-0"
                  >
                    <img
                      src="/banner_food_feast.webp"
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
                    <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between text-left z-10">
                      <div>
                        <span className="inline-block bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                          Minto special
                        </span>
                        <h2 className="text-white text-lg sm:text-xl font-black leading-tight mt-2 max-w-[230px]">
                          Your cravings, delivered hot
                        </h2>
                        <p className="text-white/80 text-xs font-medium mt-1">
                          From Yellapur&apos;s best kitchens
                        </p>
                      </div>
                      <div>
                        <button
                          onClick={() => bestsellersRef.current?.scrollIntoView({ behavior: 'smooth' })}
                          className="bg-white text-gray-900 text-xs font-black px-4 py-2 rounded-full shadow-sm flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
                        >
                          Order now <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute bottom-3 right-3.5 z-20 flex items-center gap-1.5">
                {[0, 1].map((idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveBannerIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      activeBannerIndex === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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

            <MenuFilterChips
              priceSort={priceSort}
              onPriceSort={setPriceSort}
              priceCap={priceCap}
              onPriceCap={setPriceCap}
              diet={dietFilter}
              onDiet={setDietFilter}
            />

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
                  View all dishes
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {visibleProducts.map((product) => {
                  const inCart = cartItems.find(i => i.id === product.id);

                  return (
                    <div
                      key={product.id}
                      className="dish-card-cv bg-white rounded-2xl p-2.5 sm:p-3 border border-rose-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden text-left"
                    >
                      {/* Food Image with Floating Plus Button */}
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 mb-2">
                        <DishImage
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        />

                        {hotelBadgeOf(product) && (
                          <span className="absolute top-1.5 left-1.5 z-10 max-w-[62%] truncate bg-black/70 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-xs">
                            {hotelBadgeOf(product)}
                          </span>
                        )}

                        {product.fires && product.fires >= 2 && (
                          <span className="absolute top-1.5 right-1.5 bg-rose-500 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                            <Flame className="w-2.5 h-2.5" /> Hot
                          </span>
                        )}

                        {/* Floating Pink Circular "+" / Stepper */}
                        <div className="absolute bottom-1.5 right-1.5 z-20">
                          {inCart ? (
                            <div className="bg-[#e11d48] text-white rounded-full flex items-center px-0.5 shadow-md">
                              <button
                                onClick={() => {
                                  playSound(SOUNDS.QUANTITY_TICK);
                                  updateQuantity(product.id, inCart.quantity - 1);
                                }}
                                aria-label={`Decrease ${product.name}`}
                                className="w-9 h-9 flex items-center justify-center rounded-full text-white hover:bg-white/15 active:scale-90 cursor-pointer"
                              >
                                <Minus className="w-4 h-4 stroke-[3]" />
                              </button>
                              <span className="min-w-[14px] text-center text-xs font-black">{inCart.quantity}</span>
                              <button
                                onClick={() => {
                                  playSound(SOUNDS.QUANTITY_TICK);
                                  updateQuantity(product.id, inCart.quantity + 1);
                                }}
                                aria-label={`Increase ${product.name}`}
                                className="w-9 h-9 flex items-center justify-center rounded-full text-white hover:bg-white/15 active:scale-90 cursor-pointer"
                              >
                                <Plus className="w-4 h-4 stroke-[3]" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAddToCart(product)}
                              disabled={isClosed}
                              className="w-10 h-10 rounded-full bg-[#ff2e74] hover:bg-[#e11d48] text-white shadow-md flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                              title="Add dish"
                              aria-label={`Add ${product.name}`}
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
                            {(product.originalPrice ?? 0) > product.price && (
                              <span className="text-[10px] text-gray-500 line-through">
                                ₹{product.originalPrice}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                  {hasMoreProducts && (
                    <div ref={loadMoreRef} className="col-span-2 flex justify-center py-4">
                      <button
                        onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                        className="text-xs font-bold text-[#e11d48] bg-rose-50 hover:bg-rose-100 px-5 py-2.5 rounded-full transition-colors cursor-pointer"
                      >
                        Show more dishes ({filteredProducts.length - visibleCount} left)
                      </button>
                    </div>
                  )}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* 2. HOTELS */}
            <section ref={hotelsRef}>
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <h2 className="text-gray-900 font-black text-base sm:text-lg tracking-tight leading-tight">
                Top hotels & restaurants
              </h2>
              <p className="text-xs text-gray-500 font-medium">Yellapur's most loved kitchens</p>
            </div>
            <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
              6 Locations
            </span>
          </div>

          {/* Horizontal Scroll of Rounded Hotel Boxes */}
          <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar py-1">
            {PARTNER_HOTELS.map((hotel) => {
              const liveOpen = isHotelOpen(hotel.id);
              return (
              <motion.div
                key={hotel.id}
                whileTap={{ scale: liveOpen ? 0.96 : 1 }}
                onClick={() => handleHotelClick(hotel)}
                role="button"
                tabIndex={0}
                aria-label={`${hotel.name}${liveOpen ? '' : ' (closed)'}`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleHotelClick(hotel); } }}
                className={`w-[130px] sm:w-[145px] rounded-2xl p-2.5 flex flex-col justify-between shrink-0 transition-all bg-white border ${
                  !liveOpen
                    ? 'border-gray-200 opacity-60 cursor-not-allowed grayscale'
                    : hotel.isOpen
                    ? 'border-gray-200 shadow-sm hover:shadow-md cursor-pointer'
                    : 'border-gray-200 hover:border-gray-300 shadow-sm cursor-pointer'
                }`}
              >
                {/* Hotel Photo Container (Empty Placeholder for Coming Soon hotels as requested) */}
                <div className="relative aspect-square rounded-xl overflow-hidden mb-2 bg-gray-50 flex items-center justify-center border border-gray-100">
                  {hotel.hasCustomPhoto && hotel.image ? (
                    <img
                      src={hotel.image}
                      alt={hotel.name}
                      loading="lazy"
                      decoding="async"
                      className={`w-full h-full ${hotel.id === 'mintoo' ? 'object-contain p-1.5' : 'object-cover'}`}
                    />
                  ) : (
                    /* Clean Empty Photo Box Placeholder */
                    <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center p-2 text-center">
                      <div className="w-8 h-8 rounded-full bg-white shadow-xs flex items-center justify-center mb-1 text-gray-400">
                        <Store className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-bold text-gray-400">Photo</span>
                    </div>
                  )}

                  {/* CLOSED overrides anything the hardcoded card claims. */}
                  <span className={`absolute top-1.5 right-1.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shadow-xs ${
                    !liveOpen
                      ? 'bg-red-500 text-white'
                      : hotel.isOpen
                      ? 'bg-emerald-500 text-white'
                      : hotel.id === 'mumtaz' || hotel.id === 'sankalpa'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {!liveOpen ? 'CLOSED' : hotel.isOpen ? 'OPEN' : hotel.id === 'mumtaz' || hotel.id === 'sankalpa' ? 'MENU' : 'SOON 🔒'}
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
                    {/* Status, not a delivery time: there is no real per-hotel
                        timing data, and the old "30-40 mins" was the same
                        made-up figure on every card. */}
                    <span className={`text-[10px] font-bold ${
                      !liveOpen ? 'text-gray-500' : 'text-emerald-600'
                    }`}>
                      {!liveOpen ? 'Closed now' : 'View menu'}
                    </span>
                    <span className="text-[10px] text-gray-500" aria-hidden="true">→</span>
                  </div>
                </div>
              </motion.div>
            );
            })}
          </div>
        </section>

        {/* 2b. MM CLEAN ENTRY. Deliberately drawn, not photographed: the home
            page should not pay for a cross-origin image for a section most
            visits scroll straight past. The page itself handles the
            coming-soon state, so this tile does not need to read Firestore. */}
        <section>
          <button
            onClick={() => navigate('/clean')}
            className="w-full flex items-center gap-3 text-left bg-gradient-to-r from-emerald-50 to-teal-50/60 border border-emerald-100 rounded-3xl p-3.5 active:scale-[0.99] transition-transform cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center text-2xl shrink-0">
              🧹
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-gray-900 font-black text-base tracking-tight">MM Clean</h2>
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  New
                </span>
              </div>
              <p className="text-xs text-gray-600 font-medium leading-snug mt-0.5">
                Home cleaning by verified pros · Pay after the service
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-emerald-600 shrink-0" />
          </button>
        </section>

        {/* 3. "WHAT'S ON YOUR MIND?" SECTION (CIRCULAR DISH PLATES LIKE USER'S REFERENCE) */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-gray-900 font-black text-base sm:text-lg tracking-tight">
              What's on your mind?
            </h2>
            {selectedMindCategory && (
              <button 
                onClick={() => setSelectedMindCategory(null)}
                className="text-xs font-bold text-[#e11d48] hover:underline"
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
                        ? 'border-[#e11d48] ring-3 ring-rose-600/20 scale-105 shadow-md' 
                        : 'border-gray-200 group-hover:border-rose-300 group-hover:scale-105'
                    }`}
                  >
                    <img
                      src={cat.image}
                      alt={cat.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover rounded-full transition-transform group-hover:scale-110"
                    />
                  </div>
                  <span className={`text-[11px] font-bold mt-1.5 tracking-tight text-center max-w-[70px] truncate transition-colors ${
                    isSelected ? 'text-[#e11d48] font-black' : 'text-gray-800'
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
                <h3 className="text-gray-900 font-black text-base sm:text-lg tracking-tight leading-tight">
                  Bestsellers under ₹149
                </h3>
                <span className="text-xs text-gray-500 font-medium block">
                  Great value dishes from our kitchens
                </span>
              </div>
            </div>

            {/* Horizontal Food Items Carousel */}
            <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar py-1">
              {bestsellersUnder149.slice(0, 10).map((product) => {
                const inCart = cartItems.find(i => i.id === product.id);

                return (
                  <div
                    key={product.id}
                    className="w-[155px] sm:w-[170px] bg-white rounded-2xl p-2.5 border border-gray-200 shadow-xs flex flex-col justify-between shrink-0 hover:shadow-md transition-shadow"
                  >
                    {/* Food Image Container with Floating Pink "+" */}
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50">
                      <DishImage
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />

                      {hotelBadgeOf(product) && (
                        <span className="absolute top-1.5 left-1.5 z-10 max-w-[62%] truncate bg-black/70 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-xs">
                          {hotelBadgeOf(product)}
                        </span>
                      )}

                      {/* Floating Pink Add Button or Stepper */}
                      <div className="absolute bottom-1.5 right-1.5 z-20">
                        {inCart ? (
                          <div className="bg-[#e11d48] text-white rounded-full flex items-center px-0.5 shadow-md">
                            <button
                              onClick={() => {
                                playSound(SOUNDS.QUANTITY_TICK);
                                updateQuantity(product.id, inCart.quantity - 1);
                              }}
                              aria-label={`Decrease ${product.name}`}
                              className="w-9 h-9 flex items-center justify-center rounded-full text-white hover:bg-white/15 active:scale-90 cursor-pointer"
                            >
                              <Minus className="w-4 h-4 stroke-[3]" />
                            </button>
                            <span className="min-w-[14px] text-center text-xs font-black">{inCart.quantity}</span>
                            <button
                              onClick={() => {
                                playSound(SOUNDS.QUANTITY_TICK);
                                updateQuantity(product.id, inCart.quantity + 1);
                              }}
                              aria-label={`Increase ${product.name}`}
                              className="w-9 h-9 flex items-center justify-center rounded-full text-white hover:bg-white/15 active:scale-90 cursor-pointer"
                            >
                              <Plus className="w-4 h-4 stroke-[3]" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddToCart(product)}
                            disabled={isClosed}
                            className="w-10 h-10 rounded-full bg-[#ff2e74] hover:bg-[#e11d48] text-white shadow-md flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                            title="Add dish"
                            aria-label={`Add ${product.name}`}
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
                          {(product.originalPrice ?? 0) > product.price && (
                            <span className="text-[10px] text-gray-500 line-through">
                              ₹{product.originalPrice}
                            </span>
                          )}
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
                {selectedMindCategory ? `${selectedMindCategory.replace('_', ' ').replace(/\w/g, (c) => c.toUpperCase())} dishes` : 'All dishes'}
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
                      ? 'bg-[#e11d48] text-white shadow-sm' 
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <MenuFilterChips
            priceSort={priceSort}
            onPriceSort={setPriceSort}
            priceCap={priceCap}
            onPriceCap={setPriceCap}
          />

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
                  setPriceSort('relevance');
                  setPriceCap(null);
                }}
                className="mt-3 text-xs font-bold text-[#e11d48] bg-rose-50 px-4 py-2 rounded-full"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3">
              {visibleProducts.map((product) => {
                const inCart = cartItems.find(i => i.id === product.id);

                return (
                  <div
                    key={product.id}
                    className="dish-card-cv bg-white rounded-2xl p-2.5 sm:p-3 border border-gray-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden text-left"
                  >
                    {/* Food Image with Floating Plus Button */}
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 mb-2">
                      <DishImage
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />

                      {hotelBadgeOf(product) && (
                        <span className="absolute top-1.5 left-1.5 z-10 max-w-[62%] truncate bg-black/70 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-xs">
                          {hotelBadgeOf(product)}
                        </span>
                      )}

                      {product.fires && product.fires >= 2 && (
                        <span className="absolute top-1.5 right-1.5 bg-rose-500 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5" /> Hot
                        </span>
                      )}

                      {/* Floating Pink Circular "+" / Stepper */}
                      <div className="absolute bottom-1.5 right-1.5 z-20">
                        {inCart ? (
                          <div className="bg-[#e11d48] text-white rounded-full flex items-center px-0.5 shadow-md">
                            <button
                              onClick={() => {
                                playSound(SOUNDS.QUANTITY_TICK);
                                updateQuantity(product.id, inCart.quantity - 1);
                              }}
                              aria-label={`Decrease ${product.name}`}
                              className="w-9 h-9 flex items-center justify-center rounded-full text-white hover:bg-white/15 active:scale-90 cursor-pointer"
                            >
                              <Minus className="w-4 h-4 stroke-[3]" />
                            </button>
                            <span className="min-w-[14px] text-center text-xs font-black">{inCart.quantity}</span>
                            <button
                              onClick={() => {
                                playSound(SOUNDS.QUANTITY_TICK);
                                updateQuantity(product.id, inCart.quantity + 1);
                              }}
                              aria-label={`Increase ${product.name}`}
                              className="w-9 h-9 flex items-center justify-center rounded-full text-white hover:bg-white/15 active:scale-90 cursor-pointer"
                            >
                              <Plus className="w-4 h-4 stroke-[3]" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddToCart(product)}
                            disabled={isClosed}
                            className="w-10 h-10 rounded-full bg-[#ff2e74] hover:bg-[#e11d48] text-white shadow-md flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                            title="Add dish"
                            aria-label={`Add ${product.name}`}
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
                        
                        {blurbOf(product) && (
                          <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                            {blurbOf(product)}
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
                            {(product.originalPrice ?? 0) > product.price && (
                              <span className="text-[10px] text-gray-500 line-through">
                                ₹{product.originalPrice}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
                {hasMoreProducts && (
                  <div ref={loadMoreRef} className="col-span-2 flex justify-center py-4">
                    <button
                      onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                      className="text-xs font-bold text-[#e11d48] bg-rose-50 hover:bg-rose-100 px-5 py-2.5 rounded-full transition-colors cursor-pointer"
                    >
                      Show more dishes ({filteredProducts.length - visibleCount} left)
                    </button>
                  </div>
                )}
            </div>
          )}
        </section>
        </>
        )}

        {/* Pexels Attribution */}
        <div className="pt-6 pb-8 text-center border-t border-gray-100">
          <p className="text-[11px] text-gray-500 font-medium">
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
                {/* Number 1: 9606001790 */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-50/70 to-pink-50/40 border border-rose-100 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Kitchen Support 1</span>
                    <span className="text-sm sm:text-base font-black text-gray-900">+91 9606001790</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a
                      href="tel:+919606001790"
                      className="p-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm flex items-center justify-center"
                      title="Call Now"
                      aria-label="Call Now"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    <a
                      href="https://wa.me/919606001790?text=Hi%2C%20I%20need%20help%20to%20order%20food%20from%20Mom%27s%20Magic!"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors shadow-sm flex items-center justify-center"
                      title="WhatsApp"
                      aria-label="WhatsApp"
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
                      className="p-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm flex items-center justify-center"
                      title="Call Now"
                      aria-label="Call Now"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    <a
                      href="https://wa.me/919483235488?text=Hi%2C%20I%20need%20help%20to%20order%20food%20from%20Mom%27s%20Magic!"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors shadow-sm flex items-center justify-center"
                      title="WhatsApp"
                      aria-label="WhatsApp"
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

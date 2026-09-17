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
  Utensils,
  Star,
  Plus,
  Minus,
  Sparkles,
  Leaf,
  ShoppingBag
} from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import toast from 'react-hot-toast';
import { playSound, SOUNDS } from '../utils/audio';
import { HOTEL_SANKALPA_MENU, SankalpaMenuItem } from '../data/hotelSankalpaMenu';
import { SANKALPA_FALLBACK_IMAGE } from '../data/sankalpaMenuImages';
import { useSEO } from '../utils/seo';

export default function HotelSankalpaMenuPage() {
  useSEO(
    'Hotel Sankalpa Menu - Pure Veg Heritage Feasts, Dosa, Thali & North Indian',
    'Order from Hotel Sankalpa: paneer and mushroom main course, veg starters, dosa, South Indian breakfast, tandoori breads, daal, rice, soups and thalis. 100% pure vegetarian.'
  );

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(HOTEL_SANKALPA_MENU[0].title);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const { items: cartItems, addItem, updateQuantity } = useCartStore();
  const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleAddToCart = (item: SankalpaMenuItem, categoryTitle: string) => {
    playSound(SOUNDS.ADD_TO_CART);
    const itemId = `sankalpa-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    addItem({
      id: itemId,
      hotelId: 'sankalpa',
      name: item.name,
      price: item.price,
      image: item.image || SANKALPA_FALLBACK_IMAGE,
      category: categoryTitle,
      type: 'food',
      isVeg: true,
      description: item.note || `Hotel Sankalpa ${item.name}`
    });
    toast.success(`${item.name} added! 🍽️`, {
      style: {
        background: '#FFFFFF',
        color: '#111827',
        border: '1px solid rgba(5, 150, 105, 0.2)',
        borderRadius: '16px',
        padding: '12px 20px',
        fontWeight: '700',
        boxShadow: '0 8px 30px rgba(0,0,0,0.1)'
      },
      icon: '🌿'
    });
  };

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToCategory = (title: string) => {
    setActiveCategory(title);
    const target = sectionRefs.current[title];
    if (target) {
      const topOffset = 130;
      const elementPosition = target.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredMenu = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return HOTEL_SANKALPA_MENU.map((category) => {
      const filteredItems = category.items.filter((item) => {
        if (!query) return true;
        const matchName = item.name.toLowerCase().includes(query);
        const matchCat = category.title.toLowerCase().includes(query);
        return matchName || matchCat;
      });

      return { ...category, items: filteredItems };
    }).filter((cat) => cat.items.length > 0);
  }, [searchQuery]);

  const totalItemsCount = useMemo(
    () => HOTEL_SANKALPA_MENU.reduce((sum, c) => sum + c.items.length, 0),
    []
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32">
      {/* 1. TOP STICKY APP BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-full hover:bg-emerald-50 active:scale-95 transition-all text-gray-800"
              aria-label="Back to home"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="truncate">
              <h1 className="text-base font-black text-gray-900 truncate tracking-tight">Hotel Sankalpa</h1>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                <MapPin className="w-3 h-3 text-emerald-600" />
                <span>Yellapur • Pure Veg Heritage Feasts</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Clock className="w-3 h-3" /> 20-25 mins
            </span>
            <button
              onClick={() => navigate('/checkout')}
              className="relative p-2.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all"
              aria-label="View Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-scale">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO BANNER */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <div className="relative rounded-3xl overflow-hidden shadow-lg border border-emerald-100 bg-white">
          <div className="relative h-44 sm:h-56 w-full overflow-hidden">
            <img
              src="/hotel_sankalpa.jpg"
              alt="Hotel Sankalpa Restaurant"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

            <div className="absolute bottom-3 left-4 right-4 text-white">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600/90 text-[11px] font-bold tracking-wide uppercase shadow-xs mb-1">
                <Sparkles className="w-3 h-3 text-amber-300" /> Official Menu
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
                Hotel Sankalpa
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 font-medium">
                Pure Veg Heritage Feasts • Yellapur
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-gradient-to-r from-emerald-50/70 via-white to-emerald-50/70 flex items-center justify-between text-xs font-semibold text-gray-700">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> 4.6 (240+ ratings)
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-600">Full Menu</span>
            </div>
            <span className="font-bold text-emerald-700">{totalItemsCount} dishes</span>
          </div>
        </div>
      </div>

      {/* 3. SEARCH + PURE VEG BADGE */}
      <div className="max-w-4xl mx-auto px-4 mt-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Sankalpa dishes (e.g. Paneer, Dosa, Thali, Daal...)"
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-emerald-100 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Every item here is vegetarian, so a diet filter would be redundant */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
            <Leaf className="w-3.5 h-3.5" /> 100% Pure Vegetarian
          </span>
          <span className="text-[11px] font-semibold text-gray-500">
            Every dish on this menu is veg
          </span>
        </div>
      </div>

      {/* 4. HORIZONTAL STICKY CATEGORY NAV */}
      <div className="sticky top-[57px] z-30 bg-[#f8fafc]/95 backdrop-blur-md py-2 border-b border-emerald-100/60 mt-3">
        <div className="max-w-4xl mx-auto px-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {HOTEL_SANKALPA_MENU.map((cat) => {
            const isActive = activeCategory === cat.title;
            return (
              <button
                key={cat.title}
                onClick={() => scrollToCategory(cat.title)}
                className={`px-3 py-1.5 rounded-2xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm scale-102'
                    : 'bg-white text-gray-700 border border-emerald-100 hover:bg-emerald-50'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.title}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {cat.items.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. MENU SECTIONS */}
      <div className="max-w-4xl mx-auto px-4 mt-4 space-y-6">
        {filteredMenu.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-emerald-100 p-8 shadow-xs">
            <Utensils className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-bold text-gray-800">No matching dishes found</p>
            <p className="text-xs text-gray-500 mt-1">Try a different search term.</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
            >
              Reset Search
            </button>
          </div>
        ) : (
          filteredMenu.map((category) => (
            <section
              key={category.title}
              ref={(el) => {
                sectionRefs.current[category.title] = el;
              }}
              className="scroll-mt-36"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                  <span>{category.icon}</span>
                  <span>{category.title}</span>
                  <span className="text-xs font-bold text-gray-400">({category.items.length})</span>
                </h3>
              </div>

              {/* Dish Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {category.items.map((item) => {
                  const itemId = `sankalpa-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                  const inCart = cartItems.find((ci) => ci.id === itemId);
                  const qty = inCart?.quantity || 0;
                  const dishImage = item.image || SANKALPA_FALLBACK_IMAGE;

                  return (
                    <div
                      key={item.name}
                      className="bg-white rounded-2xl p-3.5 border border-emerald-100/80 shadow-xs hover:shadow-md transition-all flex gap-3.5 relative overflow-hidden"
                    >
                      {/* Dish Details */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="w-3.5 h-3.5 rounded-xs flex items-center justify-center border border-emerald-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              Veg
                            </span>
                          </div>

                          <h4 className="text-sm sm:text-base font-black text-gray-900 leading-snug">
                            {item.name}
                          </h4>

                          {item.note && (
                            <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 font-medium leading-tight">
                              {item.note}
                            </p>
                          )}
                        </div>

                        <div className="mt-2.5 flex items-baseline gap-2">
                          <span className="text-base font-black text-gray-900">₹{item.price}</span>
                        </div>
                      </div>

                      {/* Dish Image + Add Button */}
                      <div className="relative w-28 h-28 shrink-0 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100">
                        <img
                          src={dishImage}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                          width={800}
                          height={600}
                          onError={(e) => {
                            // Never show a broken image icon
                            if (e.currentTarget.src !== window.location.origin + SANKALPA_FALLBACK_IMAGE) {
                              e.currentTarget.src = SANKALPA_FALLBACK_IMAGE;
                            }
                          }}
                        />

                        {/* Add to Cart Overlay Button */}
                        <div className="absolute bottom-1.5 left-2 right-2">
                          {qty === 0 ? (
                            <button
                              onClick={() => handleAddToCart(item, category.title)}
                              className="w-full py-1.5 bg-white/95 backdrop-blur-xs text-emerald-700 border border-emerald-600/40 rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-emerald-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-1"
                              aria-label={`Add ${item.name} to cart`}
                            >
                              <Plus className="w-3.5 h-3.5" /> ADD
                            </button>
                          ) : (
                            <div className="w-full py-1 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-between px-2">
                              <button
                                onClick={() => {
                                  playSound(SOUNDS.CLICK);
                                  updateQuantity(itemId, qty - 1);
                                }}
                                className="p-0.5 hover:bg-white/20 rounded active:scale-90"
                                aria-label={`Remove one ${item.name}`}
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-black">{qty}</span>
                              <button
                                onClick={() => {
                                  playSound(SOUNDS.CLICK);
                                  updateQuantity(itemId, qty + 1);
                                }}
                                className="p-0.5 hover:bg-white/20 rounded active:scale-90"
                                aria-label={`Add one more ${item.name}`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {/* 6. FLOATING CART BAR */}
      <AnimatePresence>
        {cartItemCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto"
          >
            <button
              onClick={() => navigate('/checkout')}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-700 to-green-700 text-white shadow-xl flex items-center justify-between active:scale-98 transition-transform"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-sm">
                  {cartItemCount}
                </span>
                <div className="text-left">
                  <div className="text-xs font-bold leading-none">View Cart</div>
                  <div className="text-sm font-black">₹{cartTotal}</div>
                </div>
              </div>
              <span className="text-sm font-black">Checkout →</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. SCROLL TO TOP */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className={`fixed right-4 z-30 p-3 rounded-full bg-white text-emerald-700 border border-emerald-200 shadow-lg active:scale-95 ${
              cartItemCount > 0 ? 'bottom-24' : 'bottom-6'
            }`}
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Plus, RotateCcw, Search, Shirt, ShoppingBag, Zap, X } from 'lucide-react';
import MenswearPrice from './MenswearPrice';
import MenswearSizeSheet from './MenswearSizeSheet';
import { useCartStore } from '../store/cartStore';
import { useMenswearCatalog } from '../store/menswearStore';
import { useLocationStore } from '../store/locationStore';
import { useSEO } from '../utils/seo';
import { isInYellapur } from '../lib/yellapur';
import {
  MENSWEAR_CATEGORIES,
  MENSWEAR_SHOP_NAME,
  MenswearCategory,
  MenswearProduct,
} from '../data/mensWear';

type Sort = 'popular' | 'low' | 'high';

/**
 * Mintoo Men's Wear: the shop's catalogue, laid out like a fashion app
 * (two-column grid, category chips, sort). Yellapur only; elsewhere it says so
 * instead of listing clothes that cannot be delivered.
 */
export default function MenswearPage() {
  useSEO(`${MENSWEAR_SHOP_NAME} - 10 minute delivery in Yellapur`, "Shirts, jeans, hoodies and more from Mintoo Men's Wear. 10-minute delivery in Yellapur, 2-day returns.");
  const navigate = useNavigate();
  const deliveryLocation = useLocationStore((s) => s.deliveryLocation);
  const openLocationPicker = useLocationStore((s) => s.openLocationPicker);
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const [category, setCategory] = useState<MenswearCategory | 'All'>('All');
  const [sort, setSort] = useState<Sort>('low');
  const [query, setQuery] = useState('');
  const [picking, setPicking] = useState<MenswearProduct | null>(null);
  const { products: catalog, allSoldOut, minPrice } = useMenswearCatalog();

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = catalog.filter(
      (p) => (category === 'All' || p.category === category) && (!q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
    );
    if (sort === 'low') return [...list].sort((a, b) => a.price - b.price);
    if (sort === 'high') return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [catalog, category, sort, query]);

  const inYellapur = isInYellapur(deliveryLocation);

  return (
    <div className="min-h-screen bg-[#f6f6f7] pb-36">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-3 md:px-6 py-2.5 flex items-center gap-2">
          <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-gray-100 cursor-pointer" aria-label="Back to home">
            <ChevronLeft className="w-6 h-6 text-gray-800" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black text-gray-900 truncate">{MENSWEAR_SHOP_NAME}</h1>
            <button onClick={openLocationPicker} className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 max-w-full cursor-pointer">
              <MapPin className="w-3 h-3 text-[#e11d48] shrink-0" />
              <span className="truncate">{deliveryLocation?.address || 'Choose delivery location'}</span>
            </button>
          </div>
          <button onClick={() => navigate('/checkout')} className="relative p-2.5 rounded-full bg-rose-50 text-[#e11d48] cursor-pointer" aria-label="View cart">
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#e11d48] text-white text-[10px] font-black flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 md:px-6 pt-3 md:pt-5 space-y-3 md:space-y-4">
        <section className="rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 text-white p-4 md:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-200">New in Yellapur</p>
          <h2 className="text-xl md:text-3xl font-black leading-tight mt-1">Fresh styles at your door in 10 minutes</h2>
          <p className="text-xs text-gray-300 mt-1">Shirts, jeans, hoodies and jackets from ₹{minPrice}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-[11px] font-bold">
              <Zap className="w-3.5 h-3.5 text-amber-300" /> 10-min delivery
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-[11px] font-bold">
              <RotateCcw className="w-3.5 h-3.5 text-emerald-300" /> 2-day returns
            </span>
          </div>
        </section>

        {!inYellapur ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-6 text-center space-y-3">
            <MapPin className="w-10 h-10 text-[#e11d48] mx-auto" />
            <h2 className="text-lg font-black text-gray-900">Only in Yellapur for now</h2>
            <p className="text-xs text-gray-500">
              Men's wear is delivered in 10 minutes inside Yellapur town. Set your delivery location in Yellapur to shop.
            </p>
            <button onClick={openLocationPicker} className="px-5 py-3 rounded-2xl bg-[#e11d48] text-white font-bold text-sm cursor-pointer">
              Change location
            </button>
          </div>
        ) : (
          <>
            <div className="relative md:max-w-xl">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search shirts, jeans, hoodies..."
                className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-10 py-3 text-sm outline-none focus:border-[#e11d48]"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 cursor-pointer" aria-label="Clear search">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-3 px-3">
              {(['All', ...MENSWEAR_CATEGORIES] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold border cursor-pointer ${
                    category === c ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500">
                {products.length} {products.length === 1 ? 'item' : 'items'} · from ₹{minPrice}
              </p>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="text-xs font-bold bg-white border border-gray-200 rounded-xl px-2.5 py-1.5"
                aria-label="Sort"
              >
                <option value="popular">Sort: Popular</option>
                <option value="low">Price: Low to High</option>
                <option value="high">Price: High to Low</option>
              </select>
            </div>

            {products.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-10">Nothing matches "{query}".</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 md:gap-4">
                {products.map((p) => (
                  <div key={p.slug} className="bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col md:hover:shadow-lg md:hover:-translate-y-0.5 transition-all">
                    <button onClick={() => navigate(`/menswear/${p.slug}`)} className="text-left cursor-pointer flex-1" aria-label={`View ${p.name}`}>
                      <div className="relative aspect-[3/4] bg-rose-50/60 overflow-hidden">
                        <Shirt className="absolute inset-0 m-auto w-10 h-10 text-rose-200 animate-pulse" />
                        <img src={p.images[0]} alt={p.name} loading="lazy" className="relative w-full h-full object-cover md:hover:scale-105 transition-transform duration-300" />
                      </div>
                      <div className="p-2.5 md:p-3 pb-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{p.category}</p>
                        <h3 className="text-xs md:text-sm font-bold text-gray-900 leading-snug line-clamp-2 mt-0.5">{p.name}</h3>
                        <div className="mt-1"><MenswearPrice price={p.price} /></div>
                        <p className="text-[10px] font-semibold text-emerald-700 mt-0.5">2-day return</p>
                      </div>
                    </button>
                    <div className="p-2.5 md:p-3 pt-1.5">
                      {allSoldOut(p) ? (
                        <p className="w-full text-center py-2 rounded-xl bg-gray-100 text-gray-500 text-xs font-black">Sold out</p>
                      ) : (
                        <button
                          onClick={() => setPicking(p)}
                          className="w-full flex items-center justify-center gap-1 py-2 rounded-xl border-2 border-[#e11d48] text-[#e11d48] text-xs font-black hover:bg-rose-50 active:scale-95 transition-transform cursor-pointer"
                        >
                          ADD <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      {picking && <MenswearSizeSheet product={picking} onClose={() => setPicking(null)} />}
    </div>
  );
}

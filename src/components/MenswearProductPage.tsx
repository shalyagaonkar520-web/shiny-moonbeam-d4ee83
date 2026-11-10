import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banknote, ChevronLeft, RotateCcw, Shirt, ShoppingBag, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '../store/cartStore';
import { useLocationStore } from '../store/locationStore';
import { useSEO } from '../utils/seo';
import { isInYellapur } from '../lib/yellapur';
import {
  MENSWEAR_PRODUCTS,
  MENSWEAR_SHOP_ID,
  MENSWEAR_SHOP_NAME,
  MenswearSize,
  findMenswearProduct,
  menswearItemId,
} from '../data/mensWear';

/** One product: photo gallery, size, and add to the same cart as food. */
export default function MenswearProductPage() {
  const { slug } = useParams();
  const product = findMenswearProduct(slug);
  useSEO(product ? `${product.name} - ${MENSWEAR_SHOP_NAME}` : MENSWEAR_SHOP_NAME, `${product?.name || 'Men\'s wear'} with 10-minute delivery in Yellapur and 2-day returns.`);
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const deliveryLocation = useLocationStore((s) => s.deliveryLocation);
  const openLocationPicker = useLocationStore((s) => s.openLocationPicker);
  const [size, setSize] = useState<MenswearSize | null>(null);
  const [photo, setPhoto] = useState(0);
  const gallery = useRef<HTMLDivElement>(null);

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-gray-600">This item is no longer listed.</p>
        <button onClick={() => navigate('/menswear')} className="px-5 py-3 rounded-2xl bg-[#e11d48] text-white font-bold text-sm cursor-pointer">
          Browse men's wear
        </button>
      </div>
    );
  }

  const inYellapur = isInYellapur(deliveryLocation);
  const similar = MENSWEAR_PRODUCTS.filter((p) => p.category === product.category && p.slug !== product.slug).slice(0, 6);

  const add = (goToCart: boolean) => {
    if (!inYellapur) {
      toast.error("Men's wear is delivered only in Yellapur. Change your location to order.");
      openLocationPicker();
      return;
    }
    if (!size) {
      toast.error('Please select a size');
      return;
    }
    addItem({
      id: menswearItemId(product.slug, size),
      hotelId: MENSWEAR_SHOP_ID,
      name: `${product.name} (Size ${size})`,
      price: product.price,
      image: product.images[0],
      category: product.category,
      type: 'fashion',
      description: `${MENSWEAR_SHOP_NAME} ${product.name}, size ${size}`,
    });
    if (goToCart) navigate('/checkout');
    else toast.success(`${product.name} (${size}) added to cart`);
  };

  const onScroll = () => {
    const el = gallery.current;
    if (el) setPhoto(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="min-h-screen bg-[#f6f6f7] pb-44">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-3 py-2.5 flex items-center gap-2">
          <button onClick={() => navigate('/menswear')} className="p-2 rounded-full hover:bg-gray-100 cursor-pointer" aria-label="Back to men's wear">
            <ChevronLeft className="w-6 h-6 text-gray-800" />
          </button>
          <p className="flex-1 text-sm font-black text-gray-900 truncate">{MENSWEAR_SHOP_NAME}</p>
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

      <main className="max-w-3xl mx-auto">
        <div className="bg-white">
          <div ref={gallery} onScroll={onScroll} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar">
            {product.images.map((src, i) => (
              <div key={src} className="relative w-full shrink-0 snap-center aspect-[3/4] bg-rose-50/60">
                <Shirt className="absolute inset-0 m-auto w-14 h-14 text-rose-200 animate-pulse" />
                <img src={src} alt={`${product.name}, photo ${i + 1}`} className="relative w-full h-full object-cover" />
              </div>
            ))}
          </div>
          {product.images.length > 1 && (
            <div className="flex justify-center gap-1.5 py-2.5">
              {product.images.map((src, i) => (
                <span key={src} className={`h-1.5 rounded-full transition-all ${i === photo ? 'w-5 bg-[#e11d48]' : 'w-1.5 bg-gray-300'}`} />
              ))}
            </div>
          )}
        </div>

        <section className="bg-white mt-2 px-4 py-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{product.category}</p>
          <h1 className="text-lg font-black text-gray-900 leading-snug mt-0.5">{product.name}</h1>
          <p className="text-2xl font-black text-gray-900 mt-2">₹{product.price}</p>
          <p className="text-[11px] text-gray-500">Inclusive of all taxes</p>
        </section>

        <section className="bg-white mt-2 px-4 py-4">
          <p className="text-sm font-black text-gray-900 mb-2.5">{/^\d/.test(product.sizes[0]) ? 'Select waist size' : 'Select size'}</p>
          <div className="flex gap-2 flex-wrap">
            {product.sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`min-w-[52px] h-11 px-3 rounded-xl border text-sm font-bold cursor-pointer ${
                  size === s ? 'border-[#e11d48] bg-rose-50 text-[#e11d48]' : 'border-gray-300 text-gray-800'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white mt-2 px-4 py-2 divide-y divide-gray-100">
          <div className="flex items-center gap-3 py-3">
            <Zap className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-gray-900">Delivery in 10 minutes</p>
              <p className="text-xs text-gray-500">{inYellapur ? 'To your address in Yellapur' : 'Only for addresses in Yellapur'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-3">
            <RotateCcw className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-gray-900">2-day return</p>
              <p className="text-xs text-gray-500">Return it unworn with tags within 2 days of delivery</p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-3">
            <Banknote className="w-5 h-5 text-gray-700 shrink-0" />
            <div>
              <p className="text-sm font-bold text-gray-900">Cash on delivery available</p>
              <p className="text-xs text-gray-500">Or pay online with UPI or card</p>
            </div>
          </div>
        </section>

        {similar.length > 0 && (
          <section className="mt-2 px-3 py-4 bg-white">
            <p className="text-sm font-black text-gray-900 mb-2.5 px-1">More {product.category.toLowerCase()}</p>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
              {similar.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => { setSize(null); setPhoto(0); gallery.current?.scrollTo({ left: 0 }); navigate(`/menswear/${p.slug}`); window.scrollTo({ top: 0 }); }}
                  className="w-32 shrink-0 text-left cursor-pointer"
                >
                  <div className="relative w-32 aspect-[3/4] rounded-xl overflow-hidden bg-rose-50/60">
                    <Shirt className="absolute inset-0 m-auto w-8 h-8 text-rose-200 animate-pulse" />
                    <img src={p.images[0]} alt={p.name} loading="lazy" className="relative w-full h-full object-cover" />
                  </div>
                  <p className="text-[11px] font-bold text-gray-900 line-clamp-2 mt-1">{p.name}</p>
                  <p className="text-xs font-black text-gray-900">₹{p.price}</p>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom,0px))] md:bottom-0 left-0 right-0 z-[96] bg-white border-t border-gray-100 p-3">
        <div className="max-w-3xl mx-auto grid grid-cols-2 gap-2.5">
          <button onClick={() => add(false)} className="py-3.5 rounded-xl border-2 border-gray-900 text-gray-900 font-black text-sm cursor-pointer active:scale-95 transition-transform">
            Add to cart
          </button>
          <button onClick={() => add(true)} className="py-3.5 rounded-xl bg-[#e11d48] text-white font-black text-sm cursor-pointer active:scale-95 transition-transform">
            Buy now
          </button>
        </div>
      </div>
    </div>
  );
}

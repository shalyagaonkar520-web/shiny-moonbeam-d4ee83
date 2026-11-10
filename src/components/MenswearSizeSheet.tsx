import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { MenswearProduct } from '../data/mensWear';
import { useAddMenswear } from '../lib/useAddMenswear';
import { useMenswearCatalog } from '../store/menswearStore';
import MenswearPrice from './MenswearPrice';
import SizeScratch from './SizeScratch';

/**
 * Size picker opened by a card's ADD button: a bottom sheet on phones, a
 * centred dialog on laptops. Add to cart keeps shopping; Order now checks out.
 */
export default function MenswearSizeSheet({ product, onClose }: { product: MenswearProduct; onClose: () => void }) {
  const { isSoldOut } = useMenswearCatalog();
  const [size, setSize] = useState<string | null>(product.sizes.length === 1 && !isSoldOut(product, product.sizes[0]) ? product.sizes[0] : null);
  const add = useAddMenswear();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const go = (orderNow: boolean) => {
    if (add(product, size, orderNow)) onClose();
  };

  // Portalled to <body>: inside the page's transition layer the bottom nav
  // would sit on top of the sheet and swallow taps on its buttons.
  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label={`Choose a size for ${product.name}`}>
      <button className="absolute inset-0 bg-black/45 cursor-default" onClick={onClose} aria-label="Close" />
      <div className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] md:pb-4 shadow-2xl">
        <div className="flex gap-3">
          <img src={product.images[0]} alt="" className="w-16 h-20 rounded-xl object-cover bg-gray-100 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-gray-900 leading-snug">{product.name}</p>
            <div className="mt-1"><MenswearPrice price={product.price} /></div>
          </div>
          <button onClick={onClose} className="p-1.5 h-fit rounded-full hover:bg-gray-100 cursor-pointer" aria-label="Close">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <p className="text-sm font-black text-gray-900 mt-4 mb-2">{/^\d/.test(product.sizes[0]) ? 'Select waist size' : 'Select size'}</p>
        <div className="flex gap-2 flex-wrap">
          {product.sizes.map((s) => {
            const out = isSoldOut(product, s);
            return (
              <button
                key={s}
                disabled={out}
                onClick={() => setSize(s)}
                className={`min-w-[52px] h-11 px-3 rounded-xl border text-sm font-bold ${
                  out
                    ? 'relative overflow-hidden border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed'
                    : size === s
                      ? 'border-[#e11d48] bg-rose-50 text-[#e11d48] cursor-pointer'
                      : 'border-gray-300 text-gray-800 hover:border-gray-500 cursor-pointer'
                }`}
                aria-label={out ? `Size ${s}, sold out` : `Size ${s}`}
              >
                {s}
                {out && <SizeScratch />}
              </button>
            );
          })}
        </div>
        {product.sizes.some((s) => isSoldOut(product, s)) && (
          <p className="text-[11px] font-semibold text-gray-500 mt-2">Crossed-out sizes are sold out</p>
        )}
        <div className="grid grid-cols-2 gap-2.5 mt-5">
          <button onClick={() => go(false)} className="py-3.5 rounded-xl border-2 border-gray-900 text-gray-900 font-black text-sm cursor-pointer active:scale-95 transition-transform">
            Add to cart
          </button>
          <button onClick={() => go(true)} className="py-3.5 rounded-xl bg-[#e11d48] text-white font-black text-sm cursor-pointer active:scale-95 transition-transform">
            Order now
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

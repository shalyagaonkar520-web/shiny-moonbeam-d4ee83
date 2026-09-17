import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Sparkles, ShoppingBag } from 'lucide-react';
import { Product } from '../types';
import { RecommendationResult, recordComboClick } from '../utils/recommendationEngine';
import { useCartStore } from '../store/cartStore';
import toast from 'react-hot-toast';
import DishImage from './DishImage';

interface Props {
  result: RecommendationResult | null;
  triggerId: string;
  onClose: () => void;
}

export default function RecommendationPopup({ result, triggerId, onClose }: Props) {
  const { addItem, items } = useCartStore();

  // Auto-close after 10 seconds
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(onClose, 10000);
    return () => clearTimeout(t);
  }, [result, onClose]);

  if (!result) return null;

  const handleAdd = (product: Product) => {
    addItem(product);
    recordComboClick(triggerId, product.id!);
    toast.success(`${product.name} added!`, {
      style: { background: '#161A22', color: '#fff', border: '1px solid #FF4D00' },
      icon: '✅',
      duration: 1500,
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        key="rec-popup"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 240 }}
        /* sits just above the bottom cart bar (bottom-[110px] on mobile matches BottomCartBar) */
        className="fixed bottom-[178px] md:bottom-[90px] left-3 right-3 md:left-1/2 md:-translate-x-1/2 md:max-w-xl z-[115]"
      >
        <div
          className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.7)]"
          style={{ background: 'rgba(14,16,22,0.97)', backdropFilter: 'blur(20px)' }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none">{result.emoji}</span>
              <div>
                <div className="flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-gold" />
                  <span className="text-[8px] font-black uppercase tracking-[2px] text-gold">AI Pick</span>
                </div>
                <p className="text-[10px] font-black text-white leading-tight">{result.title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors shrink-0"
            >
              <X className="w-3 h-3 text-white/60" />
            </button>
          </div>

          {/* Trigger message */}
          {result.triggerMessage && (
            <div className="px-3 py-1.5 bg-brand/10 border-b border-brand/20">
              <p className="text-[9px] font-black text-brand">{result.triggerMessage}</p>
            </div>
          )}

          {/* Horizontal item strip */}
          <div className="flex gap-2 px-3 py-2.5 overflow-x-auto no-scrollbar">
            {result.items.map((item) => {
              const inCart = items.some(i => i.id === item.id);
              return (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleAdd(item)}
                  className="flex items-center gap-2 shrink-0 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand/40 rounded-xl px-2.5 py-1.5 transition-all group"
                >
                  {/* Small image */}
                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-black/40">
                    <DishImage
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>

                  {/* Name + price */}
                  <div className="text-left min-w-0">
                    <p className="text-[9px] font-black text-white uppercase tracking-tight leading-tight truncate max-w-[72px]">
                      {item.name}
                    </p>
                    <p className="text-[9px] font-black text-gold">₹{item.price}</p>
                  </div>

                  {/* Add / in-cart icon */}
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    inCart ? 'bg-emerald-500' : 'bg-brand'
                  }`}>
                    {inCart
                      ? <ShoppingBag className="w-2.5 h-2.5 text-white" />
                      : <Plus className="w-2.5 h-2.5 text-white" />
                    }
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/5">
            <p className="text-[8px] text-white/25 font-bold uppercase tracking-widest">🤖 Moms Magic AI</p>
            <button onClick={onClose} className="text-[9px] font-black text-brand/70 hover:text-brand uppercase tracking-widest">
              Dismiss
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

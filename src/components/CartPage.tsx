import React, { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2, ShoppingBag, Truck, Sparkles, Zap, ShieldCheck, ChevronLeft, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getFakeOriginalPrice } from '../data/menuItems';
import { useLocationStore } from '../store/locationStore';
import { calculateDeliveryCharge } from '../types';
import { useSystemStore } from '../store/systemStore';
import toast from 'react-hot-toast';
import { useSEO } from '../utils/seo';

export default function CartPage() {
  useSEO("Your Cart", "Review your selected items, apply promo codes, and complete your order details at Moms Magic.");
  const { items, updateQuantity, removeItem, total } = useCartStore();
  const navigate = useNavigate();
  const { deliveryLocation } = useLocationStore();
  const settings = useSystemStore(state => state.settings);
  const distanceKm = deliveryLocation?.distance ?? 0;
  const deliveryCharge = calculateDeliveryCharge(distanceKm);
  const rainySeasonFee = 5;
  const grandTotal = total + deliveryCharge + rainySeasonFee;
  
  const adminToken = localStorage.getItem('moms_magic_admin_token');
  const userPhone = localStorage.getItem('moms_magic_user_phone');
  const isAdmin = adminToken === 'mock-jwt-admin-token-123456' || 
                  userPhone === '+917483187572' || 
                  userPhone === '+919606001790' || 
                  userPhone === '7483187572' || 
                  userPhone === '9606001790';

  // Time lock and ordering restrictions removed - always open
  const isOrderingPaused = false;

  if (items.length === 0) {
    return (
      <div className="relative min-h-screen bg-matte-black flex flex-col items-center justify-center p-6 text-center space-y-12">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-brand/5 blur-[150px] rounded-full animate-pulse" />
        </div>

        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 w-64 h-64 rounded-[60px] luxury-card flex items-center justify-center border-gold/20 shadow-2xl"
        >
          <ShoppingBag className="w-24 h-24 text-gold/5" />
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-2 border-gold/10 border-dashed rounded-[60px]"
          />
        </motion.div>

        <div className="relative z-10 space-y-4">
          <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase text-white leading-none">Your Plate is <br/><span className="text-luxury-gold">Empty</span></h2>
          <p className="text-text-muted text-xs font-bold uppercase tracking-[4px] max-w-xs mx-auto">Explore our elite menu and begin your journey.</p>
        </div>

        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/food')}
          className="relative z-10 btn-luxury-gold px-14"
        >
          ORDER FOOD
        </motion.button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-matte-black pt-28 pb-48">
      <div className="max-w-[1400px] mx-auto px-6 space-y-16 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="space-y-6">
            <motion.button 
              whileHover={{ x: -5 }}
              onClick={() => navigate('/food')}
              className="flex items-center gap-3 text-text-muted font-black uppercase tracking-[3px] text-[10px] hover:text-gold transition-colors"
            >
              <ChevronLeft className="w-5 h-5" /> Back to Selection
            </motion.button>
            <h1 className="text-6xl md:text-9xl font-black italic tracking-tighter uppercase text-white leading-none">
              Review <br/><span className="text-luxury-gold">Cravings</span>
            </h1>
          </div>
          
          <div className="luxury-card p-8 rounded-[40px] border-gold/20 flex items-center gap-6">
             <div className="w-16 h-16 rounded-3xl bg-gold/10 flex items-center justify-center border border-gold/20">
                <Sparkles className="w-8 h-8 text-gold" />
             </div>
             <div>
                <p className="text-text-muted text-[10px] font-black uppercase tracking-[4px]">Elite Bag Value</p>
                <p className="text-white text-3xl font-black italic tracking-tighter text-luxury-gold">₹{total}</p>
             </div>
          </div>
        </div>

        {/* Cart Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2 space-y-8">
            <AnimatePresence mode="popLayout">
              {items.map((item, idx) => {
                const fakePrice = getFakeOriginalPrice(item.price, item.originalPrice);
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    transition={{ delay: idx * 0.1 }}
                    className="relative group luxury-card rounded-[50px] p-8 flex flex-col md:flex-row items-center gap-10 border-white/5 hover:border-gold/30"
                  >
                    {item.image && (
                    <div className="w-40 h-40 rounded-[40px] overflow-hidden border border-white/10 shadow-2xl relative shrink-0 group-hover:scale-105 transition-transform duration-700">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-gradient-to-t from-matte-black via-transparent to-transparent opacity-80" />
                    </div>
                    )}

                    <div className="flex-1 space-y-6 text-center md:text-left min-w-0">
                      <div>
                        <span className="text-gold/40 text-[10px] font-black uppercase tracking-[4px]">{item.category}</span>
                        <h3 className="text-3xl font-black italic tracking-tighter uppercase text-white truncate drop-shadow-sm">{item.name}</h3>

                        {item.items && item.items.length > 0 && (
                          <ul className="mt-3 space-y-1.5 text-left inline-block md:block">
                            {item.items.map((subItem, sIdx) => (
                              <li key={sIdx} className="text-white/60 text-xs font-semibold flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 shadow-[0_0_8px_rgba(244,180,0,0.4)]" />
                                {subItem}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-10">
                        <div className="flex items-center gap-5 bg-white/5 p-2 rounded-2xl border border-white/10 h-16">
                          <button 
                            onClick={() => updateQuantity(item.id!, item.quantity - 1)}
                            className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-gold/20 transition-all"
                          >
                            <Minus className="w-5 h-5 text-gold" />
                          </button>
                          <span className="text-2xl font-black italic min-w-[35px] text-center text-white">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id!, item.quantity + 1)}
                            className="w-12 h-12 rounded-xl bg-gold flex items-center justify-center shadow-xl shadow-gold/30"
                          >
                            <Plus className="w-5 h-5 text-matte-black" />
                          </button>
                        </div>

                        <button 
                          onClick={() => removeItem(item.id!)}
                          className="flex items-center gap-3 text-text-muted hover:text-brand transition-all font-black text-[10px] uppercase tracking-[4px] opacity-40 hover:opacity-100"
                        >
                          <Trash2 className="w-5 h-5" /> Remove
                        </button>
                      </div>
                    </div>

                    <div className="text-center md:text-right space-y-2">
                        <p className="text-5xl font-black italic text-gold drop-shadow-lg">₹{item.price * item.quantity}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="space-y-10">
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              className="luxury-card rounded-[60px] p-12 border-gold/10 sticky top-32 space-y-12"
            >
              <div className="space-y-3">
                <h3 className="text-4xl font-black italic tracking-tighter uppercase text-white leading-none">Order <br/><span className="text-luxury-gold">Summary</span></h3>
                <p className="text-text-muted text-[10px] font-bold uppercase tracking-[5px] opacity-40">Elite Transaction Portal</p>
              </div>

              <div className="space-y-8">
                <div className="flex justify-between items-center text-text-muted font-bold uppercase text-[11px] tracking-widest">
                  <span>Subtotal</span>
                  <span className="text-white text-2xl font-black italic tracking-tighter">₹{total}</span>
                </div>
                <div className="flex justify-between items-center text-text-muted font-bold uppercase text-[11px] tracking-widest">
                  <span>Tax ({settings.taxRate ?? 5}%)</span>
                  <span className="text-white text-2xl font-black italic tracking-tighter">₹{((total * (settings.taxRate ?? 5)) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-text-muted font-bold uppercase text-[11px] tracking-widest">
                  <span>Rainy Season Fee</span>
                  <span className="text-white text-2xl font-black italic tracking-tighter">₹{rainySeasonFee}</span>
                </div>
                <div className="flex justify-between items-center text-text-muted font-bold uppercase text-[11px] tracking-widest">
                  <div className="flex items-center gap-3">
                    <Truck className="w-4 h-4 text-gold" />
                    <span>Delivery</span>
                  </div>
                  <span className="text-lg font-black italic tracking-tighter text-white">
                    ₹{deliveryCharge}
                  </span>
                </div>
                <div className="h-[1px] bg-white/5 shadow-inner" />
                <div className="flex justify-between items-end">
                  <div className="space-y-2">
                    <span className="text-gold font-black uppercase tracking-[6px] text-[11px]">Investment Total</span>
                    <p className="text-7xl font-black italic tracking-tighter text-white leading-none drop-shadow-xl">₹{grandTotal}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <motion.button 
                  whileHover={!isOrderingPaused ? { scale: 1.02 } : {}}
                  whileTap={!isOrderingPaused ? { scale: 0.98 } : {}}
                  onClick={() => {
                    if (isOrderingPaused) {
                      toast.error("Ordering is temporarily closed! Please check operating hours.", {
                        style: { background: '#161A22', color: '#fff', border: '1px solid #FF4D00' }
                      });
                      return;
                    }
                    navigate('/checkout');
                  }}
                  className={`w-full h-24 rounded-[30px] text-xl tracking-[6px] flex items-center justify-center gap-3 transition-all ${
                    isOrderingPaused 
                      ? 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
                      : 'btn-luxury-gold'
                  }`}
                >
                  {isOrderingPaused ? 'ORDERING PAUSED' : 'ORDER NOW'}
                  {!isOrderingPaused && <Zap className="w-7 h-7 fill-matte-black" />}
                </motion.button>
                <div className="flex items-center justify-center gap-3 text-text-muted font-black uppercase tracking-[4px] text-[9px] opacity-30">
                  <ShieldCheck className="w-4 h-4 text-gold" />
                  Encrypted VIP Transaction
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

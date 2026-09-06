import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, Plus, Minus, X, PartyPopper, ShoppingBag, Download, Cake, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '../store/cartStore';
import { PARTY_ITEMS, SNACKS, ICE_CAKES, NORMAL_CAKES } from '../data/partyItems';
import { Product } from '../types';
import { useSEO } from '../utils/seo';

import { useInstallModalStore } from '../store/installModalStore';

// Category tabs for Party Specials
type Category = 'Normal' | 'Ice Cake' | 'Party Items' | 'Snacks';

export default function BulkOrderPage() {
  useSEO("Cakes & Birthday Celebrations", "Order freshly baked celebration cakes, party snacks, and birthday essentials from Mom's Magic.");
  const navigate = useNavigate();
  const { addItem, items, updateQuantity } = useCartStore();
  const [activeCategory, setActiveCategory] = useState<Category>('Normal');
  const [showUpsell, setShowUpsell] = useState(false);
  const openInstallModal = useInstallModalStore(state => state.openModal);

  useEffect(() => {
    localStorage.setItem('moms_magic_order_type', 'bulk');
    window.scrollTo(0, 0);
  }, []);

  const handleInstallClick = () => {
    openInstallModal();
  };

  const categories: Category[] = ['Normal', 'Ice Cake', 'Party Items', 'Snacks'];

  const advanceToNextCategory = (currentCat: Category) => {
    const currentIndex = categories.indexOf(currentCat);
    if (currentIndex > -1 && currentIndex < categories.length - 1) {
      setActiveCategory(categories[currentIndex + 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/checkout');
    }
  };

  const handleAddToCart = (product: Product, category: Category) => {
    addItem(product, undefined, 1);
    toast.success(`${product.name} Added! 🎂`, {
      icon: '🎉',
      style: {
        background: '#ffffff',
        color: '#111827',
        border: '1px solid #f43f5e',
        borderRadius: '16px',
        fontWeight: 'bold'
      }
    });
  };

  const totalCartCount = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#fff1f4]/80 via-[#fff8fa]/60 to-[#ffffff] text-gray-900 pb-36 font-sans overflow-hidden">
      
      {/* Soft Ambient Glows matching app's light pink theme */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[5%] left-[10%] w-[380px] h-[380px] bg-rose-200/30 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] right-[10%] w-[420px] h-[420px] bg-pink-100/40 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 px-4 md:px-8 max-w-7xl mx-auto pt-4 sm:pt-6">
        
        {/* TOP HEADER: Back, Title Badge, INSTALL BUTTON UPSIDE, Cart */}
        <header className="flex items-center justify-between gap-2.5 mb-6 bg-white/80 backdrop-blur-md p-3 sm:p-4 rounded-3xl border border-rose-100 shadow-xs">
          
          {/* Back to Home */}
          <button 
            onClick={() => navigate('/')} 
            className="w-10 h-10 sm:w-11 sm:h-11 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-center justify-center text-gray-700 hover:text-gray-900 hover:bg-rose-100 active:scale-95 transition-all cursor-pointer shrink-0"
            title="Back to Home"
          >
            <ChevronLeft className="w-5 h-5 text-gray-800" />
          </button>

          {/* Page Badge */}
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-rose-500/10 to-pink-500/10 border border-rose-200/70 px-3.5 py-1.5 sm:py-2 rounded-full">
            <Cake className="w-4 h-4 text-[#e11d48]" />
            <span className="font-black uppercase tracking-wider text-[11px] sm:text-xs text-[#e11d48]">
              Cakes & B'day
            </span>
          </div>

          {/* Right Section: INSTALL BUTTON UPSIDE + Cart */}
          <div className="flex items-center gap-2 shrink-0">
            {/* INSTALL BUTTON UPSIDE */}
            <button
              onClick={handleInstallClick}
              className="px-3 sm:px-4 py-2 rounded-2xl bg-gradient-to-r from-[#ff4d6d] via-[#f43f5e] to-[#e11d48] text-white font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-md shadow-rose-500/25 flex items-center gap-1.5 active:scale-95 hover:opacity-95 transition-all cursor-pointer"
              title="Install Mom's Magic App"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              <span>Install</span>
            </button>

            {/* Cart Icon Button */}
            <Link
              to="/checkout"
              className="w-10 h-10 sm:w-11 sm:h-11 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-center justify-center text-gray-700 hover:text-gray-900 hover:bg-rose-100 active:scale-95 transition-all relative cursor-pointer"
              title="View Cart"
            >
              <ShoppingBag className="w-5 h-5 text-gray-800" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#e11d48] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {totalCartCount}
                </span>
              )}
            </Link>
          </div>

        </header>

        {/* Hero Banner with Soft Pink Theme */}
        <div className="mb-6 p-4 sm:p-6 rounded-[28px] bg-gradient-to-r from-rose-100/90 via-pink-50/80 to-rose-100/70 border border-rose-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
          <div className="space-y-1 sm:space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-block bg-[#e11d48] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                Party Specials 🎉
              </span>
              <span className="text-[10px] font-bold text-gray-500">
                Freshly Baked & Handcrafted
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
              Delicious Celebration Cakes & Snacks
            </h1>
            <p className="text-xs font-semibold text-gray-600 max-w-xl">
              Freshly prepared with love. Add your customized name & message at checkout!
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={() => setShowUpsell(true)}
              className="px-4 py-2.5 rounded-2xl bg-white border border-rose-200 text-[#e11d48] font-black text-xs uppercase tracking-wider shadow-xs hover:bg-rose-50 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#e11d48]" />
              <span>Party Addons</span>
            </button>
          </div>
        </div>

        {/* Categories Tabs Row */}
        <div className="flex gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar pb-3 mb-6 snap-x">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`snap-start whitespace-nowrap px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-black uppercase tracking-wider text-xs transition-all duration-200 cursor-pointer ${
                activeCategory === cat 
                  ? 'bg-gradient-to-r from-[#ff4d6d] via-[#f43f5e] to-[#e11d48] text-white shadow-md shadow-rose-500/25 ring-2 ring-rose-300/40' 
                  : 'bg-white text-gray-600 border border-rose-200/80 hover:bg-rose-50 hover:text-gray-900 shadow-2xs'
              }`}
            >
              {cat === 'Normal' ? '🎂 Regular Cakes' :
               cat === 'Ice Cake' ? '❄️ Ice Cakes' :
               cat === 'Party Items' ? '🎈 Party Items' :
               '🍿 Party Snacks'}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
              {(
                activeCategory === 'Normal' ? NORMAL_CAKES :
                activeCategory === 'Ice Cake' ? ICE_CAKES :
                activeCategory === 'Party Items' ? PARTY_ITEMS :
                SNACKS
              ).map((item, idx) => {
                const inCart = items.find(i => i.id === item.id);
                return (
                  <div
                    key={item.id}
                    className="group bg-white rounded-[24px] p-3 sm:p-4 border border-rose-100/90 shadow-xs hover:shadow-md hover:border-rose-300 transition-all flex flex-col justify-between text-left"
                  >
                    {/* Image Box */}
                    <div className="aspect-square rounded-2xl overflow-hidden mb-3 relative bg-rose-50/60">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        loading="lazy" 
                      />
                      <div className="absolute top-2 left-2">
                        <span className="bg-white/95 backdrop-blur-md text-[#e11d48] border border-rose-200/80 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-2xs">
                          {activeCategory === 'Normal' ? 'Regular' :
                           activeCategory === 'Ice Cake' ? 'Ice Cake' :
                           activeCategory === 'Party Items' ? 'Celebration' : 'Snack'}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-black text-xs sm:text-sm text-gray-900 line-clamp-2 leading-snug">
                          {item.name}
                        </h3>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-sm sm:text-base font-black text-[#e11d48]">
                            ₹{item.price}
                          </span>
                          <span className="text-[10px] font-semibold text-gray-400 line-through">
                            ₹{Math.round(item.price * 1.25)}
                          </span>
                        </div>
                      </div>

                      {/* Add Button or Stepper Pill */}
                      <div>
                        {inCart ? (
                          <div className="w-full bg-rose-50 border border-rose-300 text-gray-900 rounded-xl flex items-center justify-between px-2 sm:px-3 py-1.5 shadow-2xs">
                            <button 
                              onClick={() => updateQuantity(item.id, inCart.quantity - 1)}
                              className="p-1 rounded-lg hover:bg-rose-100 text-[#e11d48] cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                            </button>
                            <span className="text-xs sm:text-sm font-black text-gray-900">
                              {inCart.quantity}
                            </span>
                            <button 
                              onClick={() => updateQuantity(item.id, inCart.quantity + 1)}
                              className="p-1 rounded-lg hover:bg-rose-100 text-[#e11d48] cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddToCart(item, activeCategory)}
                            className="w-full py-2 sm:py-2.5 px-3 rounded-xl font-black uppercase tracking-wider text-[11px] sm:text-xs bg-gradient-to-r from-[#ff4d6d] via-[#f43f5e] to-[#e11d48] text-white shadow-sm shadow-rose-500/20 active:scale-95 hover:opacity-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            <span>ADD</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

      </div>

      {/* Floating Category Advance Button */}
      <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-40 flex items-center justify-between gap-3">
        <button
          onClick={() => advanceToNextCategory(activeCategory)}
          className="w-full py-3.5 px-5 rounded-2xl bg-white/95 backdrop-blur-md border border-rose-200 text-gray-800 hover:bg-rose-50 shadow-lg shadow-rose-500/10 font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
        >
          <span>
            {activeCategory === 'Snacks' ? 'Proceed to Checkout 🛒' : `Next: Next Category`}
          </span>
          <ArrowRight className="w-4 h-4 text-[#e11d48]" />
        </button>
      </div>

      {/* Smart Upselling Modal with Light Pink Theme */}
      <AnimatePresence>
        {showUpsell && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-6"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white w-full md:w-[600px] max-h-[85vh] overflow-y-auto no-scrollbar rounded-t-[32px] md:rounded-[32px] border border-rose-100 shadow-2xl relative text-left"
            >
              <div className="sticky top-0 bg-white/95 backdrop-blur-md p-5 border-b border-rose-100 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center">
                    <PartyPopper className="w-5 h-5 text-[#e11d48]" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-gray-900">
                      Complete Your Celebration 🎉
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Party Essentials & Addons
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowUpsell(false)} 
                  className="w-9 h-9 bg-rose-50 hover:bg-rose-100 rounded-full flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5 pb-24 md:pb-6">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#e11d48] mb-3">
                    Party Essentials
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {PARTY_ITEMS.slice(0, 4).map(item => (
                      <div key={item.id} className="bg-rose-50/50 rounded-2xl p-3 border border-rose-100 flex flex-col justify-between">
                        <img src={item.image} className="w-full h-24 object-cover rounded-xl mb-2.5" alt={item.name} />
                        <div className="mb-2">
                          <p className="font-black text-xs text-gray-900 truncate">{item.name}</p>
                          <p className="text-[#e11d48] font-black text-xs">₹{item.price}</p>
                        </div>
                        <button 
                          onClick={() => { addItem(item); toast.success(`${item.name} added!`); }}
                          className="w-full py-1.5 bg-[#e11d48] text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:opacity-95 transition-opacity cursor-pointer"
                        >
                          Add +
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#e11d48] mb-3">
                    Quick Snacks
                  </h4>
                  <div className="space-y-2.5">
                    {SNACKS.map(snack => (
                      <div key={snack.id} className="flex items-center justify-between p-3 bg-rose-50/50 rounded-2xl border border-rose-100">
                        <div className="flex items-center gap-3">
                          <img src={snack.image} className="w-14 h-14 object-cover rounded-xl" alt="" />
                          <div>
                            <p className="font-black text-xs text-gray-900">{snack.name}</p>
                            <p className="text-[#e11d48] font-black text-xs">₹{snack.price}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => { addItem(snack); toast.success(`${snack.name} added!`); }}
                          className="w-9 h-9 bg-[#e11d48] text-white rounded-xl flex items-center justify-center hover:opacity-95 transition-opacity cursor-pointer"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="sticky bottom-0 bg-white p-4 border-t border-rose-100 md:hidden">
                <button 
                  onClick={() => setShowUpsell(false)} 
                  className="w-full py-3.5 bg-gradient-to-r from-[#ff4d6d] to-[#e11d48] text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-sm cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

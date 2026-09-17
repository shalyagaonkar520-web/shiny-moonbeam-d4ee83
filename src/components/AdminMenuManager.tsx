import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Save, X, Search, Loader2, Sparkles } from 'lucide-react';
import { useMenuStore } from '../store/menuStore';
import { Product } from '../types';
import toast from 'react-hot-toast';
import DishImage from './DishImage';

export default function AdminMenuManager() {
  const { menuItems, isLoading, seedMenuIfEmpty, addMenuItem, updateMenuItem, deleteMenuItem } = useMenuStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<Partial<Product> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(menuItems.map(i => i.category)))];

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSave = async () => {
    if (!editingItem?.name || !editingItem.price || !editingItem.category) {
      toast.error('Name, price, and category are required.');
      return;
    }
    
    setIsSaving(true);
    let success = false;
    
    if (editingItem.id && menuItems.some(i => i.id === editingItem.id)) {
      // Update
      success = await updateMenuItem(editingItem.id, editingItem);
      if (success) toast.success('Menu item updated successfully!');
    } else {
      // Add new
      const newItem = {
        ...editingItem,
        id: editingItem.id || `item-${Date.now()}`,
        type: editingItem.type || 'food'
      } as Product;
      success = await addMenuItem(newItem);
      if (success) toast.success('New menu item added!');
    }

    if (success) {
      setEditingItem(null);
    } else {
      toast.error('Failed to save menu item.');
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      const success = await deleteMenuItem(id);
      if (success) {
        toast.success('Item deleted.');
      } else {
        toast.error('Failed to delete item.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#FFB700]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Menu <span className="text-[#FFB700]">Manager</span></h2>
          <p className="text-white/40 text-xs font-semibold tracking-wider mt-1">Manage all products directly from Firestore.</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={async () => {
              const loadingToast = toast.loading('Seeding menu to database...');
              const success = await seedMenuIfEmpty();
              toast.dismiss(loadingToast);
              if (success) {
                toast.success('Default Menu Seeded!');
              } else {
                toast.error('Failed to seed menu! Database rules missing?');
              }
            }}
            className="px-6 h-12 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-[10px] uppercase tracking-widest border border-white/10 transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Seed Default Menu
          </button>
          
          <button
            onClick={() => setEditingItem({ name: '', price: 0, category: 'Main Course', isVeg: true, image: '' })}
            className="px-6 h-12 rounded-2xl bg-[#FFB700] hover:bg-[#FFD700] text-matte-black font-black text-xs uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add New Item
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 pl-12 pr-6 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/30 outline-none focus:border-[#FFB700]/50 transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest whitespace-nowrap transition-all border shrink-0 ${
                activeCategory === cat
                  ? 'bg-white/10 border-white/20 text-white shadow-lg'
                  : 'bg-transparent border-white/5 text-white/30 hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredItems.map(item => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 hover:bg-white/[0.04] transition-all flex flex-col justify-between"
            >
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-2xl bg-white/5 overflow-hidden shrink-0 border border-white/10">
                  <DishImage src={item.image} alt={item.name} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm leading-tight">{item.name}</h4>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[#FFB700] font-black text-xs tracking-wider">₹{item.price}</span>
                    <span className="px-2 py-0.5 rounded-lg bg-white/10 text-white/50 text-[9px] uppercase font-bold tracking-widest">{item.category}</span>
                    {item.isVeg !== undefined && (
                      <span className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/5">
                <button
                  onClick={() => setEditingItem(item)}
                  className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(item.id!)}
                  className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-[#1a1e28] border border-white/10 rounded-[30px] p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black italic uppercase text-white">{editingItem.id ? 'Edit Item' : 'New Item'}</h3>
                <button onClick={() => setEditingItem(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest pl-1">Item Name</label>
                  <input
                    type="text"
                    value={editingItem.name || ''}
                    onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full h-12 px-4 bg-black/30 border border-white/10 rounded-2xl text-white outline-none focus:border-[#FFB700]/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest pl-1">Price (₹)</label>
                    <input
                      type="number"
                      value={editingItem.price || ''}
                      onChange={e => setEditingItem({ ...editingItem, price: Number(e.target.value) })}
                      className="w-full h-12 px-4 bg-black/30 border border-white/10 rounded-2xl text-white outline-none focus:border-[#FFB700]/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest pl-1">Category</label>
                    <input
                      type="text"
                      value={editingItem.category || ''}
                      onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                      className="w-full h-12 px-4 bg-black/30 border border-white/10 rounded-2xl text-white outline-none focus:border-[#FFB700]/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest pl-1">Image URL</label>
                  <input
                    type="text"
                    value={editingItem.image || ''}
                    onChange={e => setEditingItem({ ...editingItem, image: e.target.value })}
                    placeholder="https://..."
                    className="w-full h-12 px-4 bg-black/30 border border-white/10 rounded-2xl text-white outline-none focus:border-[#FFB700]/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest pl-1">Description (Optional)</label>
                  <textarea
                    value={editingItem.description || ''}
                    onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                    className="w-full h-24 p-4 bg-black/30 border border-white/10 rounded-2xl text-white outline-none focus:border-[#FFB700]/50 resize-none"
                  />
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative flex items-center">
                      <input type="checkbox" checked={editingItem.isVeg || false} onChange={e => setEditingItem({ ...editingItem, isVeg: e.target.checked })} className="sr-only" />
                      <div className={`w-10 h-6 rounded-full transition-colors ${editingItem.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div className={`absolute w-4 h-4 bg-white rounded-full transition-transform top-1 ${editingItem.isVeg ? 'translate-x-5' : 'translate-x-1'}`} />
                    </div>
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                      {editingItem.isVeg ? 'Veg Item' : 'Non-Veg Item'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full h-14 bg-[#FFB700] hover:bg-[#FFD700] text-matte-black font-black text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save Menu Item
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

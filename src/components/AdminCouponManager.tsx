import React, { useState } from 'react';
import { useSystemStore } from '../store/systemStore';
import { Coupon } from '../types';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminCouponManager() {
  const { settings, updateSettings } = useSystemStore();
  const [coupons, setCoupons] = useState<Coupon[]>(settings.coupons || []);
  
  const [newCoupon, setNewCoupon] = useState<Partial<Coupon>>({
    code: '',
    type: 'fixed_discount',
    value: 0,
    minOrderValue: 0,
    isActive: true
  });

  const saveCoupons = async (updatedCoupons: Coupon[]) => {
    try {
      const token = localStorage.getItem('mintoo_admin_token') || undefined;
      await updateSettings({ coupons: updatedCoupons }, token);
      
      // Also directly update firestore just in case
      await setDoc(doc(db, 'system', 'settings'), { coupons: updatedCoupons }, { merge: true });
      
      setCoupons(updatedCoupons);
      toast.success('Coupons updated successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update coupons');
    }
  };

  const handleAddCoupon = () => {
    if (!newCoupon.code) {
      toast.error('Coupon code is required');
      return;
    }
    if (coupons.some(c => c.code?.toUpperCase() === newCoupon.code?.toUpperCase())) {
      toast.error('Coupon code already exists');
      return;
    }

    const coupon: Coupon = {
      code: newCoupon.code.toUpperCase(),
      type: newCoupon.type as any,
      value: Number(newCoupon.value) || 0,
      minOrderValue: Number(newCoupon.minOrderValue) || 0,
      isActive: Boolean(newCoupon.isActive)
    };

    const updated = [...coupons, coupon];
    saveCoupons(updated);
    setNewCoupon({ code: '', type: 'fixed_discount', value: 0, minOrderValue: 0, isActive: true });
  };

  const handleDeleteCoupon = (code: string) => {
    if (window.confirm(`Are you sure you want to delete coupon ${code}?`)) {
      const updated = coupons.filter(c => c.code !== code);
      saveCoupons(updated);
    }
  };

  const handleToggleStatus = (code: string) => {
    const updated = coupons.map(c => 
      c.code === code ? { ...c, isActive: !c.isActive } : c
    );
    saveCoupons(updated);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between bg-black/40 p-6 rounded-2xl border border-white/10">
        <div>
          <h2 className="text-2xl font-black italic tracking-tight text-white">Coupon Manager</h2>
          <p className="text-white/50 text-sm mt-1">Create and manage dynamic discount codes</p>
        </div>
      </div>

      {/* Add New Coupon Form */}
      <div className="bg-[#161A22] p-6 rounded-2xl border border-white/5">
        <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-4">Add New Coupon</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-bold text-white/40 uppercase mb-2">Code</label>
            <input 
              type="text"
              value={newCoupon.code}
              onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
              placeholder="e.g. WELCOME50"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-gold/50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-white/40 uppercase mb-2">Type</label>
            <select 
              value={newCoupon.type}
              onChange={e => setNewCoupon({...newCoupon, type: e.target.value as any})}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-gold/50"
            >
              <option value="fixed_discount">Fixed Amount (₹)</option>
              <option value="percent_discount">Percentage (%)</option>
              <option value="free_delivery">Free Delivery</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-white/40 uppercase mb-2">Discount Value</label>
            <input 
              type="number"
              min="0"
              value={newCoupon.value}
              onChange={e => setNewCoupon({...newCoupon, value: Number(e.target.value)})}
              disabled={newCoupon.type === 'free_delivery'}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-gold/50 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-white/40 uppercase mb-2">Min Order (₹)</label>
            <input 
              type="number"
              min="0"
              value={newCoupon.minOrderValue}
              onChange={e => setNewCoupon({...newCoupon, minOrderValue: Number(e.target.value)})}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-gold/50"
            />
          </div>
          <div className="flex items-end">
            <button 
              onClick={handleAddCoupon}
              className="w-full h-[46px] bg-gold text-black font-black uppercase tracking-widest rounded-xl hover:bg-gold/90 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Add
            </button>
          </div>
        </div>
      </div>

      {/* Coupons List */}
      <div className="bg-[#161A22] rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-white/10 bg-black/40">
                <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-widest">Code</th>
                <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-widest">Type</th>
                <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-widest">Value</th>
                <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-widest">Min Order</th>
                <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-widest">Status</th>
                <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.code} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-4">
                    <span className="font-black text-gold">{coupon.code}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-white/80 text-sm font-medium">
                      {coupon.type === 'free_delivery' ? 'Free Delivery' : 
                       coupon.type === 'fixed_discount' ? 'Fixed Amount' : 'Percentage'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-white font-bold">
                      {coupon.type === 'free_delivery' ? '-' : 
                       coupon.type === 'fixed_discount' ? `₹${coupon.value}` : `${coupon.value}%`}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-white/60">₹{coupon.minOrderValue}</span>
                  </td>
                  <td className="p-4">
                    <button 
                      onClick={() => handleToggleStatus(coupon.code)}
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        coupon.isActive 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDeleteCoupon(coupon.code)}
                      className="p-2 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors inline-block"
                      title="Delete Coupon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-white/40">
                    No coupons found. Create one above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

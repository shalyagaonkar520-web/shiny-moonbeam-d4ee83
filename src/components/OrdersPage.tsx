import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, PackageSearch, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSEO } from '../utils/seo';
import FoodLoader from './FoodLoader';

interface OrderItem {
  name: string;
  price: number;
  quantity?: number;
  finalQuantity?: number;
}

interface Order {
  id: string;
  createdAt: any;
  grandTotal: number;
  status: string;
  items: OrderItem[];
  orderType: string;
  trackingLink?: string;
}

export default function OrdersPage() {
  useSEO("My Orders", "View your past orders from Moms Magic.");
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  const userPhone = localStorage.getItem('moms_magic_user_phone');

  useEffect(() => {
    if (!userPhone) {
      setLoading(false);
      return;
    }

    const normalizePhone = (phone: string) => {
      if (!phone) return '';
      return phone.replace(/\D/g, '').slice(-10);
    };

    const fetchOrders = () => {
      try {
        const storedOrders = JSON.parse(localStorage.getItem('moms_magic_orders') || '[]');
        const userOrders = storedOrders.filter((o: any) => normalizePhone(o.userPhone) === normalizePhone(userPhone));
        userOrders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(userOrders);
      } catch (err) {
        console.error('Error loading orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [userPhone]);

  if (loading) {
    return <FoodLoader />;
  }

  if (!userPhone) {
    return (
      <div className="min-h-screen bg-matte-black p-6 flex flex-col items-center justify-center space-y-6">
        <PackageSearch className="w-20 h-20 text-[#4CD964]/50" />
        <h2 className="text-xl font-black text-white italic uppercase text-center">No Order History Found</h2>
        <p className="text-white/40 text-xs font-bold text-center">Place your first order to start tracking!</p>
        <button onClick={() => navigate('/food')} className="px-8 py-3 bg-[#4CD964] text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(76,217,100,0.2)]">
          Browse Menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] p-6 pb-32">
      <div className="max-w-3xl mx-auto space-y-10 mt-6">
        <div className="flex items-center gap-4">
          <motion.button 
            whileHover={{ x: -5 }}
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10 hover:border-[#4CD964] transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </motion.button>
          <div>
            <h1 className="text-3xl font-black italic uppercase text-white tracking-tighter">My Orders</h1>
            <p className="text-[#4CD964] text-[10px] font-bold uppercase tracking-widest">{orders.length} Past Order(s)</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] rounded-[40px] border border-white/5">
            <PackageSearch className="w-16 h-16 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 text-sm font-bold uppercase tracking-widest">No orders found yet</p>
            <button onClick={() => navigate('/food')} className="mt-6 px-6 py-3 bg-white/10 text-white font-black uppercase text-[10px] rounded-xl hover:bg-[#4CD964] hover:text-black transition-colors">
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white/[0.02] border border-white/5 rounded-[30px] p-6 hover:border-[#4CD964]/30 transition-colors">
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                  <div>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Order ID: {order.id.slice(0, 8)}</p>
                    <p className="text-white text-sm font-bold mt-1">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Just now'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#4CD964] font-black italic text-xl">₹{order.grandTotal}</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest mt-2 border ${
                      order.status === 'Confirmed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      order.status === 'Preparing' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      order.status === 'Out For Delivery' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                      order.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      'bg-white/10 text-white border-white/10'
                    }`}>
                      {order.status || 'Pending'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {order.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-white/70 font-medium">{item.quantity || item.finalQuantity || 1}x {item.name}</span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <p className="text-[#4CD964]/70 text-[10px] font-bold italic mt-2">+ {order.items.length - 3} more items</p>
                  )}
                </div>

                {order.trackingLink && (
                  <div className="mt-6 pt-4 border-t border-white/5">
                    <a 
                      href={order.trackingLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full block text-center py-3 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                      📍 Track Order Live
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

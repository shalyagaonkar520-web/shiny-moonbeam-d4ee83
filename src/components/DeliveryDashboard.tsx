import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogIn, 
  MapPin, 
  Navigation, 
  CheckCircle, 
  Truck, 
  TrendingUp, 
  History, 
  Power, 
  Phone, 
  AlertCircle,
  Clock,
  Compass,
  PhoneCall
} from 'lucide-react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import toast from 'react-hot-toast';
import { useSEO } from '../utils/seo';

export default function DeliveryDashboard() {
  useSEO("Rider Portal", "Delivery Partner dashboard for live tracking, routing, and earnings updates.");
  const navigate = useNavigate();

  // Auth States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [riderId, setRiderId] = useState<string | null>(null);
  const [riderProfile, setRiderProfile] = useState<any>(null);

  // Status Toggles
  const [isOnline, setIsOnline] = useState(false);

  // Active / History Orders State
  const [assignedOrders, setAssignedOrders] = useState<any[]>([]);
  const [pastDeliveries, setPastDeliveries] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'assigned' | 'history'>('assigned');

  // Verify Auth State on mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Verify this user is actually registered as a rider
        const riderRef = doc(db, 'riders', user.uid);
        const riderSnap = await getDoc(riderRef);
        if (riderSnap.exists()) {
          setRiderId(user.uid);
          const data = riderSnap.data();
          setRiderProfile(data);
          setIsOnline(data.status === 'online');
        } else {
          // Sign out immediately if not authorized
          await signOut(auth);
          toast.error("Access Denied: This account is not registered as a delivery partner.");
          setRiderId(null);
        }
      } else {
        setRiderId(null);
        setRiderProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // 1. Live Geolocation GPS Tracking while Online
  useEffect(() => {
    if (!isOnline || !riderId) return;

    let watchId: number | null = null;
    
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const riderRef = doc(db, 'riders', riderId);
          await updateDoc(riderRef, {
            'currentLocation.lat': latitude,
            'currentLocation.lng': longitude,
            'currentLocation.lastUpdated': new Date().toISOString()
          });
        },
        (error) => {
          console.error("GPS position watch error:", error);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
      );
    } else {
      toast.error("GPS location not supported on this browser.");
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isOnline, riderId]);

  // 2. Real-Time Listeners for Assigned Orders (Pending/Preparing/Delivering)
  useEffect(() => {
    if (!riderId) return;

    const ordersQuery = query(
      collection(db, 'orders'),
      where('riderId', '==', riderId)
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const active: any[] = [];
      const past: any[] = [];
      
      snapshot.forEach((docSnap) => {
        // Firestore returns DocumentData, so annotate to keep the status reads typed.
        const o: any = { id: docSnap.id, ...docSnap.data() };
        if (o.status === 'delivered' || o.status === 'completed' || o.status === 'cancelled') {
          past.push(o);
        } else {
          active.push(o);
        }
      });

      // Sort
      active.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      past.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setAssignedOrders(active);
      setPastDeliveries(past);
    });

    return () => unsubscribe();
  }, [riderId]);

  // Login handler
  const handleRiderLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter email and password.");
      return;
    }
    setLoginLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      toast.success("Rider session initialized! 🛵");
    } catch (error: any) {
      toast.error(error.message || "Invalid credentials.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRiderLogout = async () => {
    if (riderId) {
      // Set offline on logout
      const riderRef = doc(db, 'riders', riderId);
      await updateDoc(riderRef, { status: 'offline' });
    }
    await signOut(auth);
    toast.success("Signed out successfully.");
  };

  // Toggle Online/Offline State
  const toggleOnlineStatus = async () => {
    if (!riderId) return;
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);

    try {
      const riderRef = doc(db, 'riders', riderId);
      await updateDoc(riderRef, { status: nextStatus ? 'online' : 'offline' });
      toast.success(`You are now ${nextStatus ? 'ONLINE 🟢' : 'OFFLINE 🔴'}`);
    } catch (err) {
      toast.error("Failed to update status.");
      setIsOnline(isOnline); // revert
    }
  };

  // Accept Order
  const handleAcceptOrder = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'Preparing', // Move to preparing/accepted state
        riderStatus: 'accepted'
      });
      toast.success("Order accepted! 📦");
    } catch (err) {
      toast.error("Failed to accept order.");
    }
  };

  // Reject Order
  const handleRejectOrder = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        riderId: '', // Release rider
        riderStatus: 'rejected'
      });
      toast.success("Order rejected.");
    } catch (err) {
      toast.error("Failed to reject order.");
    }
  };

  // Start Delivery
  const handleStartDelivery = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'Out For Delivery',
        riderStatus: 'delivering'
      });
      toast.success("Delivery run started! Drive safe. 🛵");
    } catch (err) {
      toast.error("Failed to update order.");
    }
  };

  // Complete Delivery (Crediting ₹40 commission automatically)
  const handleCompleteDelivery = async (orderId: string) => {
    if (!riderId) return;
    try {
      const orderRef = doc(db, 'orders', orderId);
      const riderRef = doc(db, 'riders', riderId);

      await updateDoc(orderRef, {
        status: 'delivered',
        riderStatus: 'delivered',
        deliveredAt: new Date().toISOString()
      });

      // Update rider earnings (+₹40 per delivery commission)
      const newEarnings = (riderProfile?.earnings || 0) + 40;
      await updateDoc(riderRef, {
        earnings: newEarnings
      });

      setRiderProfile((prev: any) => ({ ...prev, earnings: newEarnings }));
      toast.success("Order Delivered successfully! +₹40 earned. 💵");
    } catch (err) {
      toast.error("Failed to complete delivery.");
    }
  };

  // Render Login Panel
  if (!riderId) {
    return (
      <div className="min-h-screen bg-matte-black flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-[#0B0E14] border border-white/10 rounded-[35px] w-full max-w-md p-8 shadow-[0_20px_50px_rgba(76,217,100,0.15)] space-y-8 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 to-orange-500" />
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/5 blur-[80px] rounded-full pointer-events-none" />

          <div className="space-y-2 mt-4 text-center">
            <Truck className="w-12 h-12 text-[#4CD964] mx-auto animate-pulse" />
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mt-4">
              RIDER <span className="text-[#4CD964]">PORTAL</span>
            </h2>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">
              Authorized Delivery Login Required
            </p>
          </div>

          <form onSubmit={handleRiderLogin} className="space-y-4">
            <input
              type="email"
              placeholder="RIDER EMAIL"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 outline-none focus:border-[#4CD964]/50 transition-all font-bold text-xs text-white placeholder:text-white/20 tracking-[1px]"
            />
            <input
              type="password"
              placeholder="PASSWORD"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 outline-none focus:border-[#4CD964]/50 transition-all font-bold text-xs text-white placeholder:text-white/20 tracking-[1px]"
            />
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-105 active:scale-95 text-white font-black text-xs uppercase tracking-[2px] py-4 rounded-2xl transition-all shadow-[0_6px_20px_rgba(239,68,68,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loginLoading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Log In Partner <LogIn className="w-4 h-4" /></>}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Calculate earnings
  const completedCount = pastDeliveries.filter(o => o.status === 'delivered').length;

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 pb-48 px-4 md:px-6">
      
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header Dashboard Info */}
        <div className="luxury-card rounded-[35px] p-6 sm:p-10 border-[#4CD964]/10 bg-gradient-to-br from-[#0B0E14] to-black flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-left">
            <div className={`w-12 h-12 rounded-full border flex items-center justify-center shadow-lg text-lg font-black shrink-0 ${
              isOnline ? 'bg-[#4CD964]/10 border-[#4CD964]/30 text-[#4CD964] shadow-[#4CD964]/20' : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {isOnline ? '🟢' : '🔴'}
            </div>
            <div>
              <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">{riderProfile?.name}</h2>
              <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mt-0.5">Delivery Partner Active Session</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Status Switcher */}
            <button
              onClick={toggleOnlineStatus}
              className={`px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                isOnline 
                  ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white' 
                  : 'bg-[#4CD964] text-black hover:brightness-105 shadow-[#4CD964]/10'
              }`}
            >
              <Power className="w-4 h-4" />
              {isOnline ? "Go Offline" : "Go Online"}
            </button>

            {/* Logout button */}
            <button
              onClick={handleRiderLogout}
              className="bg-white/5 border border-white/10 hover:border-white/20 text-white/60 hover:text-white px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Earning Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl text-left">
            <TrendingUp className="w-5 h-5 text-[#4CD964] mb-2" />
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Total Earnings</p>
            <h3 className="text-3xl font-black italic text-white mt-1">₹{riderProfile?.earnings || 0}</h3>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl text-left">
            <CheckCircle className="w-5 h-5 text-emerald-400 mb-2" />
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Deliveries Done</p>
            <h3 className="text-3xl font-black italic text-white mt-1">{completedCount} Orders</h3>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl text-left col-span-2 sm:col-span-1">
            <Clock className="w-5 h-5 text-gold mb-2" />
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Commission Rate</p>
            <h3 className="text-xl font-black italic text-gold mt-2">₹40 / order</h3>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveTab('assigned')}
            className={`flex-1 py-3.5 text-center text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
              activeTab === 'assigned' ? 'bg-[#4CD964] text-black shadow-md' : 'text-white/50 hover:text-white'
            }`}
          >
            Assigned Deliveries ({assignedOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3.5 text-center text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
              activeTab === 'history' ? 'bg-[#4CD964] text-black shadow-md' : 'text-white/50 hover:text-white'
            }`}
          >
            History & Earnings ({pastDeliveries.length})
          </button>
        </div>

        {/* Dynamic tabs content */}
        <div>
          {activeTab === 'assigned' ? (
            <div className="space-y-6">
              {!isOnline && (
                <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  Please toggle status to ONLINE to activate Geolocation GPS tracking and receive order assignments.
                </div>
              )}

              {assignedOrders.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.02] rounded-3xl border border-white/5">
                  <Truck className="w-12 h-12 text-white/10 mx-auto mb-4 animate-bounce" />
                  <p className="text-white/30 text-xs font-bold uppercase tracking-widest">No active deliveries assigned</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignedOrders.map((order) => {
                    const customerLoc = order.deliveryLocation;
                    const mapLink = `https://maps.google.com/maps?daddr=${customerLoc?.lat || 14.9667},${customerLoc?.lng || 74.7167}`;
                    
                    return (
                      <div key={order.id} className="bg-[#0B0E14] border border-white/10 rounded-3xl p-6 text-left space-y-6 hover:border-[#4CD964]/20 transition-all">
                        {/* Status bar */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                          <div>
                            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">Order ID: #{order.id.slice(0, 8)}</p>
                            <p className="text-white text-xs font-semibold mt-1">Items: {order.items.map((i: any) => `${i.quantity || i.finalQuantity || 1}x ${i.name}`).join(', ')}</p>
                          </div>
                          
                          <div className="text-right">
                            <span className="bg-[#4CD964]/10 border border-[#4CD964]/25 text-[#4CD964] text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded">
                              {order.status}
                            </span>
                          </div>
                        </div>

                        {/* Customer & address details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <p className="text-white/30 text-[9px] font-black uppercase tracking-widest">Customer Details</p>
                            <h4 className="text-base font-extrabold text-white">{order.userName}</h4>
                            <p className="text-xs text-white/60 font-semibold">{order.userPhone}</p>
                          </div>

                          <div className="space-y-1.5">
                            <p className="text-white/30 text-[9px] font-black uppercase tracking-widest">Delivery Address</p>
                            <h4 className="text-xs font-bold text-white uppercase leading-relaxed">{customerLoc?.address}</h4>
                            {customerLoc?.distance && (
                              <p className="text-[10px] text-[#4CD964] font-black uppercase tracking-wider">Distance: {customerLoc.distance} km</p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-3 pt-4 border-t border-white/5">
                          {/* Unconfirmed riderStatus: Accept/Reject */}
                          {(!order.riderStatus || order.riderStatus === 'assigned') && (
                            <>
                              <button
                                onClick={() => handleAcceptOrder(order.id)}
                                className="flex-1 bg-[#4CD964] text-black font-black uppercase text-[10px] tracking-widest py-3.5 rounded-xl hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                              >
                                Accept Order
                              </button>
                              <button
                                onClick={() => handleRejectOrder(order.id)}
                                className="flex-1 bg-white/5 border border-white/10 text-red-400 font-black uppercase text-[10px] tracking-widest py-3.5 rounded-xl hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                              >
                                Reject Order
                              </button>
                            </>
                          )}

                          {/* Accepted order status: Start Delivery */}
                          {order.riderStatus === 'accepted' && (
                            <button
                              onClick={() => handleStartDelivery(order.id)}
                              className="flex-1 bg-[#4CD964] text-black font-black uppercase text-[10px] tracking-widest py-4 rounded-xl hover:brightness-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              <Navigation className="w-4 h-4" /> Start Delivery Run
                            </button>
                          )}

                          {/* Out for Delivery status: Complete Delivery */}
                          {order.riderStatus === 'delivering' && (
                            <button
                              onClick={() => handleCompleteDelivery(order.id)}
                              className="flex-1 bg-gradient-to-r from-emerald-500 to-[#4CD964] text-black font-black uppercase text-[10px] tracking-widest py-4 rounded-xl hover:brightness-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4 fill-black stroke-emerald-500" /> Complete Delivery
                            </button>
                          )}

                          {/* Navigation Link Launcher */}
                          {order.riderStatus !== 'delivered' && (
                            <a
                              href={mapLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-white/5 border border-white/10 hover:border-blue-400 text-blue-400 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                              <Compass className="w-4 h-4" /> Navigate
                            </a>
                          )}

                          <a
                            href={`tel:${order.userPhone}`}
                            className="bg-white/5 border border-white/10 hover:border-[#4CD964] text-white px-4 py-4 rounded-xl flex items-center justify-center transition-all"
                          >
                            <PhoneCall className="w-4 h-4 text-[#4CD964]" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            // History and Completed Deliveries list
            <div className="space-y-6">
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-white text-left">Completed Deliveries</h3>
              
              {pastDeliveries.length === 0 ? (
                <div className="text-center py-16 bg-white/[0.02] rounded-3xl border border-white/5">
                  <p className="text-white/30 text-xs font-bold uppercase tracking-widest">No delivery history found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pastDeliveries.map((order) => (
                    <div key={order.id} className="bg-[#0B0E14]/40 border border-white/5 rounded-2xl p-5 flex items-center justify-between gap-4 text-left">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white text-sm font-bold">{order.userName}</p>
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[7px] font-black uppercase px-2 py-0.5 rounded">
                            {order.status}
                          </span>
                        </div>
                        <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mt-1">ID: #{order.id.slice(0, 8)} • Completed: {order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : 'Just now'}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-[#4CD964] font-black italic text-lg">+₹40</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

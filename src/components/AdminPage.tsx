import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Power, ShieldAlert, Clock, Save, Phone, Bell, Loader2, 
  Lock, AlertCircle, Calendar, TrendingUp, LogOut, Sliders, 
  Sparkles, CheckCircle2, ChevronRight, Activity, Moon, Sun, Laptop, Flame,
  Search, PackageSearch, Users, Wallet, Map, Ticket
} from 'lucide-react';
import { useAdminStore } from '../store/adminStore';
import { playSound, SOUNDS } from '../utils/audio';
import { useSystemStore } from '../store/systemStore';
import toast from 'react-hot-toast';
import { useSEO } from '../utils/seo';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db, auth } from '../firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  updateDoc, 
  addDoc, 
  deleteDoc,
  runTransaction,
  query,
  orderBy,
  where,
  setDoc
} from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import AdminMenuManager from './AdminMenuManager';
import AdminCouponManager from './AdminCouponManager';
import { getItemHotel } from '../utils/orderHotels';

// Real Orders fetched from localStorage

export default function AdminPage() {
  useSEO("Admin Panel", "Manage operations, menu availability, and systems for Moms Magic.");
  const { user, setUser, logout } = useAdminStore();
  const { settings, isLoading, loadSettings, updateSettings, triggerEmergencyStop, resetEmergencyStop } = useSystemStore();

  // Login form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Form local editing states (to prevent lag during typing, saved to store on Save)
  const [localSettings, setLocalSettings] = useState({ ...settings });
  const [isSaving, setIsSaving] = useState(false);
  
  // Real Orders State
  const [realOrders, setRealOrders] = useState<any[]>([]);
  const [trackingModalOrder, setTrackingModalOrder] = useState<string | null>(null);
  const [trackingUrl, setTrackingUrl] = useState('');

  // Bar management states
  const [activeTab, setActiveTab] = useState<'orders' | 'analytics' | 'riders' | 'customers' | 'walletLogs' | 'system' | 'menu' | 'coupons' | 'notifications' | 'luckyWheel'>('orders');

  // Lucky Wheel States
  const [luckyCoupons, setLuckyCoupons] = useState<any[]>([]);
  const [luckySpins, setLuckySpins] = useState<any[]>([]);
  const [luckyConfig, setLuckyConfig] = useState<any>(null);
  const [generatingOTP, setGeneratingOTP] = useState(false);

  // Extended Platform States
  const [ridersList, setRidersList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [walletLogs, setWalletLogs] = useState<any[]>([]);
  const [pwaInstallsList, setPwaInstallsList] = useState<any[]>([]);

  // Customer Management - Wallet Adjustment Form States
  const [adjustingUser, setAdjustingUser] = useState<any | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustingLoading, setAdjustingLoading] = useState<boolean>(false);

  // Customer List Search Filter
  const [customerSearch, setCustomerSearch] = useState<string>('');

  // Wallet Logs Search Filter
  const [walletSearch, setWalletSearch] = useState<string>('');
  const [walletTypeFilter, setWalletTypeFilter] = useState<string>('All');

  // Leaflet map refs for rider tracking
  const riderMapRef = useRef<HTMLDivElement>(null);
  const riderMapInstance = useRef<L.Map | null>(null);
  const riderMarkersRef = useRef<{ [key: string]: L.Marker }>({});

  // Push notifications broadcast state
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    imageUrl: '',
    deepLink: ''
  });
  const [sendingNotification, setSendingNotification] = useState(false);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationForm.title || !notificationForm.message) {
      toast.error('Title and message are required');
      return;
    }

    setSendingNotification(true);
    const token = localStorage.getItem('moms_magic_admin_token') || '';
    toast.loading('Broadcasting push notifications...', { id: 'push-broadcast' });

    try {
      const response = await fetch('/api/send-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(notificationForm)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`Successfully sent push alerts to ${data.successCount} devices!`, { id: 'push-broadcast' });
        setNotificationForm({
          title: '',
          message: '',
          imageUrl: '',
          deepLink: ''
        });
      } else {
        toast.error(data.error || 'Failed to broadcast notifications.', { id: 'push-broadcast' });
      }
    } catch (err) {
      toast.error('Network error sending push notifications.', { id: 'push-broadcast' });
    } finally {
      setSendingNotification(false);
    }
  };

  // Daily Schedule state (Mock database schema details)
  const [schedule, setSchedule] = useState({
    Monday: { open: '12:30', close: '22:30', closed: false },
    Tuesday: { open: '12:30', close: '22:30', closed: false },
    Wednesday: { open: '12:30', close: '22:30', closed: false },
    Thursday: { open: '12:30', close: '22:30', closed: false },
    Friday: { open: '12:30', close: '23:00', closed: false },
    Saturday: { open: '11:00', close: '23:30', closed: false },
    Sunday: { open: '11:00', close: '22:30', closed: false }
  });

  // Fetch settings when admin logs in
  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  // Sync local editing states with store changes
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // ── Firestore real-time queries for Orders, Riders, Customers, and Wallet Logs ──
  useEffect(() => {
    if (!user) return;

    // 1. Listen to all orders
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const fetchedOrders: any[] = [];
      snapshot.forEach((docSnap) => {
        fetchedOrders.push({ id: docSnap.id, ...docSnap.data() });
      });
      setRealOrders(fetchedOrders);
    }, (err) => console.error("Error fetching orders:", err));

    // 2. Listen to all riders
    const ridersQuery = collection(db, 'riders');
    const unsubscribeRiders = onSnapshot(ridersQuery, (snapshot) => {
      const fetchedRiders: any[] = [];
      snapshot.forEach((docSnap) => {
        fetchedRiders.push({ uid: docSnap.id, ...docSnap.data() });
      });
      setRidersList(fetchedRiders);
    }, (err) => console.error("Error fetching riders:", err));

    // 3. Listen to all users
    const usersQuery = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const fetchedUsers: any[] = [];
      snapshot.forEach((docSnap) => {
        fetchedUsers.push({ uid: docSnap.id, ...docSnap.data() });
      });
      setUsersList(fetchedUsers);
    }, (err) => console.error("Error fetching users:", err));

    // 4. Listen to all wallet transactions
    const walletLogsQuery = query(collection(db, 'walletTransactions'), orderBy('createdAt', 'desc'));
    const unsubscribeWalletLogs = onSnapshot(walletLogsQuery, (snapshot) => {
      const fetchedLogs: any[] = [];
      snapshot.forEach((docSnap) => {
        fetchedLogs.push({ id: docSnap.id, ...docSnap.data() });
      });
      setWalletLogs(fetchedLogs);
    }, (err) => console.error("Error fetching wallet logs:", err));

    // 5. Listen to all PWA installs
    const installsQuery = collection(db, 'pwaInstalls');
    const unsubscribeInstalls = onSnapshot(installsQuery, (snapshot) => {
      const fetchedInstalls: any[] = [];
      snapshot.forEach((docSnap) => {
        fetchedInstalls.push({ id: docSnap.id, ...docSnap.data() });
      });
      setPwaInstallsList(fetchedInstalls);
    }, (err) => console.error("Error fetching PWA installs:", err));

    // 6. Listen to Lucky Wheel Coupons
    const couponsQuery = query(collection(db, 'luckyWheelCoupons'), orderBy('createdAt', 'desc'));
    const unsubscribeCoupons = onSnapshot(couponsQuery, (snapshot) => {
      const fetchedCoupons: any[] = [];
      snapshot.forEach((docSnap) => {
        fetchedCoupons.push({ id: docSnap.id, ...docSnap.data() });
      });
      setLuckyCoupons(fetchedCoupons);
    }, (err) => console.error("Error fetching lucky coupons:", err));

    // 7. Listen to Lucky Wheel Spins
    const spinsQuery = query(collection(db, 'luckyWheelSpins'), orderBy('timestamp', 'desc'));
    const unsubscribeSpins = onSnapshot(spinsQuery, (snapshot) => {
      const fetchedSpins: any[] = [];
      snapshot.forEach((docSnap) => {
        fetchedSpins.push({ id: docSnap.id, ...docSnap.data() });
      });
      setLuckySpins(fetchedSpins);
    }, (err) => console.error("Error fetching lucky spins:", err));

    // 8. Listen to Lucky Wheel Config
    const configDocRef = doc(db, 'system/luckyWheelConfig');
    const unsubscribeConfig = onSnapshot(configDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setLuckyConfig(docSnap.data());
      } else {
        // Default config if not exists
        setLuckyConfig({
          'Better Luck Next Time': 38,
          'Free Delivery': 40,
          'Shawarma @ ₹79': 10,
          '₹50 OFF Coupon': 5,
          'Chicken Biryani @ ₹99': 7
        });
      }
    }, (err) => console.error("Error fetching lucky config:", err));

    return () => {
      unsubscribeOrders();
      unsubscribeRiders();
      unsubscribeUsers();
      unsubscribeWalletLogs();
      unsubscribeInstalls();
      unsubscribeCoupons();
      unsubscribeSpins();
      unsubscribeConfig();
    };
  }, [user]);

  // ── Leaflet Interactive Map for Rider Tracking ──
  useEffect(() => {
    if (activeTab === 'riders' && riderMapRef.current && !riderMapInstance.current) {
      riderMapInstance.current = L.map(riderMapRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([14.9643, 74.7121], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(riderMapInstance.current);

      const kitchenIcon = L.divIcon({
        html: '<div class="w-8 h-8 rounded-full bg-orange-600 border-2 border-white flex items-center justify-center shadow-lg font-bold text-sm">🍳</div>',
        className: 'custom-div-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      L.marker([14.9643, 74.7121], { icon: kitchenIcon }).addTo(riderMapInstance.current)
        .bindPopup('<b>Mom\'s Magic Kitchen (Base)</b>');
    }

    return () => {
      if (riderMapInstance.current) {
        riderMapInstance.current.remove();
        riderMapInstance.current = null;
        riderMarkersRef.current = {};
      }
    };
  }, [activeTab]);

  useEffect(() => {
    const map = riderMapInstance.current;
    if (!map || activeTab !== 'riders') return;

    const onlineWithCoords = ridersList.filter(r => 
      r.status === 'online' && 
      r.currentLocation?.lat && 
      r.currentLocation?.lng
    );

    const currentRiderIds = new Set(onlineWithCoords.map(r => r.uid));

    // Remove markers of riders who went offline or no coordinates
    Object.keys(riderMarkersRef.current).forEach(uid => {
      if (!currentRiderIds.has(uid)) {
        riderMarkersRef.current[uid].remove();
        delete riderMarkersRef.current[uid];
      }
    });

    const riderIcon = L.divIcon({
      html: '<div class="w-9 h-9 rounded-full bg-[#4CD964] border-2 border-white flex items-center justify-center shadow-2xl font-bold text-sm shadow-[#4CD964]/50 animate-pulse">🛵</div>',
      className: 'custom-div-icon',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    onlineWithCoords.forEach(rider => {
      const latlng: [number, number] = [rider.currentLocation.lat, rider.currentLocation.lng];
      
      const activeOrdersCount = realOrders.filter(o => 
        o.riderId === rider.uid && 
        o.status !== 'delivered' && 
        o.status !== 'completed' && 
        o.status !== 'cancelled'
      ).length;

      const popupContent = `
        <div class="text-xs text-left p-1 text-black">
          <h4 class="font-bold uppercase tracking-tight text-sm">${rider.name}</h4>
          <p class="mt-0.5"><b>Phone:</b> ${rider.phone}</p>
          <p><b>Active orders:</b> ${activeOrdersCount}</p>
          <p><b>Today's Earnings:</b> ₹${rider.earnings || 0}</p>
        </div>
      `;

      if (!riderMarkersRef.current[rider.uid]) {
        riderMarkersRef.current[rider.uid] = L.marker(latlng, { icon: riderIcon }).addTo(map)
          .bindPopup(popupContent);
      } else {
        const marker = riderMarkersRef.current[rider.uid];
        marker.setLatLng(latlng);
        marker.setPopupContent(popupContent);
      }
    });

    if (onlineWithCoords.length > 0) {
      const points: Array<[number, number]> = [[14.9643, 74.7121]];
      onlineWithCoords.forEach(r => points.push([r.currentLocation.lat, r.currentLocation.lng]));
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
    }
  }, [ridersList, activeTab, realOrders]);

  // ── Manual & Auto Rider Assignment ──
  const handleAssignRider = async (orderId: string, riderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      if (!riderId) {
        await updateDoc(orderRef, {
          riderId: '',
          riderStatus: ''
        });
        toast.success('Rider unassigned');
      } else {
        await updateDoc(orderRef, {
          riderId: riderId,
          riderStatus: 'assigned'
        });
        const selectedRider = ridersList.find(r => r.uid === riderId);
        toast.success(`Assigned to ${selectedRider?.name || 'Rider'}`);
      }
    } catch (err) {
      toast.error('Failed to assign rider');
    }
  };

  const handleAutoAssignRider = async (orderId: string) => {
    const onlineRiders = ridersList.filter(r => r.status === 'online');
    if (onlineRiders.length === 0) {
      toast.error('No riders are currently online!');
      return;
    }

    try {
      const activeCounts: { [key: string]: number } = {};
      onlineRiders.forEach(r => {
        activeCounts[r.uid] = 0;
      });

      realOrders.forEach(o => {
        if (o.riderId && o.riderId in activeCounts) {
          if (o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cancelled') {
            activeCounts[o.riderId]++;
          }
        }
      });

      let minRiderId = onlineRiders[0].uid;
      let minCount = activeCounts[minRiderId];

      onlineRiders.forEach(r => {
        if (activeCounts[r.uid] < minCount) {
          minCount = activeCounts[r.uid];
          minRiderId = r.uid;
        }
      });

      const bestRider = onlineRiders.find(r => r.uid === minRiderId);
      await updateDoc(doc(db, 'orders', orderId), {
        riderId: minRiderId,
        riderStatus: 'assigned'
      });

      toast.success(`Auto-assigned to ${bestRider?.name} (active: ${minCount} orders)`);
    } catch (err) {
      toast.error('Failed to auto-assign rider');
    }
  };

  // ── Customer Wallet balance adjustments ──
  const handleAdjustWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingUser) return;
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount === 0) {
      toast.error('Please enter a valid non-zero amount');
      return;
    }
    if (!adjustReason.trim()) {
      toast.error('Please enter a description for the audit logs');
      return;
    }

    setAdjustingLoading(true);
    try {
      const userRef = doc(db, 'users', adjustingUser.uid);
      const nextBalance = Math.max(0, (adjustingUser.walletBalance || 0) + amount);

      await runTransaction(db, async (transaction) => {
        transaction.update(userRef, {
          walletBalance: nextBalance
        });

        const newTransRef = doc(collection(db, 'walletTransactions'));
        transaction.set(newTransRef, {
          userId: adjustingUser.uid,
          amount: amount,
          type: 'admin_adjustment',
          description: adjustReason.trim(),
          createdAt: new Date().toISOString()
        });
      });

      toast.success(`Wallet balance updated to ₹${nextBalance}!`);
      setAdjustingUser(null);
      setAdjustAmount('');
      setAdjustReason('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update wallet balance');
    } finally {
      setAdjustingLoading(false);
    }
  };

  // ── Handle Order Status Update (Firestore + WhatsApp) ──
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, phone: string, trackingLink?: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const updateData: any = { status: newStatus };
      if (trackingLink !== undefined) {
        updateData.trackingLink = trackingLink;
      }
      await updateDoc(orderRef, updateData);
      
      let message = '';
      if (newStatus === 'Out For Delivery') {
        message = `🚚 Your Moms Magic order is on the way!\\n\\nTrack your order live:\\n${trackingLink || `https://momsmagic.shop/track/${orderId}`}\\n\\nThank you for ordering from Moms Magic ❤️`;
      } else {
        message = `*Moms Magic Update* 🍲\\n\\nYour order (ID: ${orderId.slice(0,8)}) is now *${newStatus.toUpperCase()}*.\\n\\nThank you for ordering from Moms Magic ❤️`;
      }
      
      let cleanPhone = phone.replace(/[^0-9]/g, '');
      if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
      
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      
      toast.success(`Status updated! Redirecting to WhatsApp...`);
      setTimeout(() => {
        window.location.href = waUrl;
      }, 500);
    } catch (err) {
      toast.error('Failed to update order status');
    }
  };

  // ── Handle Delete Order (Firestore) ──
  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      toast.success('Order deleted successfully');
    } catch (err) {
      toast.error('Failed to delete order');
    }
  };

  // ── Handle Share Location Save (Firestore) ──
  const handleSaveTrackingLink = () => {
    if (!trackingModalOrder || !trackingUrl.trim()) {
      toast.error('Please enter a valid link');
      return;
    }
    const order = realOrders.find(o => o.id === trackingModalOrder);
    if (order) {
      handleUpdateOrderStatus(order.id, 'Out For Delivery', order.userPhone, trackingUrl.trim());
      setTrackingModalOrder(null);
      setTrackingUrl('');
    }
  };

  // ── Lucky Wheel Handlers ──
  const handleGenerateOTP = async () => {
    setGeneratingOTP(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      await addDoc(collection(db, 'luckyWheelCoupons'), {
        code,
        status: 'unused',
        createdAt: new Date().toISOString()
      });
      toast.success(`Generated new OTP: ${code}`);
    } catch (err) {
      toast.error('Failed to generate OTP');
    } finally {
      setGeneratingOTP(false);
    }
  };

  const handleMarkRedeemed = async (spinId: string) => {
    try {
      await updateDoc(doc(db, 'luckyWheelSpins'), {
        status: 'redeemed'
      });
      toast.success('Marked as redeemed!');
    } catch (err) {
      toast.error('Failed to mark redeemed');
    }
  };

  const handleUpdateProbability = async (prize: string, value: number) => {
    try {
      await setDoc(doc(db, 'system/luckyWheelConfig'), {
        [prize]: value
      }, { merge: true });
      toast.success('Probability updated!');
    } catch (err) {
      toast.error('Failed to update probability');
    }
  };

  // Handle Authentication
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter email and password');
      return;
    }
    
    setIsLoggingIn(true);

    // Credentials are checked by /api/admin-login, which reads ADMIN_EMAIL and
    // ADMIN_PASSWORD from the hosting environment. They used to be compared
    // here, so the real email and password were literals in the bundle every
    // visitor downloads. If that endpoint is not configured it answers 501 and
    // we fall through to Firebase Auth, so there is always a way in.
    try {
      const response = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser({
          id: 'env-admin',
          name: 'Admin',
          email: data.email || email.trim(),
          role: 'super_admin' as const,
        });
        localStorage.setItem('moms_magic_admin_token', data.token);
        toast.success('Welcome back, Admin!');
        setIsLoggingIn(false);
        return;
      }

      // 401 means the endpoint is configured and these credentials are wrong,
      // so there is no point asking Firebase the same question.
      if (response.status === 401) {
        toast.error('Invalid admin credentials');
        setIsLoggingIn(false);
        return;
      }
    } catch {
      // Endpoint unreachable (offline, or running without the serverless
      // functions). Fall through to Firebase Auth.
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const adminUser = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'Admin',
        email: firebaseUser.email || '',
        role: 'super_admin' as const
      };
      
      setUser(adminUser);
      localStorage.setItem('moms_magic_admin_token', await firebaseUser.getIdToken());
      toast.success(`Welcome back, ${adminUser.name}!`);
    } catch (err: any) {
      toast.error(err.message || 'Invalid admin credentials');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Secure Settings Save Handler
  const handleSaveSettings = async (updates: Partial<typeof settings> = {}) => {
    setIsSaving(true);
    const token = localStorage.getItem('moms_magic_admin_token') || '';
    
    // Combine edits
    const activeUpdates = { ...localSettings, ...updates };
    
    const success = await updateSettings(activeUpdates, token);
    setIsSaving(false);
    if (success) {
      toast.success('System settings saved to Cloud!');
    } else {
      toast.error('Cloud Sync failed. Saved locally instead.');
    }
  };

  // Toggling operational shortcuts directly
  const handleToggleState = async (key: keyof typeof settings, value: any) => {
    const token = localStorage.getItem('moms_magic_admin_token') || '';
    
    // UI optimistic update first
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    const success = await updateSettings({ [key]: value }, token);
    
    if (success) {
      toast.success(`${key.replace(/([A-Z])/g, ' $1')} updated on Cloud!`);
    } else {
      toast.error('Cloud Sync failed. Applied locally.');
    }
  };

  // Emergency lockdown trigger
  const handleEmergencyTrigger = async () => {
    const token = localStorage.getItem('moms_magic_admin_token') || '';
    const success = await triggerEmergencyStop(token);
    if (success) {
      toast.error('SYSTEM SHUTDOWN ACTIVATED! All ordering pipelines locked.', { icon: '🚨', duration: 4000 });
    }
  };

  // Emergency lockdown reset
  const handleEmergencyReset = async () => {
    const token = localStorage.getItem('moms_magic_admin_token') || '';
    const success = await resetEmergencyStop(token);
    if (success) {
      toast.success('System restored. Ordering channels online.', { icon: '✅' });
    }
  };

  // Determine global live status details
  const getLiveStatus = () => {
    if (settings.emergencyStop) return { text: 'Emergency Stop Active', color: 'bg-red-500 shadow-red-500/50', border: 'border-red-500/20' };
    if (settings.websiteStatus === 'OFF') return { text: 'Website Offline', color: 'bg-orange-500 shadow-orange-500/50', border: 'border-orange-500/20' };
    if (settings.festivalMode) return { text: 'Festival Mode Active', color: 'bg-purple-500 shadow-purple-500/50', border: 'border-purple-500/20' };
    if (settings.deliveryPause) return { text: 'Delivery Paused', color: 'bg-amber-500 shadow-amber-500/50', border: 'border-amber-500/20' };
    return { text: 'Accepting Orders', color: 'bg-emerald-500 shadow-emerald-500/50', border: 'border-emerald-500/20' };
  };

  const statusInfo = getLiveStatus();

  // Format local dates nicely
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    } catch (e) {
      return dateStr;
    }
  };

  // RENDER LOGIN GATE IF NOT LOGGED IN
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Glow Spheres */}
        <div className="absolute top-[-30%] right-[-10%] w-[70%] h-[70%] bg-[#FF4D00]/10 rounded-full blur-[250px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-[-30%] left-[-10%] w-[60%] h-[60%] bg-[#FFB700]/10 rounded-full blur-[250px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          {/* Brand Logo & Name */}
          <div className="text-center mb-10 space-y-4">
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-[32px] bg-gradient-to-tr from-[#FF4D00] to-[#FFB700] opacity-20 blur-md" />
              <div className="w-18 h-18 rounded-[24px] bg-gradient-to-br from-[#FF4D00] to-[#FFB700] flex items-center justify-center border border-white/10 shadow-2xl relative rotate-6">
                <Lock className="w-8 h-8 text-matte-black" />
              </div>
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-black italic tracking-tighter uppercase">
                Moms <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4D00] to-[#FFB700]">Magic</span>
              </h1>
              <p className="text-white/40 text-[9px] font-black uppercase tracking-[4px]">Secure Admin Portal</p>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-[#121620]/80 backdrop-blur-2xl border border-white/5 rounded-[35px] p-8 shadow-[0_30px_60px_rgba(0,0,0,0.6)] space-y-8">
            <div className="space-y-2 border-b border-white/5 pb-5">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#FFB700]" /> Sign In Required
              </h2>
              <p className="text-white/40 text-xs font-semibold leading-relaxed">Access is restricted to verified restaurant operators.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-[#FFB700]/60 uppercase tracking-[3px] ml-1">Operator Email</label>
                <input 
                  required
                  type="email" 
                  placeholder="name@momsmagic.com" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-6 py-4.5 bg-white/5 rounded-2xl border border-white/10 focus:border-[#FFB700]/30 outline-none font-bold text-sm text-white transition-all placeholder:text-white/15"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-[#FFB700]/60 uppercase tracking-[3px] ml-1">Security Key</label>
                <input 
                  required
                  type="password" 
                  placeholder="••••••••••••" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-6 py-4.5 bg-white/5 rounded-2xl border border-white/10 focus:border-[#FFB700]/30 outline-none font-bold text-sm text-white transition-all placeholder:text-white/15"
                />
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={isLoggingIn}
                className="w-full h-16 rounded-2xl bg-gradient-to-r from-[#FF4D00] to-[#FFB700] text-matte-black font-black text-xs uppercase tracking-[3px] shadow-lg shadow-[#FF4D00]/20 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-matte-black" />
                    Verifying Identity...
                  </>
                ) : (
                  <>
                    Verify & Unlock
                    <ChevronRight className="w-4 h-4 text-matte-black" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="text-center mt-6">
            <span className="text-white/20 text-[9px] font-bold uppercase tracking-widest">Authorized Operations Only</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // MAIN ADMIN CONTROL INTERFACE
  return (
    <div className="min-h-screen bg-[#0B0E14] text-white font-sans pb-32 relative">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#161B2A]/40 to-transparent pointer-events-none" />
      <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-[#FF4D00]/5 rounded-full blur-[200px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] w-[50%] h-[50%] bg-[#FFB700]/5 rounded-full blur-[200px] pointer-events-none" />

      {/* Header Container */}
      <header className="sticky top-0 z-[50] bg-[#0F121C]/90 backdrop-blur-2xl border-b border-white/5 py-5 px-6">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#FF4D00] to-[#FFB700] flex items-center justify-center border border-white/10 shadow-lg shrink-0">
              <Sliders className="w-6 h-6 text-matte-black" />
            </div>
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">
                Control <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4D00] to-[#FFB700]">Desk</span>
              </h1>
              <p className="text-white/40 text-[8px] font-black uppercase tracking-[3px] mt-1">Moms Magic Operator Portal</p>
            </div>
          </div>

          {/* Quick Stats Panel & Profile */}
          <div className="flex items-center gap-4">
            {/* Live Indicator */}
            <div className={`hidden sm:flex items-center gap-2.5 px-4 py-2 bg-white/5 border ${statusInfo.border} rounded-full text-[9px] font-black uppercase tracking-wider`}>
              <span className={`w-2.5 h-2.5 rounded-full ${statusInfo.color} animate-pulse`} />
              {statusInfo.text}
            </div>

            {/* Logout Button */}
            <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-1.5 border border-white/5">
              <div className="px-3.5 py-1.5 text-left hidden md:block">
                <p className="text-xs font-black uppercase tracking-wider leading-none text-white">{user.name}</p>
                <p className="text-[8px] font-bold text-white/30 tracking-widest mt-1 uppercase">Super Admin</p>
              </div>
              <button 
                onClick={() => {
                  logout();
                  localStorage.removeItem('moms_magic_admin_token');
                  toast.success('Logged out successfully');
                }}
                className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-all border border-red-500/15"
                title="Logout Operator Session"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Switcher */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 pt-8 flex gap-4 relative z-25 text-left overflow-x-auto no-scrollbar pb-2">
        <button
          onClick={() => {
            playSound(SOUNDS.CLICK);
            setActiveTab('orders');
          }}
          className={`px-8 h-14 shrink-0 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-2 cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-matte-black border-emerald-400 shadow-[0_10px_20px_rgba(16,185,129,0.15)]'
              : 'bg-white/5 border-white/5 text-white/50 hover:text-white hover:border-white/10'
          }`}
        >
          📦 Live Orders
        </button>
        <button
          onClick={() => {
            playSound(SOUNDS.CLICK);
            setActiveTab('analytics');
          }}
          className={`px-8 h-14 shrink-0 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-2 cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-gradient-to-r from-blue-500 to-blue-400 text-matte-black border-blue-400 shadow-[0_10px_20px_rgba(59,130,246,0.15)]'
              : 'bg-white/5 border-white/5 text-white/50 hover:text-white hover:border-white/10'
          }`}
        >
          📊 Analytics
        </button>
        <button
          onClick={() => {
            playSound(SOUNDS.CLICK);
            setActiveTab('riders');
          }}
          className={`px-8 h-14 shrink-0 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-2 cursor-pointer ${
            activeTab === 'riders'
              ? 'bg-gradient-to-r from-indigo-500 to-indigo-400 text-matte-black border-indigo-400 shadow-[0_10px_20px_rgba(99,102,241,0.15)]'
              : 'bg-white/5 border-white/5 text-white/50 hover:text-white hover:border-white/10'
          }`}
        >
          🛵 Riders Map
        </button>
        <button
          onClick={() => {
            playSound(SOUNDS.CLICK);
            setActiveTab('customers');
          }}
          className={`px-8 h-14 shrink-0 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-2 cursor-pointer ${
            activeTab === 'customers'
              ? 'bg-gradient-to-r from-pink-500 to-pink-400 text-matte-black border-pink-400 shadow-[0_10px_20px_rgba(236,72,153,0.15)]'
              : 'bg-white/5 border-white/5 text-white/50 hover:text-white hover:border-white/10'
          }`}
        >
          👥 Customers
        </button>
        <button
          onClick={() => {
            playSound(SOUNDS.CLICK);
            setActiveTab('walletLogs');
          }}
          className={`px-8 h-14 shrink-0 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-2 cursor-pointer ${
            activeTab === 'walletLogs'
              ? 'bg-gradient-to-r from-teal-500 to-teal-400 text-matte-black border-teal-400 shadow-[0_10px_20px_rgba(20,184,166,0.15)]'
              : 'bg-white/5 border-white/5 text-white/50 hover:text-white hover:border-white/10'
          }`}
        >
          💳 Wallet Logs
        </button>
        <button
          onClick={() => {
            playSound(SOUNDS.CLICK);
            setActiveTab('system');
          }}
          className={`px-8 h-14 shrink-0 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-2 cursor-pointer ${
            activeTab === 'system'
              ? 'bg-gradient-to-r from-[#FF4D00] to-[#FFB700] text-matte-black border-[#FFB700] shadow-[0_10px_20px_rgba(255,77,0,0.15)]'
              : 'bg-white/5 border-white/5 text-white/50 hover:text-white hover:border-white/10'
          }`}
        >
          ⚙️ System Controls
        </button>
        <button
          onClick={() => {
            playSound(SOUNDS.CLICK);
            setActiveTab('menu');
          }}
          className={`px-8 h-14 shrink-0 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-2 cursor-pointer ${
            activeTab === 'menu'
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-matte-black border-amber-400 shadow-[0_10px_20px_rgba(245,158,11,0.15)]'
              : 'bg-white/5 border-white/5 text-white/50 hover:text-white hover:border-white/10'
          }`}
        >
          🍔 Menu Manager
        </button>
        <button
          onClick={() => {
            playSound(SOUNDS.CLICK);
            setActiveTab('coupons');
          }}
          className={`px-8 h-14 shrink-0 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-2 cursor-pointer ${
            activeTab === 'coupons'
              ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white border-fuchsia-400 shadow-[0_10px_20px_rgba(217,70,239,0.15)]'
              : 'bg-white/5 border-white/5 text-white/50 hover:text-white hover:border-white/10'
          }`}
        >
          <Ticket className="w-4 h-4" /> Coupons
        </button>
        <button
          onClick={() => {
            playSound(SOUNDS.CLICK);
            setActiveTab('luckyWheel');
          }}
          className={`px-8 h-14 shrink-0 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-2 cursor-pointer ${
            activeTab === 'luckyWheel'
              ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-matte-black border-yellow-400 shadow-[0_10px_20px_rgba(234,179,8,0.15)]'
              : 'bg-white/5 border-white/5 text-white/50 hover:text-white hover:border-white/10'
          }`}
        >
          🎡 Lucky Wheel
        </button>

        <button
          onClick={() => {
            playSound(SOUNDS.CLICK);
            setActiveTab('notifications');
          }}
          className={`px-8 h-14 shrink-0 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-2 cursor-pointer ${
            activeTab === 'notifications'
              ? 'bg-gradient-to-r from-[#4CD964] to-[#3AC152] text-white border-[#3AC152] shadow-[0_10px_20px_rgba(76,217,100,0.15)]'
              : 'bg-white/5 border-white/5 text-white/50 hover:text-white hover:border-white/10'
          }`}
        >
          🔔 Send Notifications
        </button>
      </div>

      {/* Main Content Layout */}
      {activeTab === 'orders' ? (
        <main className="max-w-[1400px] mx-auto p-6 md:p-10 relative z-10">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Live Order Tracker</h2>
            <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Live Sync Active
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {realOrders.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white/5 border border-white/10 rounded-3xl">
                <PackageSearch className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/40 font-bold uppercase tracking-widest text-sm">No Orders Yet</p>
              </div>
            ) : (
              realOrders.map((order) => {
                const statusColor = 
                  order.status === 'Confirmed' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                  order.status === 'Preparing' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
                  order.status === 'Out For Delivery' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' :
                  order.status === 'Delivered' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                  'text-gray-400 bg-gray-500/10 border-gray-500/20';

                return (
                  <div key={order.id} className="bg-[#121624] border border-white/5 rounded-[30px] p-6 space-y-4 hover:border-white/10 transition-colors">
                    <div className="flex items-start justify-between border-b border-white/5 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black uppercase text-emerald-400 tracking-widest">ID: {order.id.slice(0,8)}</p>
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="text-red-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 text-xs font-semibold cursor-pointer shrink-0"
                            title="Delete Order Record"
                          >
                            🗑️
                          </button>
                        </div>
                        <h3 className="text-lg font-black text-white italic truncate mt-1">{order.userName}</h3>
                        <p className="text-xs font-bold text-white/40 tracking-widest mt-1">{order.userPhone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black italic text-brand">₹{order.grandTotal}</p>
                        <span className={`inline-block mt-2 px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${statusColor}`}>
                          {order.status || 'Pending'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Order Items:</p>
                      {order.items.slice(0,3).map((item: any, idx: number) => {
                        const itemHotel = item.hotelName || getItemHotel(item)?.name;
                        return (
                          <div key={idx} className="flex justify-between gap-2 text-xs font-medium text-white/80">
                            <span>{item.finalQuantity || item.quantity || 1}x {item.name || 'Unnamed item'}</span>
                            {itemHotel && (
                              <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-amber-300/90">
                                {itemHotel}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {order.items.length > 3 && <p className="text-[10px] text-white/40 italic">+{order.items.length - 3} more</p>}
                    </div>

                    {/* Rider Assignment section */}
                    <div className="pt-3 border-t border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white/45 uppercase tracking-wider text-[9px]">Delivery Partner</span>
                        {order.riderId ? (
                          <span className="font-black text-[#4CD964] uppercase text-[9px] tracking-wide flex items-center gap-1">
                            🛵 {ridersList.find(r => r.uid === order.riderId)?.name || 'Assigned'}
                            <span className="text-[8px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white/50 lowercase">
                              ({order.riderStatus || 'assigned'})
                            </span>
                          </span>
                        ) : (
                          <span className="font-black text-red-400 uppercase text-[9px] tracking-wide">
                            ❌ Unassigned
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <select
                          value={order.riderId || ''}
                          onChange={(e) => handleAssignRider(order.id, e.target.value)}
                          className="flex-1 bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white/80 outline-none focus:border-[#4CD964]/40"
                        >
                          <option value="">MANUAL ASSIGN...</option>
                          {ridersList.map(r => (
                            <option key={r.uid} value={r.uid}>
                              {r.name} ({r.status === 'online' ? '🟢 online' : '🔴 offline'})
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => handleAutoAssignRider(order.id)}
                          className="px-3.5 py-2 rounded-xl bg-[#4CD964]/10 hover:bg-[#4CD964]/20 border border-[#4CD964]/20 text-[#4CD964] font-black text-[9px] uppercase tracking-wider transition-colors shrink-0"
                          title="Auto-Assign Rider"
                        >
                          ⚡ Auto
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5">
                      <button onClick={() => handleUpdateOrderStatus(order.id, 'Confirmed', order.userPhone)} className="py-2.5 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 text-[9px] font-black uppercase tracking-widest transition-colors">
                        ✅ Confirmed
                      </button>
                      <button onClick={() => handleUpdateOrderStatus(order.id, 'Preparing', order.userPhone)} className="py-2.5 rounded-xl bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 text-[9px] font-black uppercase tracking-widest transition-colors">
                        👨‍🍳 Preparing
                      </button>
                      <button onClick={() => setTrackingModalOrder(order.id)} className="py-2.5 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 text-[9px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1">
                        📍 Live Track Link
                      </button>
                      <button onClick={() => handleUpdateOrderStatus(order.id, 'Delivered', order.userPhone)} className="py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest transition-colors">
                        🎉 Delivered
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Tracking Link Modal */}
          {trackingModalOrder && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#121620] w-full max-w-md rounded-[30px] p-8 border border-white/10 shadow-2xl relative">
                <button onClick={() => setTrackingModalOrder(null)} className="absolute top-4 right-4 p-2 text-white/40 hover:text-white">✕</button>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tight text-purple-400 flex items-center gap-2">
                      📍 Share Live Location
                    </h3>
                    <p className="text-xs font-semibold text-white/50 mt-1">Provide the Google Maps tracking link to the customer.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Tracking Link URL</label>
                    <input 
                      type="url" 
                      placeholder="https://maps.google.com/..." 
                      value={trackingUrl}
                      onChange={(e) => setTrackingUrl(e.target.value)}
                      className="w-full px-5 py-4 bg-white/5 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-purple-500/50 transition-all text-xs"
                    />
                  </div>
                  <button onClick={handleSaveTrackingLink} className="w-full h-14 bg-purple-500 hover:bg-purple-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all flex items-center justify-center gap-2">
                    Set Out For Delivery & Notify
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </main>
      ) : activeTab === 'analytics' ? (
        <main className="max-w-[1400px] mx-auto p-6 md:p-10 relative z-10 text-left space-y-10">
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Platform Analytics</h2>
            <p className="text-white/40 text-xs mt-1 font-semibold">Real-time business performance overview metrics.</p>
          </div>

          {/* Grid Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {/* PWA Installs Card */}
            <div className="bg-[#121620]/60 border border-[#4CD964]/20 p-6 rounded-[25px] relative overflow-hidden col-span-2 lg:col-span-4 text-left">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#4CD964]/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <span className="p-3 bg-[#4CD964]/10 text-[#4CD964] rounded-xl text-lg">📲</span>
                  <div>
                    <h4 className="font-extrabold text-white text-base">PWA Installation Analytics</h4>
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mt-0.5">App install tracking & user signups</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4CD964] animate-pulse" />
                  <span className="text-[10px] text-white/60 font-black uppercase tracking-wider">Live Tracking Active</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6">
                <div>
                  <p className="text-white/45 text-[9px] font-black uppercase tracking-widest leading-none">Total PWA Installs</p>
                  <h3 className="text-3xl font-black italic text-white mt-3">{pwaInstallsList.length}</h3>
                </div>
                <div>
                  <p className="text-white/45 text-[9px] font-black uppercase tracking-widest leading-none">Registered Users</p>
                  <h3 className="text-3xl font-black italic text-[#4CD964] mt-3">{usersList.length}</h3>
                </div>
                <div>
                  <p className="text-white/45 text-[9px] font-black uppercase tracking-widest leading-none">Daily Installs (Today)</p>
                  <h3 className="text-3xl font-black italic text-blue-400 mt-3">
                    {pwaInstallsList.filter(inst => inst.installedAt && new Date(inst.installedAt).toDateString() === new Date().toDateString()).length}
                  </h3>
                </div>
                <div>
                  <p className="text-white/45 text-[9px] font-black uppercase tracking-widest leading-none">Monthly Installs</p>
                  <h3 className="text-3xl font-black italic text-pink-400 mt-3">
                    {pwaInstallsList.filter(inst => {
                      if (!inst.installedAt) return false;
                      const d = new Date(inst.installedAt);
                      const now = new Date();
                      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                    }).length}
                  </h3>
                </div>
              </div>
            </div>

            <div className="bg-[#121620]/60 border border-white/5 p-6 rounded-[25px]">
              <div className="flex items-center gap-3">
                <span className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">📦</span>
                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest leading-none">Total Orders</p>
              </div>
              <h3 className="text-3xl font-black italic text-white mt-4">{realOrders.length}</h3>
            </div>

            <div className="bg-[#121620]/60 border border-white/5 p-6 rounded-[25px]">
              <div className="flex items-center gap-3">
                <span className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">💵</span>
                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest leading-none">Delivered Revenue</p>
              </div>
              <h3 className="text-3xl font-black italic text-emerald-400 mt-4">
                ₹{realOrders.filter(o => o.status === 'delivered' || o.status === 'completed').reduce((sum, o) => sum + (o.grandTotal || 0), 0)}
              </h3>
            </div>

            <div className="bg-[#121620]/60 border border-white/5 p-6 rounded-[25px]">
              <div className="flex items-center gap-3">
                <span className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">🛵</span>
                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest leading-none">Active Riders</p>
              </div>
              <h3 className="text-3xl font-black italic text-white mt-4">{ridersList.filter(r => r.status === 'online').length} <span className="text-xs text-white/30 font-bold">online</span></h3>
            </div>

            <div className="bg-[#121620]/60 border border-white/5 p-6 rounded-[25px]">
              <div className="flex items-center gap-3">
                <span className="p-3 bg-pink-500/10 text-pink-400 rounded-xl">👥</span>
                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest leading-none">Registered Users</p>
              </div>
              <h3 className="text-3xl font-black italic text-white mt-4">{usersList.length}</h3>
            </div>
          </div>

          {/* Revenue and Orders Analytics Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#121620]/50 border border-white/5 p-8 rounded-[35px] space-y-6">
              <h3 className="text-lg font-black italic uppercase tracking-tight border-b border-white/5 pb-4">Revenue Breakdown</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-white/60">Delivered Orders Revenue:</span>
                  <span className="text-emerald-400 font-extrabold">₹{realOrders.filter(o => o.status === 'delivered' || o.status === 'completed').reduce((sum, o) => sum + (o.grandTotal || 0), 0)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-white/60">In-progress Orders Value:</span>
                  <span className="text-blue-400 font-extrabold">₹{realOrders.filter(o => o.status === 'pending' || o.status === 'Preparing' || o.status === 'Out For Delivery').reduce((sum, o) => sum + (o.grandTotal || 0), 0)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-white/60">Cancelled Orders Value:</span>
                  <span className="text-red-400 font-extrabold">₹{realOrders.filter(o => o.status === 'cancelled').reduce((sum, o) => sum + (o.grandTotal || 0), 0)}</span>
                </div>
                <div className="h-px bg-white/5 my-2" />
                <div className="flex justify-between items-center text-base font-black uppercase">
                  <span>Gross Sales Total:</span>
                  <span className="text-white">₹{realOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + (o.grandTotal || 0), 0)}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#121620]/50 border border-white/5 p-8 rounded-[35px] space-y-6">
              <h3 className="text-lg font-black italic uppercase tracking-tight border-b border-white/5 pb-4">Order Pipeline Volume</h3>
              <div className="space-y-4">
                {['pending', 'Preparing', 'Out For Delivery', 'delivered', 'cancelled'].map(status => {
                  const count = realOrders.filter(o => o.status === status).length;
                  const percentage = realOrders.length ? Math.round((count / realOrders.length) * 100) : 0;
                  return (
                    <div key={status} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-white/70">
                        <span>{status === 'pending' ? 'Pending Confirmation' : status}</span>
                        <span>{count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            status === 'pending' ? 'bg-blue-500' :
                            status === 'Preparing' ? 'bg-orange-500' :
                            status === 'Out For Delivery' ? 'bg-purple-500' :
                            status === 'delivered' ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      ) : activeTab === 'riders' ? (
        <main className="max-w-[1400px] mx-auto p-6 md:p-10 relative z-10 text-left space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Delivery Partner Operations</h2>
              <p className="text-white/40 text-xs mt-1 font-semibold">Monitor active riders, earnings, and real-time geolocations.</p>
            </div>
            <div className="px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-emerald-500/50 animate-pulse" />
              {ridersList.filter(r => r.status === 'online').length} Riders Online
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Riders List */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="text-xs font-black uppercase text-white/50 tracking-widest">Riders Directory</h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
                {ridersList.length === 0 ? (
                  <div className="py-12 text-center bg-white/5 border border-white/5 rounded-2xl">
                    <p className="text-xs text-white/30 font-bold uppercase tracking-wider">No registered riders found</p>
                  </div>
                ) : (
                  ridersList.map(rider => (
                    <div key={rider.uid} className="bg-[#121620]/60 border border-white/5 p-4.5 rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 font-sans">
                        <div className={`w-3 h-3 rounded-full shrink-0 ${rider.status === 'online' ? 'bg-[#4CD964] shadow-[0_0_10px_#4CD964]' : 'bg-red-500'}`} />
                        <div>
                          <h4 className="font-extrabold text-white text-sm">{rider.name}</h4>
                          <p className="text-[10px] text-white/40 font-semibold">{rider.phone || 'No phone'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Commission</p>
                        <p className="font-black italic text-[#4CD964] text-sm">₹{rider.earnings || 0}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: Live Rider Map */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-xs font-black uppercase text-white/50 tracking-widest flex items-center gap-2">
                📍 Live Geolocation Tracking Map
              </h3>
              <div className="w-full h-[500px] rounded-[30px] overflow-hidden border border-white/10 relative z-10 bg-neutral-900 shadow-2xl">
                <div ref={riderMapRef} className="w-full h-full absolute inset-0" />
              </div>
            </div>
          </div>
        </main>
      ) : activeTab === 'customers' ? (
        <main className="max-w-[1400px] mx-auto p-6 md:p-10 relative z-10 text-left space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Customer Database</h2>
              <p className="text-white/40 text-xs mt-1 font-semibold">View user profiles, reward points, and manage wallet credits.</p>
            </div>
            
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search customers..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#121620] rounded-xl border border-white/10 text-white font-bold outline-none focus:border-pink-500/30 transition-all text-xs"
              />
            </div>
          </div>

          {/* Customers Table */}
          <div className="bg-[#121620]/50 border border-white/5 rounded-[35px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-6 py-4.5 text-[9px] font-black text-white/40 uppercase tracking-widest">Customer</th>
                    <th className="px-6 py-4.5 text-[9px] font-black text-white/40 uppercase tracking-widest">Email & Phone</th>
                    <th className="px-6 py-4.5 text-[9px] font-black text-white/40 uppercase tracking-widest">Wallet Balance</th>
                    <th className="px-6 py-4.5 text-[9px] font-black text-white/40 uppercase tracking-widest">Reward Points</th>
                    <th className="px-6 py-4.5 text-[9px] font-black text-white/40 uppercase tracking-widest">Saved Addresses</th>
                    <th className="px-6 py-4.5 text-[9px] font-black text-white/40 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {usersList.filter(user => 
                    user.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                    user.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                    user.phone?.includes(customerSearch)
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-white/30 text-xs font-bold uppercase tracking-widest">
                        No matching customers found
                      </td>
                    </tr>
                  ) : (
                    usersList.filter(user => 
                      user.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                      user.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                      user.phone?.includes(customerSearch)
                    ).map(u => (
                      <tr key={u.uid} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-6 py-4.5">
                          <h4 className="font-extrabold text-white text-sm">{u.name}</h4>
                          <span className="text-[8px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white/30 uppercase tracking-wider font-mono">
                            ID: {u.uid.slice(0, 8)}
                          </span>
                        </td>
                        <td className="px-6 py-4.5">
                          <p className="text-xs text-white/80 font-bold">{u.email}</p>
                          <p className="text-[10px] text-white/40 font-semibold mt-0.5">{u.phone || 'No phone number'}</p>
                        </td>
                        <td className="px-6 py-4.5">
                          <span className="text-sm font-black text-[#4CD964] italic">₹{u.walletBalance || 0}</span>
                        </td>
                        <td className="px-6 py-4.5">
                          <span className="text-xs font-bold text-amber-400">★ {u.rewardPoints || 0} pts</span>
                        </td>
                        <td className="px-6 py-4.5 text-xs text-white/60 font-semibold">
                          {u.addresses?.length || 0} locations
                        </td>
                        <td className="px-6 py-4.5 text-right">
                          <button
                            onClick={() => {
                              playSound(SOUNDS.CLICK);
                              setAdjustingUser(u);
                            }}
                            className="bg-white/5 border border-white/10 hover:border-pink-500/30 text-white hover:text-pink-400 px-4.5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                          >
                            Adjust Wallet
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Wallet Adjustment Dialog Modal */}
          {adjustingUser && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#121620] w-full max-w-md rounded-[30px] p-8 border border-white/10 shadow-2xl relative text-left space-y-6"
              >
                <button 
                  onClick={() => setAdjustingUser(null)} 
                  className="absolute top-4 right-4 p-2 text-white/40 hover:text-white"
                >
                  ✕
                </button>
                <div>
                  <h3 className="text-xl font-black italic uppercase tracking-tight text-pink-400">
                    💳 Adjust User Wallet
                  </h3>
                  <p className="text-xs font-semibold text-white/50 mt-1">
                    Credit or debit wallet balance for <b>{adjustingUser.name}</b>.
                  </p>
                </div>

                <form onSubmit={handleAdjustWallet} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Amount (e.g. +100 to Add, -50 to Deduct)</label>
                    <input
                      type="number"
                      placeholder="₹0.00"
                      required
                      value={adjustAmount}
                      onChange={e => setAdjustAmount(e.target.value)}
                      className="w-full px-5 py-4 bg-[#050505] rounded-xl border border-white/10 text-white font-bold outline-none focus:border-pink-500/50 transition-all text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Adjustment Reason (Audit trail description)</label>
                    <input
                      type="text"
                      placeholder="e.g. Good-will gesture bonus credit"
                      required
                      value={adjustReason}
                      onChange={e => setAdjustReason(e.target.value)}
                      className="w-full px-5 py-4 bg-[#050505] rounded-xl border border-white/10 text-white font-bold outline-none focus:border-pink-500/50 transition-all text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={adjustingLoading}
                    className="w-full h-14 bg-pink-500 hover:bg-pink-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {adjustingLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                        Updating Database...
                      </>
                    ) : (
                      <>Commit Transaction</>
                    )}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </main>
      ) : activeTab === 'walletLogs' ? (
        <main className="max-w-[1400px] mx-auto p-6 md:p-10 relative z-10 text-left space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Wallet Transaction Logs</h2>
              <p className="text-white/40 text-xs mt-1 font-semibold">Audit trail database of all platform credits and debits.</p>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Type Filter */}
              <select
                value={walletTypeFilter}
                onChange={e => {
                  playSound(SOUNDS.CLICK);
                  setWalletTypeFilter(e.target.value);
                }}
                className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-white/70 font-black outline-none focus:border-teal-500/30 transition-all text-xs uppercase tracking-wider"
              >
                <option value="All">All Types</option>
                <option value="welcome_bonus">Welcome Bonus</option>
                <option value="order_payment">Order Payment</option>
                <option value="admin_adjustment">Admin Adjustment</option>
              </select>

              {/* Search Log Description */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={walletSearch}
                  onChange={e => setWalletSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 rounded-xl border border-white/10 text-white font-bold outline-none focus:border-teal-500/30 transition-all text-xs"
                />
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-[#121620]/50 border border-white/5 rounded-[35px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-6 py-4.5 text-[9px] font-black text-white/40 uppercase tracking-widest">Transaction ID</th>
                    <th className="px-6 py-4.5 text-[9px] font-black text-white/40 uppercase tracking-widest">Customer</th>
                    <th className="px-6 py-4.5 text-[9px] font-black text-white/40 uppercase tracking-widest">Amount</th>
                    <th className="px-6 py-4.5 text-[9px] font-black text-white/40 uppercase tracking-widest">Type</th>
                    <th className="px-6 py-4.5 text-[9px] font-black text-white/40 uppercase tracking-widest">Description</th>
                    <th className="px-6 py-4.5 text-[9px] font-black text-white/40 uppercase tracking-widest">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {walletLogs.filter(log => {
                    const matchesSearch = log.description?.toLowerCase().includes(walletSearch.toLowerCase()) || log.userId?.toLowerCase().includes(walletSearch.toLowerCase());
                    const matchesType = walletTypeFilter === 'All' || log.type === walletTypeFilter;
                    return matchesSearch && matchesType;
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-white/30 text-xs font-bold uppercase tracking-widest">
                        No transactions registered
                      </td>
                    </tr>
                  ) : (
                    walletLogs.filter(log => {
                      const matchesSearch = log.description?.toLowerCase().includes(walletSearch.toLowerCase()) || log.userId?.toLowerCase().includes(walletSearch.toLowerCase());
                      const matchesType = walletTypeFilter === 'All' || log.type === walletTypeFilter;
                      return matchesSearch && matchesType;
                    }).map(log => {
                      const amountColor = log.amount > 0 ? 'text-[#4CD964]' : 'text-red-400';
                      const typeLabel = 
                        log.type === 'welcome_bonus' ? '🎁 Welcome Bonus' :
                        log.type === 'order_payment' ? '🍽️ Order Payment' : '⚙️ Adjustment';
                      
                      const resolvedUser = usersList.find(u => u.uid === log.userId);

                      return (
                        <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-6 py-4.5 font-mono text-[10px] text-white/60">
                            #{log.id.slice(0, 8)}
                          </td>
                          <td className="px-6 py-4.5 text-xs text-white/80 font-bold">
                            {resolvedUser ? (
                              <div>
                                <p>{resolvedUser.name}</p>
                                <p className="text-[9px] text-white/40 font-semibold">{resolvedUser.email}</p>
                              </div>
                            ) : (
                              <span>ID: {log.userId.slice(0, 8)}</span>
                            )}
                          </td>
                          <td className="px-6 py-4.5">
                            <span className={`text-sm font-black italic ${amountColor}`}>{log.amount > 0 ? `+₹${log.amount}` : `-₹${Math.abs(log.amount)}`}</span>
                          </td>
                          <td className="px-6 py-4.5">
                            <span className="text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white/50 font-bold uppercase tracking-wider">
                              {typeLabel}
                            </span>
                          </td>
                          <td className="px-6 py-4.5 text-xs text-white/80 font-medium">
                            {log.description}
                          </td>
                          <td className="px-6 py-4.5 text-[10px] text-white/40 font-bold">
                            {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Just now'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      ) : activeTab === 'system' ? (
        <main className="max-w-[1400px] mx-auto p-6 md:p-10 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* LEFT COLUMN: PRIMARY TOGGLES & CORE CONTROLS */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Live Status Indicators Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            {/* Status card 1 */}
            <div className="bg-[#121624] border border-white/5 rounded-3xl p-5 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
              <Activity className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest leading-none">Accepting Orders</p>
                <p className="text-2xl font-black italic tracking-tighter mt-1 text-white uppercase">{settings.websiteStatus}</p>
              </div>
            </div>

            {/* Status card 2 */}
            <div className="bg-[#121624] border border-white/5 rounded-3xl p-5 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest leading-none">Emergency Stop</p>
                <p className="text-2xl font-black italic tracking-tighter mt-1 text-white uppercase">{settings.emergencyStop ? 'ACTIVE' : 'INACTIVE'}</p>
              </div>
            </div>

            {/* Status card 3 */}
            <div className="bg-[#121624] border border-white/5 rounded-3xl p-5 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
              <Calendar className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest leading-none">Festival Mode</p>
                <p className="text-2xl font-black italic tracking-tighter mt-1 text-white uppercase">{settings.festivalMode ? 'ON' : 'OFF'}</p>
              </div>
            </div>

            {/* Status card 4 */}
            <div className="bg-[#121624] border border-white/5 rounded-3xl p-5 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
              <Clock className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest leading-none">Schedule Window</p>
                <p className="text-base font-black italic tracking-tighter mt-1 text-white uppercase">{settings.openTime} - {settings.closeTime}</p>
              </div>
            </div>

          </div>

          {/* PRIMARY SWITCHES PANEL */}
          <div className="bg-[#121620]/50 backdrop-blur-2xl border border-white/5 rounded-[40px] p-8 md:p-10 space-y-8 relative">
            <div className="flex items-center justify-between border-b border-white/5 pb-5">
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tight">Core System Switches</h3>
                <p className="text-white/40 text-[9px] font-semibold tracking-wider mt-1">Changes propagate instantly to all user sessions</p>
              </div>
              <Sparkles className="w-6 h-6 text-[#FFB700] animate-pulse" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* TOGGLE 1: Website Status ON/OFF */}
              <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl flex flex-col justify-between gap-6 transition-all hover:bg-white/[0.04]">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-white tracking-tight">Website Ordering</h4>
                    <p className="text-white/40 text-[10px] font-semibold max-w-[200px]">Instantly toggle website ordering status online/offline.</p>
                  </div>
                  <div className={`p-3 rounded-2xl bg-white/5 ${settings.websiteStatus === 'ON' ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/30'}`}>
                    <Power className="w-6 h-6" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/5">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${settings.websiteStatus === 'ON' ? 'text-emerald-400' : 'text-white/30'}`}>
                    Status: {settings.websiteStatus === 'ON' ? 'Online' : 'Offline'}
                  </span>
                  
                  {/* Large Toggle Custom */}
                  <button 
                    onClick={() => handleToggleState('websiteStatus', settings.websiteStatus === 'ON' ? 'OFF' : 'ON')}
                    className={`w-16 h-9 rounded-full p-1 transition-colors duration-300 outline-none shrink-0 ${settings.websiteStatus === 'ON' ? 'bg-emerald-500' : 'bg-white/10'}`}
                  >
                    <motion.div 
                      layout
                      className="w-7 h-7 rounded-full bg-matte-black shadow-lg"
                      animate={{ x: settings.websiteStatus === 'ON' ? 28 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              </div>

              {/* TOGGLE 2: Delivery Pause Mode */}
              <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl flex flex-col justify-between gap-6 transition-all hover:bg-white/[0.04]">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-white tracking-tight">Delivery Pause</h4>
                    <p className="text-white/40 text-[10px] font-semibold max-w-[200px]">Temporarily stop new delivery orders without taking menu offline.</p>
                  </div>
                  <div className={`p-3 rounded-2xl bg-white/5 ${settings.deliveryPause ? 'text-amber-400 bg-amber-500/10' : 'text-white/30'}`}>
                    <Clock className="w-6 h-6" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/5">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${settings.deliveryPause ? 'text-amber-400' : 'text-white/30'}`}>
                    Status: {settings.deliveryPause ? 'Paused' : 'Active'}
                  </span>
                  
                  {/* Toggle */}
                  <button 
                    onClick={() => handleToggleState('deliveryPause', !settings.deliveryPause)}
                    className={`w-16 h-9 rounded-full p-1 transition-colors duration-300 outline-none shrink-0 ${settings.deliveryPause ? 'bg-amber-500' : 'bg-white/10'}`}
                  >
                    <motion.div 
                      layout
                      className="w-7 h-7 rounded-full bg-matte-black shadow-lg"
                      animate={{ x: settings.deliveryPause ? 28 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              </div>

              {/* TOGGLE 3: Festival Closure Mode */}
              <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl flex flex-col justify-between gap-6 transition-all hover:bg-white/[0.04]">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-white tracking-tight">Festival Closure Mode</h4>
                    <p className="text-white/40 text-[10px] font-semibold max-w-[200px]">Declare holiday/festival closures with unique theme & announcements.</p>
                  </div>
                  <div className={`p-3 rounded-2xl bg-white/5 ${settings.festivalMode ? 'text-purple-400 bg-purple-500/10' : 'text-white/30'}`}>
                    <Calendar className="w-6 h-6" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/5">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${settings.festivalMode ? 'text-purple-400' : 'text-white/30'}`}>
                    Status: {settings.festivalMode ? 'Holiday Mode' : 'Normal'}
                  </span>
                  
                  {/* Toggle */}
                  <button 
                    onClick={() => handleToggleState('festivalMode', !settings.festivalMode)}
                    className={`w-16 h-9 rounded-full p-1 transition-colors duration-300 outline-none shrink-0 ${settings.festivalMode ? 'bg-purple-500' : 'bg-white/10'}`}
                  >
                    <motion.div 
                      layout
                      className="w-7 h-7 rounded-full bg-matte-black shadow-lg"
                      animate={{ x: settings.festivalMode ? 28 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              </div>

              {/* TOGGLE 4: WhatsApp Notification Toggles */}
              <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl flex flex-col justify-between gap-6 transition-all hover:bg-white/[0.04]">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-white tracking-tight">WhatsApp Alerts</h4>
                    <p className="text-white/40 text-[10px] font-semibold max-w-[200px]">Send structured receipt details automatically on checkout submission.</p>
                  </div>
                  <div className={`p-3 rounded-2xl bg-white/5 ${settings.whatsappAlertsEnabled ? 'text-[#25D366] bg-[#25D366]/10' : 'text-white/30'}`}>
                    <Bell className="w-6 h-6" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/5">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${settings.whatsappAlertsEnabled ? 'text-[#25D366]' : 'text-white/30'}`}>
                    Status: {settings.whatsappAlertsEnabled ? 'Alerting ON' : 'Alerting OFF'}
                  </span>
                  
                  {/* Toggle */}
                  <button 
                    onClick={() => handleToggleState('whatsappAlertsEnabled', !settings.whatsappAlertsEnabled)}
                    className={`w-16 h-9 rounded-full p-1 transition-colors duration-300 outline-none shrink-0 ${settings.whatsappAlertsEnabled ? 'bg-[#25D366]' : 'bg-white/10'}`}
                  >
                    <motion.div 
                      layout
                      className="w-7 h-7 rounded-full bg-matte-black shadow-lg"
                      animate={{ x: settings.whatsappAlertsEnabled ? 28 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              </div>

            </div>

            {/* EMERGENCY LOCKDOWN BUTTON */}
            <div className="border-t border-white/5 pt-8">
              <div className="bg-red-500/5 border border-red-500/20 rounded-[30px] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1.5 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20 shrink-0">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black italic uppercase text-red-400 tracking-tight">🚨 Emergency “Stop All Orders”</h4>
                    <p className="text-white/40 text-xs font-semibold max-w-lg leading-relaxed">
                      locks the entire food checkout interface, clears the operational statuses, and redirects all active sessions to the emergency banner. Use in case of chef shortage, power cuts, or weather lockdowns.
                    </p>
                  </div>
                </div>
                <div>
                  {settings.emergencyStop ? (
                    <button 
                      onClick={handleEmergencyReset}
                      className="px-8 h-14 rounded-2xl bg-white text-matte-black font-black text-xs uppercase tracking-[2px] shadow-xl hover:scale-105 active:scale-95 transition-all shrink-0 flex items-center gap-2"
                    >
                      <Lock className="w-4 h-4" /> Reset Operations
                    </button>
                  ) : (
                    <button 
                      onClick={handleEmergencyTrigger}
                      className="px-8 h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-[2px] shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all shrink-0 flex items-center gap-2"
                    >
                      <ShieldAlert className="w-4 h-4 animate-bounce" /> STOP ALL ORDERS
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* TIMINGS & OPERATIONAL CONTROLS */}
          <div className="bg-[#121620]/50 backdrop-blur-2xl border border-white/5 rounded-[40px] p-8 md:p-10 space-y-8">
            <h3 className="text-xl font-black italic uppercase tracking-tight border-b border-white/5 pb-5">Operating Schedule & Limits</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Daily opening and closing hours selector */}
              <div className="space-y-6">
                <h4 className="text-xs font-black text-[#FFB700] uppercase tracking-[3px] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#FFB700]" /> Working Hour Bounds
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Opening Time</label>
                    <input 
                      type="time" 
                      value={localSettings.openTime}
                      onChange={e => setLocalSettings({ ...localSettings, openTime: e.target.value })}
                      className="w-full px-5 py-4 bg-white/5 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#FFB700]/30 transition-all text-center"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Closing Time</label>
                    <input 
                      type="time" 
                      value={localSettings.closeTime}
                      onChange={e => setLocalSettings({ ...localSettings, closeTime: e.target.value })}
                      className="w-full px-5 py-4 bg-white/5 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#FFB700]/30 transition-all text-center"
                    />
                  </div>
                </div>
                <p className="text-white/30 text-[10px] font-medium leading-relaxed italic">
                  Ordering pipelines will lock down automatically outside these limits.
                </p>
              </div>

              {/* Order limit & WhatsApp configs */}
              <div className="space-y-6">
                <h4 className="text-xs font-black text-[#FFB700] uppercase tracking-[3px] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#FFB700]" /> Capacity & Alert Config
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Order Limit / Hr</label>
                    <input 
                      type="number" 
                      min="5"
                      max="500"
                      value={localSettings.orderLimit}
                      onChange={e => setLocalSettings({ ...localSettings, orderLimit: parseInt(e.target.value) || 50 })}
                      className="w-full px-5 py-4 bg-white/5 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#FFB700]/30 transition-all text-center"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Alert Phone No.</label>
                    <input 
                      type="text" 
                      placeholder="+91..."
                      value={localSettings.whatsappNumber}
                      onChange={e => setLocalSettings({ ...localSettings, whatsappNumber: e.target.value })}
                      className="w-full px-5 py-4 bg-white/5 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#FFB700]/30 transition-all text-center placeholder:text-white/10"
                    />
                  </div>
                </div>

                {/* Financial Settings */}
                <h4 className="text-xs font-black text-[#FFB700] uppercase tracking-[3px] flex items-center gap-2 mt-6">
                  <Sliders className="w-4 h-4 text-[#FFB700]" /> Financial Rules
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Tax (%)</label>
                    <input 
                      type="number" 
                      min="0"
                      value={localSettings.taxRate ?? 5}
                      onChange={e => setLocalSettings({ ...localSettings, taxRate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-5 py-4 bg-white/5 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#FFB700]/30 transition-all text-center"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Del. Fee (₹)</label>
                    <input 
                      type="number" 
                      min="0"
                      value={localSettings.deliveryFee ?? 40}
                      onChange={e => setLocalSettings({ ...localSettings, deliveryFee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-5 py-4 bg-white/5 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#FFB700]/30 transition-all text-center"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Min Order (₹)</label>
                    <input 
                      type="number" 
                      min="0"
                      value={localSettings.minOrderValue ?? 150}
                      onChange={e => setLocalSettings({ ...localSettings, minOrderValue: parseFloat(e.target.value) || 0 })}
                      className="w-full px-5 py-4 bg-white/5 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#FFB700]/30 transition-all text-center"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SAVE BUTTON FOR CONTROLS */}
            <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-4">
              <span className="text-white/30 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Save changes to commit updates
              </span>
              <button 
                onClick={() => handleSaveSettings()}
                disabled={isSaving}
                className="px-10 h-14 rounded-2xl bg-white text-matte-black font-black text-xs uppercase tracking-[2px] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-matte-black" /> : <Save className="w-4 h-4 text-matte-black" />}
                Commit Schedule Changes
              </button>
            </div>
          </div>

          {/* MON-SUN SCHEDULER BOARD */}
          <div className="bg-[#121620]/50 backdrop-blur-2xl border border-white/5 rounded-[40px] p-8 md:p-10 space-y-8">
            <div>
              <h3 className="text-xl font-black italic uppercase tracking-tight">Weekly Timing Calendar</h3>
              <p className="text-white/40 text-[9px] font-semibold tracking-wider mt-1">Configure individual working parameters per calendar day</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(schedule).map(([day, details]) => (
                <div key={day} className={`border rounded-3xl p-5 space-y-4 transition-all relative ${details.closed ? 'bg-red-500/5 border-red-500/10' : 'bg-white/[0.02] border-white/5'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider">{day.slice(0, 3)}</span>
                    <button 
                      onClick={() => {
                        setSchedule(prev => ({
                          ...prev,
                          [day]: { ...details, closed: !details.closed }
                        }));
                        toast.success(`${day} updated!`);
                      }}
                      className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${details.closed ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}
                    >
                      {details.closed ? 'Closed' : 'Active'}
                    </button>
                  </div>
                  
                  {!details.closed && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[8px] font-bold text-white/30 uppercase block mb-1">Open</span>
                        <span className="text-xs font-black bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/5 text-white block text-center">{details.open}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-white/30 uppercase block mb-1">Close</span>
                        <span className="text-xs font-black bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/5 text-white block text-center">{details.close}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 🔥 COMBO OFFERS MANAGER */}
          <div className="bg-[#121620]/50 backdrop-blur-2xl border border-white/5 rounded-[40px] p-8 md:p-10 space-y-8 mt-8">
            <div className="flex items-center justify-between border-b border-white/5 pb-5">
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-2">
                  <Flame className="w-5 h-5 text-brand fill-brand" /> Combo Offers Manager
                </h3>
                <p className="text-white/40 text-[9px] font-semibold tracking-wider mt-1">Configure and release premium food bundles in real-time</p>
              </div>
            </div>

            <div className="space-y-10">
              {localSettings.comboOffers?.map((combo, index) => (
                <div key={combo.id} className="bg-white/[0.02] border border-white/5 p-6 md:p-8 rounded-3xl space-y-6 relative overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h4 className="text-lg font-black italic text-white uppercase">{combo.name}</h4>
                      <p className="text-[9px] font-mono text-white/30">ID: {combo.id}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {/* Active Status Toggle */}
                      <button
                        onClick={() => {
                          const updated = [...localSettings.comboOffers];
                          updated[index] = { ...combo, isActive: !combo.isActive };
                          setLocalSettings({ ...localSettings, comboOffers: updated });
                          toast.success(`${combo.name} status updated locally!`);
                        }}
                        className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                          combo.isActive 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                      >
                        {combo.isActive ? 'Active' : 'Disabled'}
                      </button>

                      {/* Featured Toggle */}
                      <button
                        onClick={() => {
                          const updated = [...localSettings.comboOffers];
                          updated[index] = { ...combo, isFeatured: !combo.isFeatured };
                          setLocalSettings({ ...localSettings, comboOffers: updated });
                          toast.success(`${combo.name} featured state updated!`);
                        }}
                        className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                          combo.isFeatured 
                            ? 'bg-gold/10 text-gold border-gold/20' 
                            : 'bg-white/5 text-white/30 border-white/5'
                        }`}
                      >
                        {combo.isFeatured ? '★ Featured' : '☆ Standard'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Offer Price */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Offer Price (₹)</label>
                      <input
                        type="number"
                        min="1"
                        value={combo.offerPrice}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          const updated = [...localSettings.comboOffers];
                          updated[index] = { 
                            ...combo, 
                            offerPrice: val,
                            savings: Math.max(0, combo.regularPrice - val)
                          };
                          setLocalSettings({ ...localSettings, comboOffers: updated });
                        }}
                        className="w-full px-5 py-4 bg-white/5 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#FFB700]/30 transition-all text-center"
                      />
                    </div>

                    {/* Regular Price */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Regular Price (₹)</label>
                      <input
                        type="number"
                        min="1"
                        value={combo.regularPrice}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          const updated = [...localSettings.comboOffers];
                          updated[index] = { 
                            ...combo, 
                            regularPrice: val,
                            savings: Math.max(0, val - combo.offerPrice)
                          };
                          setLocalSettings({ ...localSettings, comboOffers: updated });
                        }}
                        className="w-full px-5 py-4 bg-white/5 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#FFB700]/30 transition-all text-center"
                      />
                    </div>

                    {/* Expiry Date */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Expiry Date</label>
                      <input
                        type="date"
                        value={combo.expiryDate || ''}
                        onChange={e => {
                          const updated = [...localSettings.comboOffers];
                          updated[index] = { ...combo, expiryDate: e.target.value };
                          setLocalSettings({ ...localSettings, comboOffers: updated });
                        }}
                        className="w-full px-5 py-4 bg-white/5 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#FFB700]/30 transition-all text-center"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Badge */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Offer Badge Label</label>
                      <input
                        type="text"
                        placeholder="e.g. BESTSELLER"
                        value={combo.badge}
                        onChange={e => {
                          const updated = [...localSettings.comboOffers];
                          updated[index] = { ...combo, badge: e.target.value.toUpperCase() };
                          setLocalSettings({ ...localSettings, comboOffers: updated });
                        }}
                        className="w-full px-5 py-4 bg-white/5 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#FFB700]/30 transition-all"
                      />
                    </div>

                    {/* Included Items (Textarea) */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Included Food Items (one per line)</label>
                      <textarea
                        rows={3}
                        value={combo.items.join('\n')}
                        onChange={e => {
                          const updated = [...localSettings.comboOffers];
                          updated[index] = { ...combo, items: e.target.value.split('\n').filter(Boolean) };
                          setLocalSettings({ ...localSettings, comboOffers: updated });
                        }}
                        placeholder="Half Chicken Biryani&#10;Half Chicken Kabab&#10;Coke"
                        className="w-full px-5 py-4 bg-white/5 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#FFB700]/30 transition-all h-28 resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[9px] font-black uppercase text-emerald-400">
                      Calculated Savings: ₹{combo.savings}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* SAVE BUTTON FOR COMBOS */}
            <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-4">
              <span className="text-white/30 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Save changes to commit combo updates
              </span>
              <button 
                onClick={() => handleSaveSettings()}
                disabled={isSaving}
                className="px-10 h-14 rounded-2xl bg-white text-matte-black font-black text-xs uppercase tracking-[2px] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-matte-black text-center" /> : <Save className="w-4 h-4 text-matte-black" />}
                Commit Combo Settings
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: MESSAGING EDITORS & LIVE FEED SIMULATOR */}
        <div className="space-y-8">
          
          {/* ANNOUNCEMENT MESSAGE EDITORS */}
          <div className="bg-[#121620]/50 backdrop-blur-2xl border border-white/5 rounded-[40px] p-8 space-y-6">
            <h3 className="text-lg font-black italic uppercase tracking-tight border-b border-white/5 pb-4">Operator Messages</h3>

            {/* Maintenance Message */}
            <div className="space-y-2.5">
              <label className="text-[9px] font-black text-[#FFB700]/60 uppercase tracking-[3px] ml-1">Custom Maintenance Announcement</label>
              <textarea 
                rows={3} 
                value={localSettings.maintenanceMessage}
                onChange={e => setLocalSettings({ ...localSettings, maintenanceMessage: e.target.value })}
                className="w-full px-6 py-4.5 bg-white/5 rounded-2xl border border-white/10 text-white font-semibold text-sm outline-none focus:border-[#FFB700]/30 transition-all placeholder:text-white/10"
                placeholder="Message users will see during maintenance..."
              />
            </div>

            {/* Reopening Time message */}
            <div className="space-y-2.5">
              <label className="text-[9px] font-black text-[#FFB700]/60 uppercase tracking-[3px] ml-1">Display Reopening / Return Message</label>
              <textarea 
                rows={2} 
                value={localSettings.reopenMessage}
                onChange={e => setLocalSettings({ ...localSettings, reopenMessage: e.target.value })}
                className="w-full px-6 py-4.5 bg-white/5 rounded-2xl border border-white/10 text-white font-semibold text-sm outline-none focus:border-[#FFB700]/30 transition-all placeholder:text-white/10"
                placeholder="E.g. Reopening May 29, 2026."
              />
            </div>

            <button 
              onClick={() => handleSaveSettings()}
              disabled={isSaving}
              className="w-full h-14 rounded-2xl bg-white text-matte-black font-black text-xs uppercase tracking-[2px] shadow-xl hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-matte-black" /> : <Save className="w-4 h-4 text-matte-black" />}
              Update Banner Announcements
            </button>
          </div>
          </div>
        </main>
      ) : activeTab === 'menu' ? (
        <AdminMenuManager />
      ) : activeTab === 'coupons' ? (
        <main className="max-w-[1400px] mx-auto p-6 md:p-10 relative z-10 text-left">
          <AdminCouponManager />
        </main>
      ) : (
        <main className="max-w-[1400px] mx-auto p-6 md:p-10 relative z-10 text-left">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Broadcast Push Notification</h2>
              <p className="text-white/40 text-xs mt-1 font-semibold">Send a live push alert to all registered PWA client installations.</p>
            </div>
          </div>
          <div className="max-w-2xl bg-[#121620]/50 backdrop-blur-2xl border border-white/5 rounded-[40px] p-8 md:p-10 space-y-6">
            <form onSubmit={handleSendNotification} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4CD964] uppercase tracking-[3px] ml-1">Notification Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special Discount! 🍲"
                  value={notificationForm.title}
                  onChange={e => setNotificationForm({ ...notificationForm, title: e.target.value })}
                  className="w-full px-6 py-4 bg-[#050505] rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#4CD964]/40 transition-all text-sm placeholder:text-white/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4CD964] uppercase tracking-[3px] ml-1">Message Body</label>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g. Get 20% off on all Chicken Biryani combos today only! Use code MAGIC20."
                  value={notificationForm.message}
                  onChange={e => setNotificationForm({ ...notificationForm, message: e.target.value })}
                  className="w-full px-6 py-4 bg-[#050505] rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#4CD964]/40 transition-all text-sm resize-none placeholder:text-white/20 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#4CD964] uppercase tracking-[3px] ml-1">Optional Image URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/food-image.jpg"
                    value={notificationForm.imageUrl}
                    onChange={e => setNotificationForm({ ...notificationForm, imageUrl: e.target.value })}
                    className="w-full px-6 py-4 bg-[#050505] rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#4CD964]/40 transition-all text-sm placeholder:text-white/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#4CD964] uppercase tracking-[3px] ml-1">Optional Deep-Link URL</label>
                  <input
                    type="url"
                    placeholder="e.g. https://momsmagic.shop/offers"
                    value={notificationForm.deepLink}
                    onChange={e => setNotificationForm({ ...notificationForm, deepLink: e.target.value })}
                    className="w-full px-6 py-4 bg-[#050505] rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#4CD964]/40 transition-all text-sm placeholder:text-white/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={sendingNotification}
                className="w-full h-16 rounded-2xl bg-gradient-to-r from-[#4CD964] to-[#3AC152] text-white font-black text-xs uppercase tracking-[3px] shadow-lg shadow-[#4CD964]/20 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
              >
                {sendingNotification ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    Broadcasting Push Alerts...
                  </>
                ) : (
                  <>
                    📢 Send to All Users
                  </>
                )}
              </button>
            </form>
          </div>
        </main>
      )}

      {activeTab === 'luckyWheel' && (
        <main className="max-w-[1400px] mx-auto p-6 md:p-10 relative z-10 space-y-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">🎡 Lucky Wheel Management</h2>
              <p className="text-white/40 text-xs mt-1 font-semibold">Generate OTPs, manage prizes, and view spin history.</p>
            </div>
            <button
              onClick={handleGenerateOTP}
              disabled={generatingOTP}
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-matte-black rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-[0_10px_20px_rgba(234,179,8,0.15)] disabled:opacity-50"
            >
              {generatingOTP ? 'Generating...' : '+ Generate New OTP'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* OTPs and Spins */}
            <div className="space-y-8">
              {/* Generated OTPs Table */}
              <div className="bg-[#121620]/50 backdrop-blur-2xl border border-white/5 rounded-[30px] p-6 space-y-4">
                <h3 className="font-bold text-lg text-white">Active & Used OTPs</h3>
                <div className="space-y-3">
                  {luckyCoupons.slice(0, 10).map((coupon: any) => (
                    <div key={coupon.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="font-mono text-xl font-bold tracking-widest text-yellow-400">{coupon.code}</p>
                        <p className="text-[10px] text-white/40 mt-1 uppercase">Created: {new Date(coupon.createdAt).toLocaleString()}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${coupon.status === 'unused' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {coupon.status}
                      </div>
                    </div>
                  ))}
                  {luckyCoupons.length === 0 && <p className="text-white/30 text-sm italic">No OTPs generated yet.</p>}
                </div>
              </div>

              {/* Spin History */}
              <div className="bg-[#121620]/50 backdrop-blur-2xl border border-white/5 rounded-[30px] p-6 space-y-4">
                <h3 className="font-bold text-lg text-white">Recent Spins & Winners</h3>
                <div className="space-y-3">
                  {luckySpins.slice(0, 10).map((spin: any) => (
                    <div key={spin.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-white">Prize: <span className="text-yellow-400">{spin.prize}</span></p>
                        <p className="text-xs text-white/60">Phone: {spin.phone}</p>
                        <p className="text-[10px] text-white/40 mt-1">Code Used: {spin.code}</p>
                      </div>
                      {spin.status === 'won' && spin.prize !== 'Better Luck Next Time' && (
                        <button
                          onClick={() => handleMarkRedeemed(spin.id)}
                          className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl font-bold text-xs hover:bg-emerald-500/30 transition-all"
                        >
                          Mark Redeemed
                        </button>
                      )}
                      {spin.status === 'redeemed' && (
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest px-3 py-1 bg-emerald-500/10 rounded-full">Redeemed</span>
                      )}
                    </div>
                  ))}
                  {luckySpins.length === 0 && <p className="text-white/30 text-sm italic">No spins yet.</p>}
                </div>
              </div>
            </div>

            {/* Probability Manager */}
            <div className="bg-[#121620]/50 backdrop-blur-2xl border border-white/5 rounded-[30px] p-6 space-y-6">
              <div>
                <h3 className="font-bold text-lg text-white">Prize Probabilities (%)</h3>
                <p className="text-xs text-white/40 mt-1">Adjust win chances. Ensure total equals 100%.</p>
              </div>
              
              <div className="space-y-4">
                {luckyConfig && Object.entries(luckyConfig).map(([prize, chance]: any) => (
                  <div key={prize} className="flex items-center justify-between gap-4">
                    <label className="text-sm font-bold text-white/80 w-1/2">{prize}</label>
                    <div className="flex gap-2 flex-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={chance}
                        onChange={(e) => handleUpdateProbability(prize, parseInt(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white font-bold outline-none focus:border-yellow-400/50"
                      />
                      <span className="flex items-center text-white/40">%</span>
                    </div>
                  </div>
                ))}
                {!luckyConfig && <p className="text-white/30 text-sm">Loading config...</p>}
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

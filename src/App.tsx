import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { useEffect, Suspense, lazy } from 'react';
import { requestForToken, onMessageListener } from './firebase';

// Components
const LandingPage = lazy(() => import('./components/LandingPage'));
const CategoryPage = lazy(() => import('./components/CategoryPage'));
const CartPage = lazy(() => import('./components/CartPage'));
const Checkout = lazy(() => import('./components/Checkout'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const TrackingPage = lazy(() => import('./components/TrackingPage'));
const DeliveryDashboard = lazy(() => import('./components/DeliveryDashboard'));
const BulkOrderPage = lazy(() => import('./components/BulkOrderPage'));
import BottomNav from './components/BottomNav';
import BottomCartBar from './components/BottomCartBar';
import CityGateway from './components/CityGateway';
import LocationPicker from './components/LocationPicker';
import InstallAppModal from './components/InstallAppModal';
import FoodLoader from './components/FoodLoader';
import OperatingHoursGate from './components/OperatingHoursGate';
import { useInstallModalStore } from './store/installModalStore';
const FeedbackPage = lazy(() => import('./components/FeedbackPage'));
const AboutFounder = lazy(() => import('./components/AboutFounder'));
const CelebrationHub = lazy(() => import('./components/CelebrationHub'));
const CelebrationDesign = lazy(() => import('./components/CelebrationDesign'));
const AdminPage = lazy(() => import('./components/AdminPage'));
const OrdersPage = lazy(() => import('./components/OrdersPage'));
const LuckyWheelPage = lazy(() => import('./components/LuckyWheelPage'));
const AuthPage = lazy(() => import('./components/AuthPage'));

// Store
import { useSystemStore } from './store/systemStore';
import { useMenuStore } from './store/menuStore';

function GoldenParticles() {
  return null;
}

function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const listenSettings = useSystemStore(state => state.listenSettings);
  const listenToMenu = useMenuStore(state => state.listenToMenu);

  const setDeferredPrompt = useInstallModalStore(state => state.setDeferredPrompt);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [setDeferredPrompt]);

  // Synchronize dynamic admin settings and menu on app initialization
  useEffect(() => {
    const unsubscribeSettings = listenSettings();
    const unsubscribeMenu = listenToMenu();
    return () => {
      unsubscribeSettings();
      unsubscribeMenu();
    };
  }, [listenSettings, listenToMenu]);

  // Request notification permissions, register service worker, and setup foreground listener on mount
  useEffect(() => {
    // Request permission & save token to Firestore
    requestForToken();

    // Listen for foreground push notifications
    const unsubscribe = onMessageListener((payload) => {
      console.log('Foreground FCM notification received:', payload);
      
      // Render premium Swish-themed notification Toast matching app styles
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
            } transition-all duration-300 max-w-md w-full bg-[#0B0E14] border border-[#4CD964]/20 shadow-[0_12px_45px_rgba(76,217,100,0.15)] rounded-[20px] pointer-events-auto flex p-4 backdrop-blur-[10px]`}
          >
            <div className="flex-1 w-0">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <img
                    className="h-10 w-10 rounded-full object-cover border border-[#4CD964]/20"
                    src={payload.notification?.image || '/logo.png'}
                    alt="Notification Icon"
                  />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-bold text-[#4CD964]">
                    {payload.notification?.title || 'Order Update'}
                  </p>
                  <p className="mt-1 text-xs text-white/80 font-medium">
                    {payload.notification?.body || 'You have a new notification.'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-[#4CD964]/10 pl-3 ml-3 items-center">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="text-xs font-bold text-text-muted hover:text-[#4CD964] transition-colors uppercase tracking-[1px]"
              >
                Dismiss
              </button>
            </div>
          </div>
        ),
        { duration: 6000 }
      );
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return (
    <Router>
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#1E1E1E',
            color: '#FAFAFA',
            border: '1px solid rgba(244, 180, 0, 0.2)',
            borderRadius: '20px',
            padding: '16px 24px',
            fontWeight: '600',
            backdropFilter: 'blur(10px)',
          }
        }}
      />
      <OperatingHoursGate>
        <LocationPicker />
        <InstallAppModal />
        
        <div className="min-h-screen bg-gradient-to-b from-[#fff5f7] via-[#fff9fb] to-[#ffffff] text-gray-900 font-sans relative flex flex-col selection:bg-rose-500/20">

          <main className="flex-1 relative z-10">
            <PageTransition>
              <Suspense fallback={<FoodLoader />}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/food" element={<CategoryPage type="food" />} />
                  <Route path="/grocery" element={<CategoryPage type="grocery" />} />
                  <Route path="/cart" element={<Navigate to="/checkout" replace />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/track/:orderId" element={<TrackingPage />} />
                  <Route path="/delivery" element={<DeliveryDashboard />} />
                  <Route path="/bulk" element={<BulkOrderPage />} />
                  <Route path="/celebration" element={<CelebrationHub />} />
                  <Route path="/celebration/design" element={<CelebrationDesign />} />
                  <Route path="/feedback" element={<FeedbackPage />} />
                  <Route path="/about" element={<AboutFounder />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/spin" element={<LuckyWheelPage />} />
                  <Route path="/login" element={<AuthPage />} />
                  <Route path="/signin" element={<AuthPage />} />
                  <Route path="/signup" element={<AuthPage />} />
                </Routes>
              </Suspense>
            </PageTransition>
          </main>

          <BottomCartBar />
          <BottomNav />
        </div>
      </OperatingHoursGate>
    </Router>
  );
}

import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import SiteClosedGate from './components/SiteClosedGate';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { useEffect, useCallback, Suspense, lazy } from 'react';
import { requestForToken, onMessageListener } from './firebase';
import { flushTelegramOutbox } from './lib/notifyTelegram';
import { useAuthStore } from './store/authStore';
import { MENSWEAR_SHOP_ID } from './data/mensWear';
import { useZoneStore } from './lib/zones';

// Components
const LandingPage = lazy(() => import('./components/LandingPage'));
const CategoryPage = lazy(() => import('./components/CategoryPage'));
// CartPage is not routed: /cart redirects to /checkout. Import removed so the
// bundler stops emitting a chunk nothing ever loads.
const Checkout = lazy(() => import('./components/Checkout'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const TrackingPage = lazy(() => import('./components/TrackingPage'));
const DeliveryDashboard = lazy(() => import('./components/DeliveryDashboard'));
const BulkOrderPage = lazy(() => import('./components/BulkOrderPage'));
const HotelMumtazMenuPage = lazy(() => import('./components/HotelMumtazMenuPage'));
const HotelAlAminMenuPage = lazy(() => import('./components/HotelAlAminMenuPage'));
const HotelCoastalCrownMenuPage = lazy(() => import('./components/HotelCoastalCrownMenuPage'));
const HotelMalabarMenuPage = lazy(() => import('./components/HotelMalabarMenuPage'));
const MomsMagicKitchenMenuPage = lazy(() => import('./components/MomsMagicKitchenMenuPage'));
const HotelSankalpaMenuPage = lazy(() => import('./components/HotelSankalpaMenuPage'));
import BottomNav from './components/BottomNav';
import BottomCartBar from './components/BottomCartBar';
import CityGateway from './components/CityGateway';
import LocationGate from './components/LocationGate';
import FoodBotLauncher from './components/FoodBotLauncher';
// Both render null until opened, so they are kept out of the app-shell chunk.
const LocationPicker = lazy(() => import('./components/LocationPicker'));
const InstallAppModal = lazy(() => import('./components/InstallAppModal'));
import FoodLoader from './components/FoodLoader';
import ShirtLoader from './components/ShirtLoader';
import OperatingHoursGate from './components/OperatingHoursGate';
import { useInstallModalStore } from './store/installModalStore';
const FeedbackPage = lazy(() => import('./components/FeedbackPage'));
const AboutFounder = lazy(() => import('./components/AboutFounder'));
const CelebrationHub = lazy(() => import('./components/CelebrationHub'));
// Home cleaning. Its own chunk: most visits are for food and never touch it.
const MMCleanPage = lazy(() => import('./components/MMCleanPage'));
const CelebrationDesign = lazy(() => import('./components/CelebrationDesign'));
const AdminPage = lazy(() => import('./components/AdminPage'));
const LuckyWheelPage = lazy(() => import('./components/LuckyWheelPage'));
const AuthPage = lazy(() => import('./components/AuthPage'));
const TrackOrderPage = lazy(() => import('./components/TrackOrderPage'));
const TrackComingSoon = lazy(() => import('./components/TrackComingSoon'));
// Rider-delivered orders: live map + timeline. Other orders still see "coming soon".
const TrackRoute = lazy(() => import('./components/LiveTrackPage'));
// ID Partner, the rider app.
const PartnerApp = lazy(() => import('./components/PartnerApp'));
const RiderDeliveryAdmin = lazy(() => import('./components/RiderDeliveryAdmin'));
const StaffHome = lazy(() => import('./components/StaffHome'));
const MenswearPage = lazy(() => import('./components/MenswearPage'));
const MenswearProductPage = lazy(() => import('./components/MenswearProductPage'));
const MenswearAdminPage = lazy(() => import('./components/MenswearAdminPage'));
const PrivacyPage = lazy(() => import('./components/PrivacyPage'));
const DeleteAccountPage = lazy(() => import('./components/DeleteAccountPage'));
const AddressesPage = lazy(() => import('./components/AddressesPage'));

// Store
import { useSystemStore } from './store/systemStore';
import { useMenuStore } from './store/menuStore';
import { useDishAvailabilityStore } from './store/dishAvailabilityStore';

function GoldenParticles() {
  return null;
}

/**
 * The men's wear shop's admin account goes straight to its own page after
 * signing in anywhere in the app: it has nothing to order, only stock to run.
 */
function MenswearAdminRedirect() {
  const profile: any = useAuthStore((s) => s.profile);
  const uid = useAuthStore((s) => s.user?.uid) || '';
  const { pathname } = useLocation();
  const role = String(profile?.role || '').toUpperCase();
  const isShopAdmin = role === 'HOTEL_ADMIN' && profile?.hotelId === MENSWEAR_SHOP_ID;
  if (isShopAdmin && pathname !== '/admin/menswear') return <Navigate to="/admin/menswear" replace />;
  // A delivery partner signing in on the normal login lands in ID Partner.
  if (role === 'RIDER' && !pathname.startsWith('/partner')) return <Navigate to="/partner" replace />;
  // The super admin lands on Admin home once per visit after signing in.
  // The login page always ends on /profile, so that is where this triggers;
  // Admin home itself marks the visit as done (see StaffHome).
  if (role === 'SUPER_ADMIN' && pathname === '/profile') {
    let shown = false;
    try {
      shown = sessionStorage.getItem('mm_admin_home_shown') === uid;
    } catch {
      shown = true; // storage blocked: never loop
    }
    if (!shown) return <Navigate to="/admin/home" replace />;
  }
  return null;
}

function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    // initial={false}: the first screen appears as-is. Fading it in from
    // blank right after the boot screen read as a flicker on iPhones.
    <AnimatePresence mode="wait" initial={false}>
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

  // ID Partner rider delivery on/off, area and ETA: one read per start.
  useEffect(() => {
    void useZoneStore.getState().load();
  }, []);

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
    // Which dishes the kitchens have switched off in the panel.
    const unsubscribeDishes = useDishAvailabilityStore.getState().subscribe();
    return () => {
      unsubscribeSettings();
      unsubscribeMenu();
      unsubscribeDishes();
    };
  }, [listenSettings, listenToMenu]);

  // Toast for a push that arrives while the app is open.
  const handlePushPayload = useCallback((payload: any) => {
      console.log('Foreground FCM notification received:', payload);
      
      // Brand-styled (white / rose) toast, matching the global Toaster below.
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
            } transition-all duration-300 max-w-md w-full bg-white border border-rose-100 shadow-lg shadow-rose-100 rounded-[20px] pointer-events-auto flex p-4`}
          >
            <div className="flex-1 w-0">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <img
                    className="h-10 w-10 rounded-full object-cover border border-rose-100"
                    src={payload.notification?.image || '/logo-sm.webp'}
                    alt="Notification Icon"
                  />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-bold text-gray-900">
                    {payload.notification?.title || 'Order Update'}
                  </p>
                  <p className="mt-1 text-xs text-gray-600 font-medium">
                    {payload.notification?.body || 'You have a new notification.'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-rose-100 pl-3 ml-3 items-center">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="min-h-[40px] px-1 text-xs font-bold text-[#e11d48] hover:text-rose-700 transition-colors uppercase tracking-[1px]"
              >
                Dismiss
              </button>
            </div>
          </div>
        ),
        { duration: 6000 }
      );
  }, []);

  // Push notifications are set up once the browser is idle. Doing it on mount
  // pulled firebase messaging + installations into the first paint and popped
  // the permission prompt while the page was still rendering.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const setUpPush = () => {
      if (cancelled) return;
      requestForToken();
      unsubscribe = onMessageListener(handlePushPayload);
      // Redeliver any order notification that could not reach Telegram earlier,
      // e.g. because the serverless function was cold or misconfigured.
      flushTelegramOutbox();
    };

    const idle = (window as any).requestIdleCallback;
    const handle = idle
      ? idle(setUpPush, { timeout: 4000 })
      : window.setTimeout(setUpPush, 2500);

    return () => {
      cancelled = true;
      const cancelIdle = (window as any).cancelIdleCallback;
      if (idle && cancelIdle) cancelIdle(handle);
      else clearTimeout(handle);
      unsubscribe?.();
    };
  }, []);


  return (
    <Router>
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#111827',
            border: '1px solid #ffe4e6',
            borderRadius: '20px',
            padding: '16px 24px',
            fontWeight: '600',
            boxShadow: '0 10px 30px rgba(225, 29, 72, 0.12)',
          }
        }}
      />
      <SiteClosedGate>
      <OperatingHoursGate>
        {/* Lazy, so they need their own boundary; neither shows anything until opened. */}
        <Suspense fallback={null}>
          <LocationPicker />
          <InstallAppModal />
        </Suspense>
        
        {/* No menu until we know the customer is inside the delivery area. */}
        <LocationGate>
        <div className="min-h-screen bg-gradient-to-b from-[#fff5f7] via-[#fff9fb] to-[#ffffff] text-gray-900 font-sans relative flex flex-col selection:bg-rose-500/20">

          <main className="flex-1 relative z-10">
            <MenswearAdminRedirect />
            <PageTransition>
              <Suspense fallback={<FoodLoader />}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/food" element={<CategoryPage type="food" />} />
                  <Route path="/grocery" element={<CategoryPage type="grocery" />} />
                  <Route path="/cart" element={<Navigate to="/checkout" replace />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  {/* Tracking is locked for now: both routes show "coming soon".
                      Put back <TrackOrderPage /> and <TrackingPage /> to reopen it. */}
                  <Route path="/menswear" element={<Suspense fallback={<ShirtLoader />}><MenswearPage /></Suspense>} />
                  <Route path="/menswear/:slug" element={<Suspense fallback={<ShirtLoader />}><MenswearProductPage /></Suspense>} />
                  <Route path="/track" element={<TrackComingSoon />} />
                  <Route path="/track/:orderId" element={<TrackRoute />} />
                  <Route path="/partner" element={<PartnerApp />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/delete-account" element={<DeleteAccountPage />} />
                  <Route path="/addresses" element={<AddressesPage />} />
                  <Route path="/delivery" element={<DeliveryDashboard />} />
                  <Route path="/bulk" element={<BulkOrderPage />} />
                  <Route path="/hotel-mumtaz" element={<HotelMumtazMenuPage />} />
                  <Route path="/hotel-al-amin" element={<HotelAlAminMenuPage />} />
                  <Route path="/hotel-coastal-crown" element={<HotelCoastalCrownMenuPage />} />
                  <Route path="/hotel-malabar" element={<HotelMalabarMenuPage />} />
                  <Route path="/hotel-moms-magic-kitchen" element={<MomsMagicKitchenMenuPage />} />
                  <Route path="/hotel-sankalpa" element={<HotelSankalpaMenuPage />} />
                  <Route path="/clean" element={<MMCleanPage />} />
                  <Route path="/celebration" element={<CelebrationHub />} />
                  <Route path="/celebration/design" element={<CelebrationDesign />} />
                  <Route path="/feedback" element={<FeedbackPage />} />
                  <Route path="/about" element={<AboutFounder />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/admin/menswear" element={<MenswearAdminPage />} />
                  <Route path="/admin/rider-delivery" element={<RiderDeliveryAdmin />} />
                  <Route path="/admin/home" element={<StaffHome />} />
                  {/* The old dark /orders list read stale localStorage; /track is the live list. */}
                  <Route path="/orders" element={<Navigate to="/track" replace />} />
                  <Route path="/spin" element={<LuckyWheelPage />} />
                  <Route path="/login" element={<AuthPage />} />
                  <Route path="/signin" element={<AuthPage />} />
                  <Route path="/signup" element={<AuthPage />} />
                  {/* A mistyped or stale URL rendered an empty page with only a
                      "No routes matched" warning in the console. */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </PageTransition>
          </main>

          <BottomCartBar />
          <BottomNav />
          <FoodBotLauncher />
        </div>
        </LocationGate>
      </OperatingHoursGate>
      </SiteClosedGate>
    </Router>
  );
}

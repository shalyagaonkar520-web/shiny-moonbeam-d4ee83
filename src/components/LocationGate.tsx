import React, { useEffect, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { MapPin, Locate, Map as MapIcon, Loader2, AlertTriangle, PackageSearch, ArrowRight } from 'lucide-react';
import { useLocationStore, SERVICE_RADIUS_KM, SERVICE_AREA_NAME } from '../store/locationStore';
import { useSavedAddresses } from '../store/savedAddressStore';
import SavedAddressList from './SavedAddressList';

// Pages that must work without a delivery location: staff tools, order
// tracking (a customer may track from anywhere), and the legal pages Google
// Play links to.
const OPEN_PATHS = ['/admin', '/delivery', '/track', '/privacy', '/delete-account'];

function isOpenPath(pathname: string) {
  return OPEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function geolocationErrorMessage(err: unknown): string {
  const code = (err as GeolocationPositionError | undefined)?.code;
  if (code === 1) return 'Location permission was denied. Allow location for this app in your phone settings, or choose your location on the map.';
  if (code === 2) return 'We could not get a GPS fix. Turn on location (GPS) and try again, or choose on the map.';
  if (code === 3) return 'Finding your location took too long. Try again, or choose on the map.';
  if (err instanceof Error && err.message === 'Geolocation not supported') {
    return 'This device cannot share its location. Please choose your location on the map.';
  }
  return 'Could not detect your location. Please choose it on the map.';
}

/**
 * Asks for the delivery location before anything else and only lets the
 * customer into the menu when it is inside the Yellapur service area.
 * Automatic (GPS) and manual (map / search, the existing LocationPicker) both
 * work; either way the result lands in useLocationStore, which is persisted.
 *
 * It is asked at the start of every app launch (per browser session): a
 * returning customer sees their saved location and continues with one tap, or
 * changes it -- so nobody orders to yesterday's address by accident.
 */

const CONFIRMED_KEY = 'mintoo_location_confirmed';

function readConfirmed(): boolean {
  try {
    return sessionStorage.getItem(CONFIRMED_KEY) === '1';
  } catch {
    return false;
  }
}
export default function LocationGate({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { deliveryLocation, detectLocation, openLocationPicker, clearLocation, isLoading } = useLocationStore();
  const [error, setError] = useState<string | null>(null);
  const savedAddresses = useSavedAddresses();
  const { isLocationPickerOpen } = useLocationStore();
  const [confirmed, setConfirmed] = useState(readConfirmed);

  const confirm = () => {
    try {
      sessionStorage.setItem(CONFIRMED_KEY, '1');
    } catch {
      /* private mode: confirm for this page view only */
    }
    setConfirmed(true);
  };

  // A location confirmed in the map picker (opened from here) counts as the
  // customer's answer.
  const pickerFromGate = useRef<unknown>(undefined);
  useEffect(() => {
    if (isLocationPickerOpen || pickerFromGate.current === undefined) return;
    const before = pickerFromGate.current;
    pickerFromGate.current = undefined;
    if (deliveryLocation && deliveryLocation !== before) confirm();
  }, [isLocationPickerOpen, deliveryLocation]);

  const inServiceArea = !!deliveryLocation && deliveryLocation.distance <= SERVICE_RADIUS_KM;

  // Download the home page while the customer is still answering, so it is
  // ready the moment they tap Continue (it used to start only after).
  useEffect(() => {
    const idle = (window as any).requestIdleCallback || ((cb: () => void) => window.setTimeout(cb, 300));
    idle(() => { import('./LandingPage').catch(() => {}); });
  }, []);

  if ((inServiceArea && confirmed) || isOpenPath(pathname)) {
    return <>{children}</>;
  }

  const handleDetect = async () => {
    setError(null);
    try {
      await detectLocation();
      confirm();
    } catch (err) {
      setError(geolocationErrorMessage(err));
    }
  };

  const handleManual = () => {
    setError(null);
    pickerFromGate.current = deliveryLocation;
    openLocationPicker();
  };

  const outOfArea = !!deliveryLocation && !inServiceArea;

  return (
    <div className="fixed inset-0 z-[600] overflow-y-auto bg-gradient-to-b from-[#fff1f4] via-[#fff8fa] to-white text-gray-900">
      <div className="min-h-full max-w-md mx-auto px-4 py-10 flex flex-col">
        <div className="flex flex-col items-center text-center mt-4">
          <img src="/logo-sm.webp" alt="Mintoo" className="w-20 h-20 rounded-3xl object-cover shadow-md shadow-rose-500/10" />
          <h1 className="mt-5 text-2xl font-black text-gray-900">
            {outOfArea ? "We don't deliver there yet" : inServiceArea ? 'Deliver to this location?' : 'Where should we deliver?'}
          </h1>
          <p className="mt-2 text-sm text-gray-500 font-medium max-w-xs">
            {outOfArea
              ? `Mintoo currently delivers only in ${SERVICE_AREA_NAME}, within ${SERVICE_RADIUS_KM} km of our kitchen.`
              : inServiceArea
              ? 'Continue with your last location, or choose a new one.'
              : `Share your location so we can show you what's available. We deliver across ${SERVICE_AREA_NAME}.`}
          </p>
        </div>

        {outOfArea && (
          <div className="mt-6 bg-white rounded-[22px] border border-rose-100 p-4 flex items-start gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
              <MapPin className="w-4.5 h-4.5 text-[#e11d48]" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Selected location</p>
              <p className="text-sm font-bold text-gray-900 line-clamp-2">{deliveryLocation!.address}</p>
              <p className="text-xs font-semibold text-gray-500 mt-0.5">
                {deliveryLocation!.distance} km from our kitchen
              </p>
            </div>
          </div>
        )}

        {inServiceArea && (
          <button
            onClick={confirm}
            className="mt-6 w-full bg-white rounded-[22px] border-2 border-[#e11d48] p-4 flex items-center gap-3 shadow-sm text-left active:scale-[0.99] transition-transform"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
              <MapPin className="w-4.5 h-4.5 text-[#e11d48]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Deliver to</p>
              <p className="text-sm font-bold text-gray-900 line-clamp-2">{deliveryLocation!.address}</p>
            </div>
            <span className="shrink-0 flex items-center gap-1 text-xs font-black text-white bg-[#e11d48] px-3 py-2 rounded-xl">
              Continue <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>
        )}

        {error && (
          <div role="alert" className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-left">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-amber-900 leading-relaxed">{error}</p>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <button
            onClick={handleDetect}
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-[#e11d48] text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-rose-500/25 active:scale-[0.98] transition-transform disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Locate className="w-5 h-5" />}
            {isLoading ? 'Finding you…' : 'Use my current location'}
          </button>

          <button
            onClick={handleManual}
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-white border border-rose-200 text-gray-900 font-black text-sm flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform disabled:opacity-70"
          >
            <MapIcon className="w-5 h-5 text-[#e11d48]" />
            Select location manually
          </button>

          {savedAddresses.length > 0 && (
            <div className="pt-3 space-y-2 text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Your saved addresses</p>
              <SavedAddressList onSelect={() => { setError(null); confirm(); }} />
            </div>
          )}

          {outOfArea && (
            <button
              onClick={() => { setError(null); clearLocation(); }}
              className="w-full py-2 text-xs font-bold text-gray-500 underline"
            >
              Clear selected location
            </button>
          )}
        </div>

        <div className="mt-auto pt-10 flex flex-col items-center gap-3 text-center">
          <Link to="/track" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#e11d48]">
            <PackageSearch className="w-4 h-4" /> Track an existing order
          </Link>
          <p className="text-[10px] text-gray-400 font-medium">
            Your location is used only to check delivery and deliver your order.{' '}
            <Link to="/privacy" className="underline">Privacy policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

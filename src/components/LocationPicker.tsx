import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, Check, X, Loader2, AlertTriangle, Store, Locate, ChevronDown, Search } from 'lucide-react';
import { useLocationStore, NearbyRestaurant } from '../store/locationStore';

import { haversineDistance, reverseGeocode } from '../lib/location';

// ═══════════════════════════════════════════════════════════════
// OVERPASS API - FETCH NEARBY RESTAURANTS
// ═══════════════════════════════════════════════════════════════
async function fetchNearbyRestaurants(lat: number, lng: number, radius: number = 2000): Promise<NearbyRestaurant[]> {
  try {
    const query = `
      [out:json][timeout:15];
      (
        node["amenity"="restaurant"](around:${radius},${lat},${lng});
        node["amenity"="fast_food"](around:${radius},${lat},${lng});
        node["amenity"="cafe"](around:${radius},${lat},${lng});
      );
      out body 20;
    `;
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const data = await res.json();
    return (data.elements || []).map((el: any) => ({
      id: el.id,
      name: el.tags?.name || 'Unnamed Restaurant',
      lat: el.lat,
      lng: el.lon,
      cuisine: el.tags?.cuisine || '',
    }));
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// LEAFLET MAP COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function LocationPicker() {
  const {
    deliveryLocation,
    setDeliveryLocation,
    setNearbyRestaurants,
    nearbyRestaurants,
    isLocationPickerOpen,
    closeLocationPicker,
    restaurantLocation,
    maxDeliveryRange,
  } = useLocationStore();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const restaurantMarkerRef = useRef<any>(null);
  const nearbyMarkersRef = useRef<any[]>([]);
  const circleRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);

  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [address, setAddress] = useState<string>('');
  const [distance, setDistance] = useState<number>(0);
  const [isDeliverable, setIsDeliverable] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeolocating, setIsGeolocating] = useState<boolean>(false);
  const [loadingNearby, setLoadingNearby] = useState<boolean>(false);
  const [mapReady, setMapReady] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // ───────────────────────────────────────────────────────────
  // UPDATE MARKER AND DATA
  // ───────────────────────────────────────────────────────────
  const updateLocation = useCallback(
    async (lat: number, lng: number) => {
      setSelectedLat(lat);
      setSelectedLng(lng);
      setIsLoading(true);

      // Calculate distance
      const dist = haversineDistance(
        restaurantLocation.lat, restaurantLocation.lng, lat, lng
      );
      setDistance(parseFloat(dist.toFixed(2)));
      setIsDeliverable(dist <= maxDeliveryRange);

      // Reverse geocode
      const addr = await reverseGeocode(lat, lng);
      setAddress(addr);
      setIsLoading(false);

      // Update marker on map
      const L = leafletRef.current;
      const map = mapInstanceRef.current;
      if (L && map) {
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const deliveryIcon = L.divIcon({
            className: 'custom-delivery-marker',
            html: `<div class="marker-pin delivery"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
            iconSize: [40, 50],
            iconAnchor: [20, 50],
          });
          markerRef.current = L.marker([lat, lng], { icon: deliveryIcon })
            .addTo(map)
            .bindPopup(`<b>Delivery Location</b><br/>${addr}`);
        }

        // Draw delivery range circle
        if (circleRef.current) map.removeLayer(circleRef.current);
        circleRef.current = L.circle([restaurantLocation.lat, restaurantLocation.lng], {
          radius: maxDeliveryRange * 1000,
          color: '#FF4D00',
          fillColor: '#FF4D00',
          fillOpacity: 0.05,
          weight: 1.5,
          dashArray: '8, 6',
        }).addTo(map);
      }

      // Fetch nearby restaurants
      setLoadingNearby(true);
      const nearby = await fetchNearbyRestaurants(lat, lng);
      setNearbyRestaurants(nearby);
      setLoadingNearby(false);

      // Place nearby markers
      if (L && map) {
        nearbyMarkersRef.current.forEach((m) => map.removeLayer(m));
        nearbyMarkersRef.current = [];

        nearby.forEach((r) => {
          const icon = L.divIcon({
            className: 'custom-nearby-marker',
            html: `<div class="marker-pin nearby"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M12 4v16"/><path d="M2 12h20"/></svg></div>`,
            iconSize: [28, 36],
            iconAnchor: [14, 36],
          });
          const m = L.marker([r.lat, r.lng], { icon })
            .addTo(map)
            .bindPopup(`<b>${r.name}</b>${r.cuisine ? `<br/><i>${r.cuisine}</i>` : ''}`);
          nearbyMarkersRef.current.push(m);
        });
      }
    },
    [restaurantLocation, maxDeliveryRange, setNearbyRestaurants]
  );

  // ───────────────────────────────────────────────────────────
  // SEARCH PLACES VIA OPENSTREETMAP (NO API REQUIRED)
  // ───────────────────────────────────────────────────────────
  const handleSearchPlaces = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`
      );
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      updateLocation(lat, lon);
      const map = mapInstanceRef.current;
      if (map) {
        map.setView([lat, lon], 17, { animate: true });
      }
    }
    setSearchResults([]);
    setSearchQuery('');
  };

  // Cleanup map on unmount/close
  useEffect(() => {
    if (!isLocationPickerOpen && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      restaurantMarkerRef.current = null;
      nearbyMarkersRef.current = [];
      circleRef.current = null;
      setMapReady(false);
    }
  }, [isLocationPickerOpen]);

  // ───────────────────────────────────────────────────────────
  // USE MY CURRENT GPS LOCATION
  // ───────────────────────────────────────────────────────────
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setIsGeolocating(true);
    
    // High accuracy options
    const options = {
      enableHighAccuracy: true,
      timeout: 20000, // Increased to 20s for better GPS lock
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        console.log(`Location fix: ${latitude}, ${longitude} (Accuracy: ${accuracy}m)`);
        
        // Update state and data
        updateLocation(latitude, longitude);
        
        // Move map with high zoom for precision
        const map = mapInstanceRef.current;
        if (map) {
          map.setView([latitude, longitude], 18, { animate: true });
        }
        setIsGeolocating(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        let errorMsg = 'Unable to get your location.';
        if (err.code === 1) errorMsg = 'Location permission denied. Please allow access in settings.';
        else if (err.code === 2) errorMsg = 'Location unavailable. Ensure GPS is enabled.';
        else if (err.code === 3) errorMsg = 'Location request timed out. Please try again.';
        
        alert(errorMsg);
        setIsGeolocating(false);
      },
      options
    );
  };

  // ───────────────────────────────────────────────────────────
  // INITIALIZE LEAFLET MAP
  // ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLocationPickerOpen || mapReady) return;

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const loadLeaflet = (): Promise<any> => {
      return new Promise((resolve) => {
        if ((window as any).L) {
          resolve((window as any).L);
          return;
        }
        if (!document.getElementById('leaflet-js')) {
          const script = document.createElement('script');
          script.id = 'leaflet-js';
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => resolve((window as any).L);
          document.head.appendChild(script);
        } else {
          const check = setInterval(() => {
            if ((window as any).L) {
              clearInterval(check);
              resolve((window as any).L);
            }
          }, 100);
        }
      });
    };

    loadLeaflet().then((L) => {
      leafletRef.current = L;

      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const defaultLat = deliveryLocation?.lat || restaurantLocation.lat;
      const defaultLng = deliveryLocation?.lng || restaurantLocation.lng;

      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([defaultLat, defaultLng], 14);

      // Standard OpenStreetMap - displays all places, roads, shops & landmarks with NO API required
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Zoom control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Restaurant marker (fixed)
      const restaurantIcon = L.divIcon({
        className: 'custom-restaurant-marker',
        html: `<div class="marker-pin restaurant"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg></div>`,
        iconSize: [40, 50],
        iconAnchor: [20, 50],
      });
      restaurantMarkerRef.current = L.marker(
        [restaurantLocation.lat, restaurantLocation.lng],
        { icon: restaurantIcon }
      )
        .addTo(map)
        .bindPopup("<b>Mom's Magic Kitchen</b><br/>Your restaurant");

      // Click handler to place delivery marker
      map.on('click', (e: any) => {
        updateLocation(e.latlng.lat, e.latlng.lng);
        map.panTo(e.latlng, { animate: true });
      });

      mapInstanceRef.current = map;
      setMapReady(true);

      // If we have a previous location, restore it.
      if (deliveryLocation) {
        updateLocation(deliveryLocation.lat, deliveryLocation.lng);
      }
    });

    return () => {
      // Cleanup only when closing completely
    };
  }, [isLocationPickerOpen]);

  // ───────────────────────────────────────────────────────────
  // CONFIRM LOCATION
  // ───────────────────────────────────────────────────────────
  const handleConfirmLocation = () => {
    if (selectedLat !== null && selectedLng !== null) {
      setDeliveryLocation({
        lat: selectedLat,
        lng: selectedLng,
        address,
        distance,
        isDeliverable,
      });
      closeLocationPicker();
    }
  };

  if (!isLocationPickerOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex flex-col bg-[#0B0E14]"
      >
        {/* ─── TOP BAR ─── */}
        <div className="relative z-50 flex items-center justify-between px-4 md:px-6 h-16 bg-[#0B0E14]/95 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-brand" />
            <span className="font-black text-sm uppercase tracking-widest text-white/80">
              Select Delivery Location
            </span>
          </div>
          <button
            onClick={closeLocationPicker}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── MAP AREA ─── */}
        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="absolute inset-0" />

          {/* USE MY LOCATION FLOATING BUTTON */}
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            onClick={handleUseMyLocation}
            disabled={isGeolocating}
            className="absolute top-4 right-4 z-[1000] flex items-center gap-2 px-4 py-3 bg-[#161A22]/95 backdrop-blur-xl border border-white/10 rounded-2xl text-white font-bold text-xs uppercase tracking-widest shadow-2xl hover:border-brand/40 transition-all disabled:opacity-50"
          >
            {isGeolocating ? (
              <Loader2 className="w-4 h-4 animate-spin text-brand" />
            ) : (
              <Locate className="w-4 h-4 text-brand" />
            )}
            <span className="hidden sm:inline">{isGeolocating ? 'Locating...' : 'My Location'}</span>
          </motion.button>

          {/* SEARCH ALL PLACES (OPENSTREETMAP - NO API REQUIRED) */}
          <div className="absolute top-4 left-4 right-36 z-[1000]">
            <div className="relative">
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#161A22]/95 backdrop-blur-xl border border-white/10 rounded-2xl text-white shadow-2xl focus-within:border-brand transition-all">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 text-brand animate-spin shrink-0" />
                ) : (
                  <Search className="w-4 h-4 text-white/50 shrink-0" />
                )}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchPlaces(e.target.value)}
                  placeholder="Search all places, towns, streets..."
                  className="bg-transparent text-white text-xs font-semibold outline-none w-full placeholder:text-white/40"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="text-white/40 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* SEARCH RESULTS DROPDOWN */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#161A22] border border-white/15 rounded-2xl overflow-hidden shadow-2xl max-h-56 overflow-y-auto z-[1001]">
                  {searchResults.map((item) => (
                    <button
                      key={item.place_id}
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/10 border-b border-white/5 flex items-start gap-2.5 transition-all text-xs"
                    >
                      <MapPin className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-bold truncate">
                          {item.name || item.display_name.split(',')[0]}
                        </p>
                        <p className="text-white/40 text-[10px] truncate">{item.display_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* TAP INSTRUCTION OVERLAY */}
          {!selectedLat && !searchQuery && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-18 left-4 right-4 z-[999] flex items-center gap-3 px-4 py-2.5 bg-brand/90 backdrop-blur-xl rounded-2xl text-white shadow-2xl"
            >
              <Navigation className="w-4 h-4 shrink-0 animate-pulse" />
              <p className="font-bold text-xs">
                Tap anywhere on the map or search any place above to select your address
              </p>
            </motion.div>
          )}
        </div>

        {/* ─── BOTTOM INFO PANEL ─── */}
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative z-50 bg-[#0B0E14] border-t border-white/5"
        >
          {/* Location Details */}
          <div className="px-4 md:px-6 pt-5 pb-4 space-y-4">
            {/* Address */}
            {selectedLat !== null ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5 text-brand" />
                  </div>
                  <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <p className="text-[10px] font-black uppercase tracking-[3px] text-white/30">
                    Delivery Address
                  </p>
                  <button
                    onClick={() => {
                      setIsManualEntry(!isManualEntry);
                      if (!isManualEntry) setManualAddress(address);
                    }}
                    className={`px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all border ${
                      isManualEntry 
                        ? 'bg-brand text-white border-brand' 
                        : 'bg-white/5 text-white/40 border-white/5 hover:text-white'
                    }`}
                  >
                    {isManualEntry ? '🎯 Select on Map' : '✍️ Edit Manually'}
                  </button>
                </div>
                {isManualEntry ? (
                      <textarea
                        value={manualAddress}
                        onChange={(e) => {
                          setManualAddress(e.target.value);
                          setAddress(e.target.value);
                        }}
                        placeholder="Type your full address here..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm font-medium focus:border-brand outline-none transition-all h-24 resize-none"
                      />
                    ) : isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-brand" />
                        <span className="text-white/40 text-sm font-medium">Fetching address...</span>
                      </div>
                    ) : (
                      <p className="text-white font-bold text-sm leading-relaxed truncate">
                        {address}
                      </p>
                    )}
                    <p className="text-white/20 text-[10px] font-mono mt-1">
                      {selectedLat.toFixed(6)}, {selectedLng?.toFixed(6)}
                    </p>
                  </div>
                </div>

                {/* Distance & Delivery Status */}
                <div className="flex items-center gap-3">
                  <div className={`flex-1 px-4 py-3 rounded-xl border ${
                    isDeliverable
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-red-500/5 border-red-500/20'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[2px] text-white/30">
                          Distance
                        </p>
                        <p className="text-white font-black text-lg italic tracking-tight">
                          {distance} <span className="text-sm font-bold text-white/40">km</span>
                        </p>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                        isDeliverable
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {isDeliverable ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Deliverable
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Out of Range
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nearby Restaurants Count */}
                {(nearbyRestaurants.length > 0 || loadingNearby) && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 rounded-xl border border-white/5">
                    <Store className="w-4 h-4 text-brand" />
                    {loadingNearby ? (
                      <span className="text-white/40 text-xs font-bold">Finding nearby restaurants...</span>
                    ) : (
                      <span className="text-white/60 text-xs font-bold">
                        {nearbyRestaurants.length} restaurants within 2km
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-4 bg-white/5 rounded-2xl border border-white/5">
                <ChevronDown className="w-5 h-5 text-brand animate-bounce" />
                <p className="text-white/40 font-bold text-sm">
                  No location selected yet
                </p>
              </div>
            )}
          </div>

          {/* Confirm Button */}
          <div className="px-4 md:px-6 pb-6 pt-1">
            <button
              onClick={handleConfirmLocation}
              disabled={selectedLat === null || isLoading}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl ${
                selectedLat !== null && !isLoading
                  ? isDeliverable
                    ? 'bg-brand text-white shadow-brand/30 hover:bg-orange-600'
                    : 'bg-red-500/80 text-white shadow-red-500/20 hover:bg-red-600'
                  : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              {selectedLat === null
                ? 'Select a location first'
                : isLoading
                ? 'Processing...'
                : isDeliverable
                ? 'Confirm Delivery Location'
                : 'Confirm (Out of Range)'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

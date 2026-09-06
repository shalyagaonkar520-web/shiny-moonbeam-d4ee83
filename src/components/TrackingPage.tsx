import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, MapPin, Phone, Truck, Clock, Store, Navigation, ShieldCheck } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { useSEO } from '../utils/seo';
import FoodLoader from './FoodLoader';

// Helper to calculate distance in km via Haversine
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

export default function TrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  useSEO("Live Tracking", "Track your live delivery from Mom's Magic on our interactive map.");

  const [order, setOrder] = useState<any>(null);
  const [rider, setRider] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Leaflet references
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const polylineRef = useRef<L.Polyline | null>(null);

  // 1. Real-time Listener for the Order document
  useEffect(() => {
    if (!orderId) return;

    const orderDocRef = doc(db, 'orders', orderId);
    const unsubscribeOrder = onSnapshot(orderDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const orderData = docSnap.data();
        setOrder(orderData);
        setLoading(false);
      } else {
        // Fallback: check if we have it in localStorage
        try {
          const stored = JSON.parse(localStorage.getItem('moms_magic_orders') || '[]');
          const localOrder = stored.find((o: any) => o.id === orderId);
          if (localOrder) {
            setOrder(localOrder);
            setLoading(false);
          } else {
            toast.error('Order not found.');
            navigate('/profile');
          }
        } catch (e) {
          setLoading(false);
        }
      }
    }, (error) => {
      console.error("Firestore order subscription error:", error);
    });

    return () => unsubscribeOrder();
  }, [orderId, navigate]);

  // 2. Real-time Listener for the Rider document
  useEffect(() => {
    if (!order || !order.riderId || order.riderId === '') {
      setRider(null);
      return;
    }

    const riderDocRef = doc(db, 'riders', order.riderId);
    const unsubscribeRider = onSnapshot(riderDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setRider(docSnap.data());
      }
    });

    return () => unsubscribeRider();
  }, [order]);

  // 3. Initialize Leaflet Map
  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      // Start centered on Yellapur
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([14.9643, 74.7121], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(mapInstance.current);

      L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // 4. Update Map Markers and Bounds dynamically when coordinates change
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !order) return;

    const restCoords: [number, number] = [14.9643, 74.7121]; // Mom's Magic Kitchen coordinates
    const custCoords: [number, number] = [
      order.deliveryLocation?.lat || 14.9667,
      order.deliveryLocation?.lng || 74.7167
    ];
    const riderCoords: [number, number] | null = rider?.currentLocation?.lat && rider?.currentLocation?.lng
      ? [rider.currentLocation.lat, rider.currentLocation.lng]
      : null;

    // Custom UI icons matching Swish styles
    const restaurantIcon = L.divIcon({
      html: '<div class="w-8 h-8 rounded-full bg-orange-600 border-2 border-white flex items-center justify-center shadow-lg font-bold text-sm">🍳</div>',
      className: 'custom-div-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const customerIcon = L.divIcon({
      html: '<div class="w-8 h-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center shadow-lg font-bold text-sm">🏠</div>',
      className: 'custom-div-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const riderIcon = L.divIcon({
      html: '<div class="w-9 h-9 rounded-full bg-[#4CD964] border-2 border-white flex items-center justify-center shadow-2xl font-bold text-sm animate-bounce shadow-[#4CD964]/50">🛵</div>',
      className: 'custom-div-icon',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    // Handle Restaurant Marker
    if (!markersRef.current['restaurant']) {
      markersRef.current['restaurant'] = L.marker(restCoords, { icon: restaurantIcon }).addTo(map)
        .bindPopup('<b>Mom\'s Magic Kitchen</b>');
    } else {
      markersRef.current['restaurant'].setLatLng(restCoords);
    }

    // Handle Customer Marker
    if (!markersRef.current['customer']) {
      markersRef.current['customer'] = L.marker(custCoords, { icon: customerIcon }).addTo(map)
        .bindPopup(`<b>Your Location</b><br/>${order.deliveryLocation?.address || ''}`);
    } else {
      markersRef.current['customer'].setLatLng(custCoords);
    }

    // Handle Rider Marker
    if (riderCoords) {
      if (!markersRef.current['rider']) {
        markersRef.current['rider'] = L.marker(riderCoords, { icon: riderIcon }).addTo(map)
          .bindPopup(`<b>Delivery Partner: ${rider.name}</b>`);
      } else {
        markersRef.current['rider'].setLatLng(riderCoords);
      }
    } else if (markersRef.current['rider']) {
      markersRef.current['rider'].remove();
      delete markersRef.current['rider'];
    }

    // Draw route polyline linking points
    const routePoints: Array<[number, number]> = [];
    routePoints.push(restCoords);
    if (riderCoords) {
      routePoints.push(riderCoords);
    }
    routePoints.push(custCoords);

    if (polylineRef.current) {
      polylineRef.current.setLatLngs(routePoints);
    } else {
      polylineRef.current = L.polyline(routePoints, {
        color: '#4CD964',
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 8'
      }).addTo(map);
    }

    // Fit map view to wrap all active markers nicely
    const bounds = L.latLngBounds(routePoints);
    map.fitBounds(bounds, { padding: [50, 50] });

  }, [order, rider]);

  // Calculations for remaining distance and ETA
  const getTrackingMetrics = () => {
    if (!order) return { distance: 0, eta: 0 };
    
    // Coordinates
    const lat1 = rider?.currentLocation?.lat || 14.9643; // Rider or Restaurant
    const lon1 = rider?.currentLocation?.lng || 74.7121;
    const lat2 = order.deliveryLocation?.lat || 14.9667;
    const lon2 = order.deliveryLocation?.lng || 74.7167;

    const distance = calculateDistance(lat1, lon1, lat2, lon2);
    
    // Average rider speed is 22 km/h inside town routes
    const speedKmh = 22;
    // Calculate minutes and add 3 mins packaging/traffic buffer
    const eta = Math.ceil((distance / speedKmh) * 60) + 3;

    return {
      distance: parseFloat(distance.toFixed(1)),
      eta: order.status === 'delivered' ? 0 : eta
    };
  };

  const metrics = getTrackingMetrics();

  if (loading) {
    return <FoodLoader />;
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col relative pb-32">
      {/* 1. Leaflet Interactive Map View */}
      <div className="flex-1 w-full relative z-10 min-h-[50vh] md:min-h-[60vh] bg-neutral-900">
        <div ref={mapRef} className="w-full h-full absolute inset-0" />
        
        {/* Floating Back Action */}
        <button 
          onClick={() => navigate('/profile')}
          className="absolute top-6 left-6 z-20 w-10 h-10 rounded-full bg-matte-black/80 border border-white/10 flex items-center justify-center text-white backdrop-blur-md cursor-pointer hover:border-[#4CD964] transition-all active:scale-95 shadow-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Order Tracking Status Drawer Sheet */}
      <div className="relative z-20 bg-matte-black/95 border-t border-[#4CD964]/20 rounded-t-[35px] p-6 space-y-6 -mt-6 backdrop-blur-lg shadow-[0_-10px_35px_rgba(76,217,100,0.1)]">
        
        {/* ETA & Distance Card */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4 text-left">
            <div className="bg-[#4CD964]/10 p-3 rounded-xl border border-[#4CD964]/20">
              <Clock className="w-6 h-6 text-[#4CD964]" />
            </div>
            <div>
              <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Estimated Arrival</p>
              <h3 className="text-2xl font-black italic text-white mt-1">
                {order.status === 'delivered' ? 'Arrived' : `${metrics.eta} Mins`}
              </h3>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4 text-left">
            <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
              <Navigation className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Remaining Distance</p>
              <h3 className="text-2xl font-black italic text-white mt-1">
                {order.status === 'delivered' ? '0.0 km' : `${metrics.distance} km`}
              </h3>
            </div>
          </div>
        </div>

        {/* Step Indicator Panel */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3 text-left">
            <div className={`p-2.5 rounded-full shrink-0 ${
              order.status === 'delivered' ? 'bg-emerald-500 text-black' : 'bg-[#4CD964]/20 text-[#4CD964] animate-pulse'
            }`}>
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase text-white tracking-wide">
                {order.status === 'pending' ? 'Waiting for Confirmation' :
                 order.status === 'Preparing' ? 'Kitchen is Cooking Your Feast' :
                 order.status === 'Out For Delivery' ? 'Rider is Out For Delivery' :
                 order.status === 'delivered' ? 'Order Delivered!' : 'Processing Order'}
              </h4>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5">
                Status: {order.status}
              </p>
            </div>
          </div>

          {/* Simple progress bar */}
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                order.status === 'delivered' ? 'bg-emerald-500' : 'bg-[#4CD964]'
              }`}
              style={{
                width: 
                  order.status === 'pending' ? '15%' :
                  order.status === 'Preparing' ? '50%' :
                  order.status === 'Out For Delivery' ? '85%' :
                  order.status === 'delivered' ? '100%' : '10%'
              }}
            />
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* Rider & Address Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          {rider ? (
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-full bg-[#4CD964]/10 border border-[#4CD964]/20 flex items-center justify-center text-xl text-[#4CD964] font-black uppercase">
                {rider.name.charAt(0)}
              </div>
              <div>
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Assigned Rider</p>
                <h4 className="text-base font-extrabold text-white mt-0.5">{rider.name}</h4>
                <p className="text-[10px] text-[#4CD964] font-bold">{rider.phone}</p>
              </div>
              <a
                href={`tel:${rider.phone}`}
                className="ml-4 w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:border-[#4CD964] flex items-center justify-center text-[#4CD964] transition-colors"
              >
                <Phone className="w-4 h-4 fill-current text-[#4CD964]" />
              </a>
            </div>
          ) : (
            <div className="text-left py-2">
              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Delivery Partner</p>
              <h4 className="text-sm font-bold text-white mt-1">Rider assignment in progress... 🛵</h4>
              <p className="text-[10px] text-white/40 leading-relaxed mt-0.5">
                Our kitchen is preparing your box. Once a delivery partner accepts, you will see their details here.
              </p>
            </div>
          )}

          <div className="text-left sm:text-right space-y-1">
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Delivery Destination</p>
            <h4 className="text-xs font-bold text-white truncate max-w-xs">{order.deliveryLocation?.address}</h4>
            <p className="text-[9px] text-[#4CD964] font-black uppercase tracking-widest mt-1">₹{order.grandTotal} • {order.paymentMethod}</p>
          </div>
        </div>

        {/* Footer badges */}
        <div className="flex items-center justify-center gap-2 mt-2 text-white/20 font-black uppercase tracking-[3px] text-[8px]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#4CD964]" /> Live GPS Satellite Encrypted
        </div>

      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, MapPin, BookmarkPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSEO } from '../utils/seo';
import { useLocationStore, DeliveryLocation } from '../store/locationStore';
import { useSavedAddresses, samePlace } from '../store/savedAddressStore';
import SavedAddressList from './SavedAddressList';
import SaveAddressSheet from './SaveAddressSheet';

export default function AddressesPage() {
  useSEO("Saved Addresses - Mintoo", 'Manage your saved delivery addresses.');
  const navigate = useNavigate();
  const { deliveryLocation, isLocationPickerOpen, openLocationPicker } = useLocationStore();
  const addresses = useSavedAddresses();
  const [sheetFor, setSheetFor] = useState<DeliveryLocation | null>(null);

  // "Add new address" opens the shared map picker; when it closes with a
  // freshly confirmed location, ask for the label and house number.
  const adding = useRef<{ before: DeliveryLocation | null } | null>(null);
  useEffect(() => {
    if (isLocationPickerOpen || !adding.current) return;
    const { before } = adding.current;
    adding.current = null;
    if (deliveryLocation && deliveryLocation !== before) setSheetFor(deliveryLocation);
  }, [isLocationPickerOpen, deliveryLocation]);

  const addNew = () => {
    adding.current = { before: deliveryLocation };
    openLocationPicker();
  };

  const currentUnsaved = !!deliveryLocation && !addresses.some((a) => samePlace(a, deliveryLocation));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff1f4]/70 via-[#fff8fa]/60 to-white text-gray-900 pb-32 pt-6 px-4">
      <div className="max-w-md mx-auto space-y-5 text-left">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-9 h-9 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center text-gray-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-black text-gray-900">Saved Addresses</h1>
        </div>

        <button
          onClick={addNew}
          className="w-full py-3.5 rounded-2xl bg-white border border-rose-200 text-[#e11d48] font-black text-sm flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add new address
        </button>

        {currentUnsaved && (
          <div className="bg-white rounded-[22px] border border-rose-100 p-3.5 flex items-start gap-3 shadow-sm">
            <MapPin className="w-4 h-4 text-[#e11d48] shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current location</p>
              <p className="text-xs font-bold text-gray-900 line-clamp-2">{deliveryLocation!.address}</p>
            </div>
            <button
              onClick={() => setSheetFor(deliveryLocation)}
              className="shrink-0 flex items-center gap-1 text-xs font-black text-[#e11d48]"
            >
              <BookmarkPlus className="w-4 h-4" /> Save
            </button>
          </div>
        )}

        {addresses.length === 0 ? (
          <p className="text-center text-xs font-semibold text-gray-500 py-8">
            No saved addresses yet. Save Home and Work to check out in one tap.
          </p>
        ) : (
          <SavedAddressList manage onSelect={(a) => toast.success(`Delivering to ${a.label}`)} />
        )}
      </div>

      <SaveAddressSheet open={!!sheetFor} location={sheetFor} onClose={() => setSheetFor(null)} />
    </div>
  );
}

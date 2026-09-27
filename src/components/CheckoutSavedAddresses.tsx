import { useState } from 'react';
import { BookmarkPlus } from 'lucide-react';
import { useLocationStore } from '../store/locationStore';
import { useSavedAddresses, samePlace } from '../store/savedAddressStore';
import SavedAddressList from './SavedAddressList';
import SaveAddressSheet from './SaveAddressSheet';

/** One-tap saved addresses under the Checkout delivery summary, plus "Save this address". */
export default function CheckoutSavedAddresses() {
  const { deliveryLocation } = useLocationStore();
  const addresses = useSavedAddresses();
  const [sheetOpen, setSheetOpen] = useState(false);

  const currentUnsaved = !!deliveryLocation && !addresses.some((a) => samePlace(a, deliveryLocation));
  if (addresses.length === 0 && !currentUnsaved) return null;

  return (
    <div className="space-y-2">
      <SavedAddressList compact />
      {currentUnsaved && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-1.5 text-[11px] font-black text-[#e11d48]"
        >
          <BookmarkPlus className="w-3.5 h-3.5" /> Save this address (Home / Work)
        </button>
      )}
      <SaveAddressSheet open={sheetOpen} location={deliveryLocation} onClose={() => setSheetOpen(false)} />
    </div>
  );
}

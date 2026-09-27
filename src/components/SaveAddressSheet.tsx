import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Home, Briefcase, MapPin, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSavedAddressStore, AddressLabel, SavedAddress } from '../store/savedAddressStore';

const LABELS: Array<{ label: AddressLabel; Icon: typeof Home }> = [
  { label: 'Home', Icon: Home },
  { label: 'Work', Icon: Briefcase },
  { label: 'Other', Icon: MapPin },
];

interface Props {
  open: boolean;
  location: { lat: number; lng: number; address: string } | null;
  onClose: () => void;
  onSaved?: (a: SavedAddress) => void;
}

/** Bottom sheet that turns a map location into a saved Home / Work / Other address. */
export default function SaveAddressSheet({ open, location, onClose, onSaved }: Props) {
  const save = useSavedAddressStore((s) => s.save);
  const [label, setLabel] = useState<AddressLabel>('Home');
  const [house, setHouse] = useState('');
  const [landmark, setLandmark] = useState('');

  useEffect(() => {
    if (open) {
      setLabel('Home');
      setHouse('');
      setLandmark('');
    }
  }, [open]);

  if (!open || !location) return null;

  const handleSave = () => {
    if (!house.trim()) {
      toast.error('Add your house / flat number so the rider can find you.');
      return;
    }
    const saved = save({ label, house, landmark, address: location.address, lat: location.lat, lng: location.lng });
    toast.success(`Saved as ${label}`);
    onSaved?.(saved);
    onClose();
  };

  // Portalled to <body>: inside the page-transition wrapper the sheet would be
  // stacked below the bottom nav bar, which then covers the Save button.
  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="save-address-title">
      <div className="w-full max-w-md bg-white rounded-t-[26px] sm:rounded-[26px] p-5 space-y-4 shadow-2xl text-left text-gray-900">
        <div className="flex items-center justify-between">
          <h2 id="save-address-title" className="text-base font-black">Save address</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-gray-50 border border-gray-200/80">
          <MapPin className="w-4 h-4 text-[#e11d48] shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-gray-800 line-clamp-2">{location.address}</p>
        </div>

        <div className="space-y-2.5">
          <label className="block">
            <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">House / Flat / Floor *</span>
            <input
              value={house}
              onChange={(e) => setHouse(e.target.value)}
              placeholder="e.g. #471, 2nd floor, Sai Nilaya"
              className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm font-semibold outline-none focus:border-[#e11d48]"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Landmark (optional)</span>
            <input
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Opposite bus stand"
              className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm font-semibold outline-none focus:border-[#e11d48]"
            />
          </label>
        </div>

        <div>
          <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Save as</span>
          <div className="mt-1.5 flex gap-2">
            {LABELS.map(({ label: l, Icon }) => (
              <button
                key={l}
                onClick={() => setLabel(l)}
                aria-pressed={label === l}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 ${
                  label === l ? 'bg-rose-50 border-[#e11d48] text-[#e11d48]' : 'bg-white border-gray-200 text-gray-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {l}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl bg-[#e11d48] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
        >
          <Check className="w-4 h-4" /> Save address
        </button>
      </div>
    </div>,
    document.body
  );
}

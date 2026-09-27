import { Home, Briefcase, MapPin, Trash2, Check } from 'lucide-react';
import { useSavedAddresses, useSavedAddressStore, fullAddress, samePlace, SavedAddress } from '../store/savedAddressStore';
import { useLocationStore, SERVICE_RADIUS_KM } from '../store/locationStore';
import { haversineDistance } from '../lib/location';

const ICONS = { Home, Work: Briefcase, Other: MapPin } as const;

interface Props {
  /** Called after an address becomes the delivery location. */
  onSelect?: (a: SavedAddress) => void;
  /** Show delete buttons (the Saved Addresses page). */
  manage?: boolean;
  /** Compact chips for Checkout instead of full rows. */
  compact?: boolean;
}

export default function SavedAddressList({ onSelect, manage, compact }: Props) {
  const addresses = useSavedAddresses();
  const { deliverTo, remove } = useSavedAddressStore();
  const { deliveryLocation, restaurantLocation } = useLocationStore();

  if (addresses.length === 0) return null;

  const distanceOf = (a: SavedAddress) =>
    haversineDistance(restaurantLocation.lat, restaurantLocation.lng, a.lat, a.lng);
  const isCurrent = (a: SavedAddress) => !!deliveryLocation && samePlace(deliveryLocation, a);

  const choose = (a: SavedAddress) => {
    deliverTo(a);
    onSelect?.(a);
  };

  if (compact) {
    return (
      <div className="flex gap-2 overflow-x-auto no-scrollbar" role="group" aria-label="Saved addresses">
        {addresses.map((a) => {
          const Icon = ICONS[a.label];
          const current = isCurrent(a);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => choose(a)}
              aria-pressed={current}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-bold max-w-[180px] ${
                current ? 'bg-rose-50 border-[#e11d48] text-[#e11d48]' : 'bg-white border-gray-200 text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{a.label}{a.house ? ` · ${a.house}` : ''}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {addresses.map((a) => {
        const Icon = ICONS[a.label];
        const dist = distanceOf(a);
        const outside = dist > SERVICE_RADIUS_KM;
        const current = isCurrent(a);
        return (
          <li key={a.id} className={`rounded-2xl border p-3 flex items-start gap-3 bg-white ${current ? 'border-[#e11d48]' : 'border-gray-200'}`}>
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-[#e11d48]" />
            </div>
            <button type="button" onClick={() => choose(a)} className="min-w-0 flex-1 text-left">
              <p className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                {a.label}
                {current && <Check className="w-3.5 h-3.5 text-[#e11d48]" aria-label="Current delivery address" />}
              </p>
              <p className="text-xs font-medium text-gray-600 line-clamp-2">{fullAddress(a)}</p>
              <p className={`text-[10px] font-bold mt-0.5 ${outside ? 'text-amber-700' : 'text-gray-400'}`}>
                {dist.toFixed(1)} km{outside ? ' · outside delivery area' : ''}
              </p>
            </button>
            {manage && (
              <button
                type="button"
                onClick={() => remove(a.id)}
                aria-label={`Delete ${a.label} address`}
                className="p-2 -m-1 text-gray-400 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

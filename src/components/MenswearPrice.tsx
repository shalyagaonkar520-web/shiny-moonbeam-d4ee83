import { MENSWEAR_SHOW_MRP, menswearMrp, menswearOffPct } from '../data/mensWear';

/** Selling price, with the struck-through MRP and percent off beside it. */
export default function MenswearPrice({ price, size = 'sm' }: { price: number; size?: 'sm' | 'lg' }) {
  const big = size === 'lg';
  return (
    <div className="flex items-baseline flex-wrap gap-x-1.5 gap-y-0.5">
      <span className={`font-black text-gray-900 ${big ? 'text-2xl' : 'text-sm'}`}>₹{price.toLocaleString('en-IN')}</span>
      {MENSWEAR_SHOW_MRP && (
        <>
          <span className={`text-gray-400 line-through ${big ? 'text-sm' : 'text-[11px]'}`}>₹{menswearMrp(price).toLocaleString('en-IN')}</span>
          <span className={`font-black text-emerald-600 ${big ? 'text-sm' : 'text-[11px]'}`}>{menswearOffPct(price)}% off</span>
        </>
      )}
    </div>
  );
}

type PriceSort = 'relevance' | 'low' | 'high';
type Diet = 'all' | 'veg' | 'nonveg';

interface Props {
  priceSort: PriceSort;
  onPriceSort: (s: PriceSort) => void;
  priceCap: number | null;
  onPriceCap: (cap: number | null) => void;
  /** Search results have no Veg/Non-Veg bar of their own, so they pass these. */
  diet?: Diet;
  onDiet?: (d: Diet) => void;
}

const PRICE_CAPS = [150, 250];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex-shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
        active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

/** Swiggy-style quick filters for the dish grid: price caps, price sort and (in search) diet. */
export default function MenuFilterChips({ priceSort, onPriceSort, priceCap, onPriceCap, diet, onDiet }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1" role="group" aria-label="Filter and sort dishes">
      {onDiet && diet !== undefined && (
        <>
          <Chip active={diet === 'veg'} onClick={() => onDiet(diet === 'veg' ? 'all' : 'veg')}>🟢 Veg</Chip>
          <Chip active={diet === 'nonveg'} onClick={() => onDiet(diet === 'nonveg' ? 'all' : 'nonveg')}>🔴 Non-Veg</Chip>
        </>
      )}
      {PRICE_CAPS.map((cap) => (
        <Chip key={cap} active={priceCap === cap} onClick={() => onPriceCap(priceCap === cap ? null : cap)}>
          Under ₹{cap}
        </Chip>
      ))}
      <Chip active={priceSort === 'low'} onClick={() => onPriceSort(priceSort === 'low' ? 'relevance' : 'low')}>
        Price: Low → High
      </Chip>
      <Chip active={priceSort === 'high'} onClick={() => onPriceSort(priceSort === 'high' ? 'relevance' : 'high')}>
        Price: High → Low
      </Chip>
    </div>
  );
}

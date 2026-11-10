import { Shirt } from 'lucide-react';

/** Loading screen for Mintoo Men's Wear: the food loader's layout, in clothes. */
export default function ShirtLoader() {
  const items = ['👕', '👖', '🧥', '👔', '🧢', '👟'];
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#fff1f4] via-[#fff8fa] to-white px-4 select-none" role="status" aria-label="Loading men's wear">
      <div className="relative flex items-center justify-center w-52 h-52">
        <div className="absolute inset-0 bg-rose-400/15 rounded-full blur-2xl animate-pulse pointer-events-none" />
        <div className="absolute inset-2 rounded-full border-2 border-dashed border-rose-200/80 animate-spin-slow" />
        <div className="absolute inset-0 animate-food-orbit pointer-events-none">
          {items.map((emoji, i) => {
            const a = ((i * 360) / items.length) * (Math.PI / 180);
            return (
              <div key={emoji} className="absolute top-1/2 left-1/2" style={{ transform: `translate(${Math.cos(a) * 86}px, ${Math.sin(a) * 86}px) translate(-50%, -50%)` }}>
                <div className="animate-food-counter w-10 h-10 rounded-2xl bg-white shadow-md border border-rose-100 flex items-center justify-center text-lg">{emoji}</div>
              </div>
            );
          })}
        </div>
        <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-tr from-[#ff4d6d] to-[#e11d48] text-white flex items-center justify-center shadow-xl shadow-rose-500/25 border-4 border-white">
          <Shirt className="w-11 h-11 animate-bounce" strokeWidth={2.2} />
        </div>
      </div>
      <div className="mt-7 text-center space-y-1.5">
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Mintoo Men's Wear</h2>
        <p className="text-xs font-bold text-[#e11d48] animate-pulse">Getting your fit ready...</p>
        <div className="pt-2">
          <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200/90 text-rose-700 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
            ⚡ 10-minute delivery · 2-day returns
          </span>
        </div>
      </div>
    </div>
  );
}

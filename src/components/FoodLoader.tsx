import React from 'react';

export default function FoodLoader() {
  const foodItems = [
    { emoji: '🍲', label: 'Biryani' },
    { emoji: '🍗', label: 'Chicken' },
    { emoji: '🍕', label: 'Pizza' },
    { emoji: '🥘', label: 'Curry' },
    { emoji: '🍰', label: 'Cake' },
    { emoji: '🌯', label: 'Roll' },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#fff1f4] via-[#fff8fa] to-[#ffffff] text-gray-900 px-4 select-none">
      <div className="relative flex items-center justify-center w-52 h-52">
        {/* Soft Ambient Rose Glow */}
        <div className="absolute inset-0 bg-rose-400/15 rounded-full blur-2xl animate-pulse pointer-events-none" />

        {/* Outer Circular Track */}
        <div className="absolute inset-2 rounded-full border-2 border-dashed border-rose-200/80 animate-spin-slow" />

        {/* Orbiting Food Items */}
        <div className="absolute inset-0 animate-food-orbit pointer-events-none">
          {foodItems.map((item, index) => {
            const angle = (index * (360 / foodItems.length)) * (Math.PI / 180);
            const radius = 86; // px
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <div
                key={index}
                className="absolute top-1/2 left-1/2"
                style={{
                  transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
                }}
              >
                <div className="animate-food-counter w-10 h-10 rounded-2xl bg-white shadow-md border border-rose-100 flex items-center justify-center text-lg">
                  <span>{item.emoji}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center Platter with Steaming Chef Dish */}
        <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-tr from-[#ff4d6d] to-[#e11d48] text-white flex flex-col items-center justify-center shadow-xl shadow-rose-500/25 border-4 border-white">
          <span className="text-3xl animate-bounce">🍲</span>
          <span className="text-[9px] font-black uppercase tracking-wider text-rose-100 mt-0.5">
            Mom's
          </span>
        </div>
      </div>

      {/* Brand & Loading Status */}
      <div className="mt-7 text-center space-y-1.5">
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
          Mom's Magic
        </h2>
        <p className="text-xs font-bold text-[#e11d48] flex items-center justify-center gap-1.5 animate-pulse">
          <span>Preparing delicious food...</span>
          <span>🍳</span>
        </p>
        <div className="pt-2">
          <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200/90 text-rose-700 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
            ⚡ 10-Minute Fast Delivery in Yellapur
          </span>
        </div>
      </div>
    </div>
  );
}

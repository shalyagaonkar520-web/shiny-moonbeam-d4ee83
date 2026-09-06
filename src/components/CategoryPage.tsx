import React from 'react';
import LandingPage from './LandingPage';
import { ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CategoryPage({ type }: { type: 'food' | 'grocery' }) {
  const navigate = useNavigate();

  if (type === 'grocery') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6 text-center p-6 bg-white text-gray-900">
        <div className="w-32 h-32 bg-blue-50 rounded-3xl flex items-center justify-center border border-blue-100">
          <ShoppingBag className="w-16 h-16 text-blue-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black uppercase text-gray-900">Fresh Grocery Market</h2>
          <p className="text-gray-500 font-bold text-xs uppercase tracking-wider">Curating the finest essentials for you</p>
        </div>
        <button onClick={() => navigate('/')} className="bg-[#1836c2] text-white font-bold text-xs uppercase px-8 py-3 rounded-full shadow-md">
          Back to Food Order
        </button>
      </div>
    );
  }

  return <LandingPage />;
}

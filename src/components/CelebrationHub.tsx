import { useState, useEffect } from 'react';
import { notifyTelegram } from '../lib/notifyTelegram';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Cake, PartyPopper, Sparkles, X, Wand2, Hammer, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '../store/cartStore';
import { useBulkOrderStore } from '../store/bulkOrderStore';
import { useSEO } from '../utils/seo';

const GALLERY_IMAGES = [
  {
    url: '/media__1779029850131.webp',
    label: 'Butterfly Birthday Theme',
  },
  {
    url: '/media__1779029850152.webp',
    label: 'Pink Balloon Setup',
  },
  {
    url: '/media__1779029850273.webp',
    label: 'Black Silver Luxury Setup',
  },
  {
    url: '/media__1779029850300.webp',
    label: 'Golden Birthday Setup',
  },
];

const CELEBRATION_CARDS = [
  {
    id: 'birthday',
    title: 'Birthday Celebrations',
    subtitle: 'Make it unforgettable ✨',
    icon: Cake,
    emoji: '🎂',
    gradient: 'from-purple-600 via-pink-600 to-rose-500',
    glow: 'shadow-[0_0_40px_rgba(168,85,247,0.4)]',
    border: 'border-purple-500/30',
    bg: 'from-purple-900/40 to-pink-900/40',
    image: '/media__1779029850131.webp',
    tag: 'MOST POPULAR 🔥',
  },
  {
    id: 'party',
    title: 'Party Celebrations',
    subtitle: 'Luxury vibes & fun 🎊',
    icon: PartyPopper,
    emoji: '🎉',
    gradient: 'from-blue-600 via-indigo-600 to-amber-500',
    glow: 'shadow-[0_0_40px_rgba(99,102,241,0.4)]',
    border: 'border-blue-400/30',
    bg: 'from-blue-900/40 to-indigo-900/40',
    image: '/media__1779029850273.webp',
    tag: 'TRENDING ⚡',
  },
  {
    id: 'function',
    title: 'Function Setup',
    subtitle: 'Elegant & premium 🕯️',
    icon: Sparkles,
    emoji: '✨',
    gradient: 'from-gray-900 via-yellow-900 to-amber-700',
    glow: 'shadow-[0_0_40px_rgba(245,158,11,0.3)]',
    border: 'border-amber-500/30',
    bg: 'from-gray-900/60 to-amber-900/40',
    image: '/media__1779029850300.webp',
    tag: 'PREMIUM ⭐',
  },
];

export default function CelebrationHub() {
  useSEO("Celebration Hub", "Host your birthday party, function setup, or luxury celebration with custom decorations from Moms Magic.");
  const navigate = useNavigate();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [budget, setBudget] = useState('');
  const [galleryIdx, setGalleryIdx] = useState(0);

  const { clearCart } = useCartStore();
  const { resetBulkOrder } = useBulkOrderStore();

  useEffect(() => {
    // Clear all food/snack cart items in Booking Hall
    clearCart();
    resetBulkOrder();
    toast.success('Cart cleared for setup booking! 🏛️', {
      duration: 2000,
      style: { background: '#0E0E18', color: '#a78bfa', border: '1px solid #7c3aed' }
    });
  }, [clearCart, resetBulkOrder]);

  const handleCardClick = (cardId: string) => {
    setSelectedCard(cardId);
    setBudget('');
    setGalleryIdx(0);
    setShowModal(true);
  };

  const handleWhatsAppSubmit = async () => {
    if (!budget.trim()) {
      toast.error('Please enter your budget');
      return;
    }
    const selectedCardData = CELEBRATION_CARDS.find(c => c.id === selectedCard);
    if (!selectedCardData) return;

    const message = [
      `🎉 *NEW CELEBRATION DESIGN REQUEST!* 🎉`,
      `━━━━━━━━━━━━━━━━`,
      `🎈 *Occasion:* ${selectedCardData.title}`,
      `💰 *My Budget:* ₹${budget.trim()}`,
      `📸 *Reference Style:* ${GALLERY_IMAGES[galleryIdx].label}`,
      `🔗 *Reference Setup:* http://localhost:5173${GALLERY_IMAGES[galleryIdx].url}`,
      ``,
      `Please contact me and help me set this up based on my budget! ✨`,
      `━━━━━━━━━━━━━━━━`,
      `🌟 Powered by Moms Magic`,
    ].join('\n');

    const waUrl = `https://wa.me/919606001790?text=${encodeURIComponent(message)}`;

    // Telegram notification; the server proxy holds the bot token.
    const escHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const tgMessage = [
      `🎈 <b>NEW PARTY SETUP BOOKING!</b> 🎈`,
      ``,
      `🎊 <b>Occasion:</b> ${escHtml(selectedCardData?.title || '')}`,
      `💰 <b>Budget:</b> ₹${escHtml(budget.trim())}`,
      `📸 <b>Reference Style:</b> ${escHtml(GALLERY_IMAGES[galleryIdx].label)}`,
      ``,
      `━━━━━━━━━━━━━━━━`,
      `🌟 <b>Moms Magic</b> - Celebration Hub`,
    ].join('\n');

    await notifyTelegram(tgMessage);

    toast.success('Opening WhatsApp to send reference! 🚀', {
      style: { background: '#0E0E18', color: '#a78bfa', border: '1px solid #7c3aed' }
    });
    setTimeout(() => {
      const newWindow = window.open(waUrl, '_blank');
      if (!newWindow) {
        window.location.href = waUrl;
      }
      setShowModal(false);
      setBudget('');
    }, 800);
  };

  const selectedCardData = CELEBRATION_CARDS.find(c => c.id === selectedCard);

  return (
    <div className="min-h-screen bg-[#050508] text-white pb-32 overflow-hidden relative">
      {/* Animated background blobs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-purple-700/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-pink-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] bg-indigo-600/8 rounded-full blur-[100px]" />
        {/* Floating sparkles */}
        {[...Array(18)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-lg select-none"
            style={{ left: `${(i * 17 + 5) % 95}%`, top: `${(i * 23 + 10) % 90}%` }}
            animate={{ y: [0, -30, 0], opacity: [0.2, 0.7, 0.2], rotate: [0, 180, 360] }}
            transition={{ duration: 4 + (i % 4), repeat: Infinity, delay: i * 0.3 }}
          >
            {['✨', '🌟', '💫', '⭐', '🎊', '🎈'][i % 6]}
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 px-4 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 pt-6 pb-2">
          <button
            onClick={() => navigate('/')}
            className="w-11 h-11 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-colors backdrop-blur-md"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md">
            🎉 Party Specials
          </div>
        </div>

        {/* Hero heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center py-10 space-y-3"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="text-5xl mb-2"
          >
            🎉
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none">
            Make Your
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
              Celebration Special
            </span>
          </h1>
          <p className="text-white/50 text-xs font-bold uppercase tracking-[4px]">
            Birthday • Party • Function Setup
          </p>
        </motion.div>
        {/* Quick Actions at starting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="grid grid-cols-1 gap-4 mb-8"
        >
          <button
            onClick={() => navigate('/bulk')}
            className="relative overflow-hidden group py-4 px-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all text-center flex flex-col items-center justify-center gap-1 shadow-lg shadow-black/40"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/15 to-pink-500/15 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Quick Planning</span>
            <span className="text-xs font-black uppercase tracking-tight text-white group-hover:text-purple-400 transition-colors">🎂 See Items</span>
          </button>


        </motion.div>

        {/* Celebration cards */}
        <div className="space-y-5">
          {CELEBRATION_CARDS.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -40 : 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.15 }}
                onClick={() => handleCardClick(card.id)}
                className="cursor-pointer group"
              >
                <div className={`relative rounded-[32px] overflow-hidden border ${card.border} ${card.glow} transition-all duration-500 group-hover:scale-[1.02] active:scale-[0.98]`}>
                  {/* Background image with overlay */}
                  <div className="absolute inset-0">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-500 group-hover:scale-110 scale-100 transition-transform"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-br ${card.bg}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  </div>

                  {/* Glitter shimmer overlay */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                    <div className={`absolute inset-0 bg-gradient-to-r ${card.gradient} opacity-10`} />
                  </div>

                  <div className="relative z-10 p-6 flex items-center gap-5">
                    {/* Icon orb */}
                    <div className={`w-16 h-16 rounded-[20px] bg-gradient-to-br ${card.gradient} flex items-center justify-center shrink-0 ${card.glow} group-hover:scale-110 transition-transform duration-300`}>
                      <span className="text-2xl">{card.emoji}</span>
                    </div>

                    <div className="flex-1">
                      {/* Tag */}
                      <span className={`text-[8px] font-black uppercase tracking-widest bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent mb-1 block`}>
                        {card.tag}
                      </span>
                      <h3 className="text-xl font-black italic uppercase tracking-tighter leading-tight text-white group-hover:text-white/90">
                        {card.title}
                      </h3>
                      <p className="text-white/50 text-[10px] font-bold mt-1">{card.subtitle}</p>
                    </div>

                    {/* Arrow */}
                    <motion.div
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${card.gradient} flex items-center justify-center shrink-0`}
                    >
                      <span className="text-white text-lg">→</span>
                    </motion.div>
                  </div>

                  {/* Bottom accent line */}
                  <div className={`h-1 bg-gradient-to-r ${card.gradient} opacity-60`} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Gallery preview strip */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-10"
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4 text-center">
            Our Past Setups 📸
          </p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {GALLERY_IMAGES.map((img, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05 }}
                className="shrink-0 w-28 h-28 rounded-[20px] overflow-hidden border border-white/10 relative"
              >
                <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && selectedCardData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-end justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-[#0E0E18] border border-white/10 rounded-[40px] p-6 space-y-6 relative max-h-[90vh] overflow-y-auto no-scrollbar"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-3xl">{selectedCardData.emoji}</span>
                  <h2 className="text-xl font-black italic uppercase tracking-tighter text-white mt-2">
                    Let's Set It Up For You!
                  </h2>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">
                    {selectedCardData.title}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <div className="space-y-5">
                {/* Budget input field */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block">
                    💰 Enter Your Proposed Budget (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">₹</span>
                    <input
                      type="number"
                      value={budget}
                      onChange={e => setBudget(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full py-4 pl-8 pr-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black placeholder-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Reference style carousel */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block">
                    📸 Choose Reference Setup Style
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {GALLERY_IMAGES.map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => setGalleryIdx(idx)}
                        className={`relative rounded-2xl overflow-hidden border cursor-pointer transition-all duration-300 ${
                          galleryIdx === idx
                            ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)] scale-[1.02]'
                            : 'border-white/10 hover:border-white/25 hover:scale-[1.01]'
                        }`}
                      >
                        <div className="aspect-[4/3] relative">
                          <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                          <div className={`absolute inset-0 bg-purple-600/20 transition-opacity duration-300 ${galleryIdx === idx ? 'opacity-100' : 'opacity-0'}`} />
                        </div>
                        <div className="p-2 bg-[#121222] text-center border-t border-white/5">
                          <p className={`text-[8px] font-black uppercase tracking-wide truncate ${galleryIdx === idx ? 'text-purple-400' : 'text-white/60'}`}>
                            {img.label}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit action */}
                <div className="pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleWhatsAppSubmit}
                    className={`w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-xs bg-gradient-to-r ${selectedCardData.gradient} text-white ${selectedCardData.glow} flex items-center justify-center gap-3 relative overflow-hidden`}
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
                    <Send className="w-4 h-4 shrink-0" />
                    Submit & Send Reference On WhatsApp 🚀
                  </motion.button>

                  {/* Secondary DIY Action inside budget page */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setShowModal(false);
                      navigate('/bulk');
                    }}
                    className="w-full mt-3 py-4 rounded-[24px] font-black uppercase tracking-widest text-[10px] bg-transparent border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2"
                  >
                    No thanks, I will order myself 🎂
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

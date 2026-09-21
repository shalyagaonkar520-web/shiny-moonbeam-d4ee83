import { useState, useRef } from 'react';
import { notifyTelegram } from '../lib/notifyTelegram';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, Sparkles, ChevronLeft as ArrowLeft, ChevronRight as ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSEO } from '../utils/seo';

const GALLERY = [
  {
    url: '/media__1779029850131.webp',
    label: 'Butterfly Birthday Theme 🦋',
    desc: 'Elegant butterfly + balloon arch with neon glow',
  },
  {
    url: '/media__1779029850152.webp',
    label: 'Pink Balloon Royale 🩷',
    desc: 'Pink & gold balloon setup with glitter backdrop',
  },
  {
    url: '/media__1779029850273.webp',
    label: 'Black Silver Luxury 🖤',
    desc: 'Premium dark chrome balloon arrangement',
  },
  {
    url: '/media__1779029850300.webp',
    label: 'Golden Grand Setup ✨',
    desc: 'Opulent gold sequin backdrop with balloon arch',
  },
];

const OCCASION_TYPES = [
  'Birthday', 'Anniversary', 'Baby Shower', 'Engagement',
  'Corporate Event', 'Wedding', 'Haldi / Mehndi', 'Other'
];

const WHATSAPP_NUMBER = '919606001790';

export default function CelebrationDesign() {
  useSEO("Design Celebration", "Submit your budget and event details to plan a custom balloon and stage setup with Moms Magic.");
  const navigate = useNavigate();
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    budget: '',
    occasion: '',
    date: '',
  });
  const [sending, setSending] = useState(false);

  const prevSlide = () => setGalleryIdx(i => (i - 1 + GALLERY.length) % GALLERY.length);
  const nextSlide = () => setGalleryIdx(i => (i + 1) % GALLERY.length);

  const handleChange = (key: keyof typeof form, value: string) => {
    if (key === 'date') {
      const tomorrowStr = (() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
      })();
      if (value && value < tomorrowStr) {
        toast.error('Please select a future event date (tomorrow onwards)');
        return;
      }
    }
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Please enter your name'); return; }
    if (!form.phone.trim() || form.phone.length < 10) { toast.error('Please enter a valid phone number'); return; }
    if (!form.budget.trim()) { toast.error('Please enter your budget'); return; }
    if (!form.occasion) { toast.error('Please select an occasion type'); return; }
    if (!form.date) { toast.error('Please select your event date'); return; }

    const tomorrowStr = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    })();
    if (form.date < tomorrowStr) {
      toast.error('Please select a future event date (tomorrow onwards)');
      return;
    }

    setSending(true);

    const message = [
      `🎉 *NEW CELEBRATION DESIGN REQUEST!* 🎉`,
      ``,
      `👤 *Name:* ${form.name.trim()}`,
      `📞 *Phone:* ${form.phone.trim()}`,
      `💰 *Budget:* ₹${form.budget.trim()}`,
      `🎊 *Occasion:* ${form.occasion}`,
      `📅 *Date:* ${form.date}`,
      ``,
      `Please share beautiful setup ideas based on my budget! ✨`,
      ``,
      `━━━━━━━━━━━━━━━━`,
      `🌟 Powered by Moms Magic`,
    ].join('\n');

    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    // Telegram notification; the server proxy holds the bot token.
    const escHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const tgMessage = [
      `🎉 <b>NEW CELEBRATION ENQUIRY!</b> 🎉`,
      ``,
      `👤 <b>Name:</b> ${escHtml(form.name.trim())}`,
      `📞 <b>Phone:</b> ${escHtml(form.phone.trim())}`,
      `💰 <b>Budget:</b> ₹${escHtml(form.budget.trim())}`,
      `🎊 <b>Occasion:</b> ${escHtml(form.occasion)}`,
      `📅 <b>Date:</b> ${escHtml(form.date)}`,
      ``,
      `━━━━━━━━━━━━━━━━`,
      `🌟 <b>Moms Magic</b> - Celebration Booking`,
    ].join('\n');

    await notifyTelegram(tgMessage);

    setTimeout(() => {
      setSending(false);
      toast.success('Opening WhatsApp! 🎉', {
        style: { background: '#0E0E18', color: '#a78bfa', border: '1px solid #7c3aed' }
      });
      const newWindow = window.open(waUrl, '_blank');
      if (!newWindow) {
        window.location.href = waUrl;
      } else {
        navigate('/celebration');
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white pb-36 relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-[60%] h-[50%] bg-purple-800/12 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[50%] h-[50%] bg-pink-700/12 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 px-4 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 pt-6 pb-4">
          <button
            onClick={() => navigate('/celebration')}
            className="w-11 h-11 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
              Mom's Magic Creates ✨
            </span>
          </div>
          <div className="w-11" />
        </div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center py-6 space-y-2"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-5xl"
          >
            💰
          </motion.div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">
            Tell Us Your
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
              Budget
            </span>
          </h1>
          <p className="text-white/40 text-xs font-bold leading-relaxed max-w-xs mx-auto">
            Share your budget and we'll send beautiful setup ideas directly on WhatsApp ✨
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          onSubmit={handleSubmit}
          className="space-y-4 mb-10"
        >
          {/* Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-purple-400/70 ml-1">
              👤 Your Name
            </label>
            <input
              type="text"
              placeholder="Enter your name"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              className="w-full bg-white/5 border border-white/10 focus:border-purple-500/60 rounded-2xl px-5 py-4 outline-none font-bold text-white placeholder:text-white/20 transition-colors text-sm backdrop-blur-md"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-purple-400/70 ml-1">
              📞 WhatsApp Number
            </label>
            <input
              type="tel"
              placeholder="+91 XXXXX XXXXX"
              value={form.phone}
              onChange={e => handleChange('phone', e.target.value)}
              className="w-full bg-white/5 border border-white/10 focus:border-purple-500/60 rounded-2xl px-5 py-4 outline-none font-bold text-white placeholder:text-white/20 transition-colors text-sm backdrop-blur-md"
            />
          </div>

          {/* Budget */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-purple-400/70 ml-1">
              💰 Your Budget (₹)
            </label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-purple-400 font-black text-lg">₹</span>
              <input
                type="number"
                placeholder="e.g. 5000, 10000, 20000"
                value={form.budget}
                onChange={e => handleChange('budget', e.target.value)}
                className="w-full bg-white/5 border border-white/10 focus:border-purple-500/60 rounded-2xl px-5 py-4 pl-10 outline-none font-bold text-white placeholder:text-white/20 transition-colors text-sm backdrop-blur-md"
              />
            </div>
            {/* Budget quick picks */}
            <div className="flex gap-2 flex-wrap pt-1">
              {['3000', '5000', '10000', '20000', '50000'].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleChange('budget', amt)}
                  className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${
                    form.budget === amt
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                  }`}
                >
                  ₹{parseInt(amt).toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          {/* Occasion Type */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-purple-400/70 ml-1">
              🎊 Occasion Type
            </label>
            <div className="flex gap-2 flex-wrap">
              {OCCASION_TYPES.map(occ => (
                <button
                  key={occ}
                  type="button"
                  onClick={() => handleChange('occasion', occ)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    form.occasion === occ
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 border-transparent text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                      : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                  }`}
                >
                  {occ}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-purple-400/70 ml-1">
              📅 Event Date
            </label>
            <input
              type="date"
              min={(() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                return tomorrow.toISOString().split('T')[0];
              })()}
              value={form.date}
              onChange={e => handleChange('date', e.target.value)}
              onKeyDown={e => e.preventDefault()}
              className="w-full bg-white/5 border border-white/10 focus:border-purple-500/60 rounded-2xl px-5 py-4 outline-none font-bold text-white transition-colors text-sm backdrop-blur-md [color-scheme:dark]"
            />
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={sending}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-5 rounded-[20px] font-black uppercase tracking-widest text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white shadow-[0_0_40px_rgba(168,85,247,0.4)] flex items-center justify-center gap-3 mt-2 relative overflow-hidden disabled:opacity-70"
          >
            {sending ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-5 h-5" />
                </motion.div>
                Sending...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Get Decoration Ideas on WhatsApp
              </>
            )}
          </motion.button>
        </motion.form>

        {/* Gallery Slider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
              Setup Inspiration 📸
            </p>
            <div className="text-[10px] font-black text-purple-400/60">
              {galleryIdx + 1} / {GALLERY.length}
            </div>
          </div>

          <div className="relative rounded-[28px] overflow-hidden border border-white/10">
            <AnimatePresence mode="wait">
              <motion.div
                key={galleryIdx}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.35 }}
                className="relative"
              >
                <img
                  src={GALLERY[galleryIdx].url}
                  alt={GALLERY[galleryIdx].label}
                  className="w-full h-56 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="font-black italic uppercase tracking-tighter text-lg text-white">
                    {GALLERY[galleryIdx].label}
                  </p>
                  <p className="text-white/50 text-[10px] font-bold mt-0.5">
                    {GALLERY[galleryIdx].desc}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Nav buttons */}
            <button
              onClick={prevSlide}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-2 mt-3">
            {GALLERY.map((_, i) => (
              <button
                key={i}
                onClick={() => setGalleryIdx(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === galleryIdx ? 'w-6 bg-purple-500' : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>
        </motion.div>
      </div>

    </div>
  );
}

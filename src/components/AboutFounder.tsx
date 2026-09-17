import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Quote, Heart, Sparkles, MessageCircle } from 'lucide-react';
import { useSEO } from '../utils/seo';

export default function AboutFounder() {
  useSEO("Our Story", "Learn about Shalya Gaonkar, the founder, and the vision behind Moms Magic Yellapur and Dandeli.");
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-[#050505] text-white pb-20 overflow-hidden">
      {/* Cinematic Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-gold/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 px-6 pt-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <button 
            onClick={() => navigate(-1)} 
            className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-colors backdrop-blur-md"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-full border border-white/10 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-gold" />
            <span className="font-black uppercase tracking-[4px] text-[10px]">The Team</span>
          </div>
          <div className="w-12" /> {/* Spacer */}
        </div>

        {/* Hero Section - Founder */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative z-10 rounded-[40px] overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] aspect-[3/4]">
              <img 
                src="/founder.webp" 
                alt="Shalya Gaonkar" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            </div>
            {/* Decorative Elements */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-brand/20 blur-3xl rounded-full z-0" />
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-gold/20 blur-3xl rounded-full z-0" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">
                Shalya <br />
                <span className="text-luxury-gold drop-shadow-[0_0_20px_rgba(244,180,0,0.3)]">Gaonkar</span>
              </h1>
              <p className="text-brand font-black uppercase tracking-[6px] text-xs">Founder, Moms Magic</p>
            </div>

            <div className="relative">
              <Quote className="absolute -top-6 -left-6 w-12 h-12 text-white/5" />
              <p className="text-white/70 text-lg leading-relaxed font-medium italic relative z-10">
                "I believe food is not just about eating; it’s about comfort, memories, and bringing people together."
              </p>
            </div>

            <div className="flex gap-6">
              <div className="flex flex-col">
                <span className="text-gold font-black text-2xl tracking-tighter">EST.</span>
                <span className="text-white/40 font-black text-xs uppercase tracking-widest">2024</span>
              </div>
              <div className="w-[1px] h-12 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-gold font-black text-2xl tracking-tighter">VISION</span>
                <span className="text-white/40 font-black text-xs uppercase tracking-widest">Happiness</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Brand Vision Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 md:p-12 mb-24 relative overflow-hidden group text-center"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 space-y-6">
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-luxury-gold">Our Vision</h2>
            <p className="text-white/80 text-lg md:text-xl leading-relaxed max-w-3xl mx-auto italic">
              "Moms Magic was started with a simple vision — to serve delicious food with great service and create happiness through every order. We believe food is not just about eating; it’s about comfort, memories, and bringing people together."
            </p>
            <p className="text-white/60 text-lg leading-relaxed max-w-3xl mx-auto pt-4">
              With passion, creativity, and dedication, Moms Magic continuously works to provide quality food, smooth service, and the best experience for every customer.
            </p>
          </div>
        </motion.div>

        {/* Partner Section - JIS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24 md:flex-row-reverse">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="md:order-2"
          >
            <div className="relative z-10 rounded-[40px] overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] aspect-[3/4]">
              <img src="/partner.webp" alt="Partner JIS" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-8 md:order-1"
          >
            <div className="space-y-2">
              <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none text-right md:text-left">
                JIS <br />
                <span className="text-luxury-gold drop-shadow-[0_0_20px_rgba(244,180,0,0.3)]">Partner</span>
              </h1>
              <p className="text-brand font-black uppercase tracking-[6px] text-xs text-right md:text-left">Partner, Moms Magic</p>
            </div>

            <div className="relative text-right md:text-left">
              <Quote className="absolute -top-6 -right-6 md:-left-6 w-12 h-12 text-white/5 rotate-180 md:rotate-0" />
              <p className="text-white/70 text-lg leading-relaxed font-medium italic relative z-10">
                A strong support behind Moms Magic, helping in growing the brand, managing operations, and ensuring customers receive the best service and experience.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Footer Action */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-center space-y-6"
        >
          <p className="text-text-muted font-bold uppercase tracking-[8px] text-[10px]">Connect with us</p>
          <div className="flex justify-center gap-6">
            <a href="#" className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all hover:scale-110">
              <MessageCircle className="w-6 h-6 text-green-500" />
            </a>
            <a href="#" className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all hover:scale-110">
              <span className="font-black text-gold">IG</span>
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Star, MessageSquare, ChevronLeft, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSEO } from '../utils/seo';

export default function FeedbackPage() {
  useSEO("Feedback", "We value your opinion. Share your dining experience and feedback with the team at Moms Magic.");
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating!');
      return;
    }
    const stars = '⭐'.repeat(rating);
    const feedbackMsg = `Hi Moms Magic! I would like to share my feedback:\nRating: ${stars}\nComments: ${feedback}`;
    const waUrl = `https://wa.me/919606001790?text=${encodeURIComponent(feedbackMsg)}`;
    
    toast.success('Thank you! Redirecting to WhatsApp to send feedback... 🚀', {
      icon: '⭐',
      style: { background: '#161A22', color: '#FFD700', border: '1px solid #FF4D00' }
    });
    
    setTimeout(() => {
      window.location.href = waUrl;
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-matte-black text-white pt-6 pb-24 px-4 md:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black uppercase tracking-widest text-gold">Feedback</h1>
          <div className="w-12" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111] border border-white/10 rounded-[40px] p-8 md:p-12 text-center"
        >
          <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand/20">
            <MessageSquare className="w-10 h-10 text-brand" />
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-4">How was your <span className="text-brand">experience?</span></h2>
          <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mb-10">Your feedback helps us serve you better</p>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex justify-center gap-2 md:gap-4">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star 
                    className={`w-10 h-10 md:w-12 md:h-12 transition-colors ${
                      star <= (hoveredRating || rating) 
                      ? 'fill-gold text-gold drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]' 
                      : 'text-white/20'
                    }`} 
                  />
                </button>
              ))}
            </div>

            <div className="text-left space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-4">Tell us more (Optional)</label>
              <textarea 
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="What did you love? What can we improve?"
                className="w-full h-32 bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:border-brand/50 transition-colors font-bold resize-none placeholder:text-white/20"
              />
            </div>

            <button 
              type="submit"
              className="w-full py-5 bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl font-black uppercase tracking-[4px] text-white flex items-center justify-center gap-2 hover:shadow-[0_10px_30px_rgba(255,77,0,0.3)] transition-all active:scale-95"
            >
              Submit Feedback <Send className="w-5 h-5 ml-2" />
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

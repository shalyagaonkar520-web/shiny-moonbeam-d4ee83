import { useState } from 'react';
import { openExternal } from '../lib/openExternal';
import { notifyTelegram } from '../lib/notifyTelegram';
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

    // Feedback goes to the order channel too, so nothing a customer sends
    // depends on someone remembering to check WhatsApp.
    const esc = (v: string) =>
      String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    notifyTelegram(
      [
        '⭐ <b>NEW CUSTOMER FEEDBACK</b>',
        '',
        `⭐ <b>Rating:</b> ${rating}/5`,
        `💬 <b>Comments:</b> ${esc(feedback.trim()) || '(none)'}`,
        '',
        '━━━━━━━━━━━━━━━━',
        '🌟 <b>Moms Magic</b> - Feedback',
      ].join('\n')
    );
    const waUrl = `https://wa.me/919606001790?text=${encodeURIComponent(feedbackMsg)}`;
    
    toast.success('Thank you! Redirecting to WhatsApp to send feedback...', { icon: '⭐' });
    
    setTimeout(() => {
      openExternal(waUrl);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff1f4] via-[#fff8fa] to-white text-gray-900 pt-6 pb-24 px-4 md:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} aria-label="Go back" className="w-12 h-12 bg-white border border-rose-100 rounded-2xl flex items-center justify-center shadow-sm hover:bg-rose-50 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black uppercase tracking-widest text-gray-900">Feedback</h1>
          <div className="w-12" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-rose-100 rounded-[26px] p-8 md:p-12 text-center shadow-sm"
        >
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-100">
            <MessageSquare className="w-10 h-10 text-[#e11d48]" />
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-4">How was your <span className="text-[#e11d48]">experience?</span></h2>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-10">Your feedback helps us serve you better</p>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex justify-center gap-2 md:gap-4">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  aria-label={`${star} star${star > 1 ? 's' : ''}`}
                  aria-pressed={rating === star}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star 
                    className={`w-10 h-10 md:w-12 md:h-12 transition-colors ${
                      star <= (hoveredRating || rating) 
                      ? 'fill-amber-400 text-amber-400' 
                      : 'text-gray-300'
                    }`} 
                  />
                </button>
              ))}
            </div>

            <div className="text-left space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Tell us more (Optional)</label>
              <textarea 
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="What did you love? What can we improve?"
                className="w-full h-32 bg-rose-50/40 border border-rose-100 rounded-3xl p-6 outline-none focus:border-[#e11d48] transition-colors font-bold text-gray-900 resize-none placeholder:text-gray-400"
              />
            </div>

            <button 
              type="submit"
              className="w-full py-5 bg-[#e11d48] rounded-2xl font-black uppercase tracking-[4px] text-white flex items-center justify-center gap-2 shadow-md shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95"
            >
              Submit Feedback <Send className="w-5 h-5 ml-2" />
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

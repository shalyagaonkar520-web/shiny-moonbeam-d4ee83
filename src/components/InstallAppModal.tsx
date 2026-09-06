import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Zap, ShieldCheck, Smartphone, Sparkles, CheckCircle2, Share, PlusSquare } from 'lucide-react';
import { useInstallModalStore } from '../store/installModalStore';
import toast from 'react-hot-toast';

export default function InstallAppModal() {
  const { isOpen, closeModal, deferredPrompt, setDeferredPrompt } = useInstallModalStore();

  if (!isOpen) return null;

  const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  const handleInstallNow = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success("Thank you for installing Mom's Magic! 🎉", {
          icon: '📲',
          style: {
            background: '#ffffff',
            color: '#111827',
            border: '1px solid #10b981',
            borderRadius: '16px',
            fontWeight: 'bold'
          }
        });
        setDeferredPrompt(null);
        closeModal();
      }
    } else {
      if (isiOS) {
        toast('Tap the Share icon (📤) below and select "Add to Home Screen" 📲', {
          duration: 5000,
          icon: '📱',
          style: {
            background: '#ffffff',
            color: '#111827',
            border: '1px solid #f43f5e',
            borderRadius: '16px',
            fontWeight: 'bold'
          }
        });
      } else {
        toast('Tap the browser menu (⋮) and tap "Install App" or "Add to Home Screen" 📲', {
          duration: 5000,
          icon: '📱',
          style: {
            background: '#ffffff',
            color: '#111827',
            border: '1px solid #f43f5e',
            borderRadius: '16px',
            fontWeight: 'bold'
          }
        });
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-white rounded-[32px] sm:rounded-[36px] p-5 sm:p-7 shadow-2xl border border-rose-100 text-left my-auto overflow-hidden"
        >
          {/* Top Rose Glow Accent */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-rose-300/30 to-pink-200/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-rose-200/30 to-pink-100/20 rounded-full blur-3xl pointer-events-none" />

          {/* Header with Cancel / Close X Button */}
          <div className="flex items-start justify-between gap-3 mb-5 relative z-10">
            <div className="flex items-center gap-3">
              {/* App Icon */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#ff4d6d] via-[#f43f5e] to-[#e11d48] flex items-center justify-center shadow-lg shadow-rose-500/30 p-2.5 text-white shrink-0">
                <Smartphone className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div>
                <span className="inline-block bg-rose-100 text-[#e11d48] text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mb-0.5">
                  Official Web App
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                  Install Mom's Magic
                </h2>
                <p className="text-xs font-semibold text-gray-500">
                  Instant 10-Minute Food & Cake Delivery
                </p>
              </div>
            </div>

            {/* Cancel X Button */}
            <button
              onClick={closeModal}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors cursor-pointer shrink-0"
              title="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5 relative z-10">
            <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100 flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-[#e11d48] shrink-0 mt-0.5 stroke-[2.5]" />
              <div>
                <p className="text-xs font-bold text-gray-900">10-Minute Delivery</p>
                <p className="text-[10px] text-gray-500 font-medium">Faster than website browsing</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#e11d48] shrink-0 mt-0.5 stroke-[2.5]" />
              <div>
                <p className="text-xs font-bold text-gray-900">Zero Extra Fees</p>
                <p className="text-[10px] text-gray-500 font-medium">No tax, GST or platform fees</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#e11d48] shrink-0 mt-0.5 stroke-[2.5]" />
              <div>
                <p className="text-xs font-bold text-gray-900">1-Tap Home Screen</p>
                <p className="text-[10px] text-gray-500 font-medium">Opens instantly like Play Store</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#e11d48] shrink-0 mt-0.5 stroke-[2.5]" />
              <div>
                <p className="text-xs font-bold text-gray-900">Order Tracking</p>
                <p className="text-[10px] text-gray-500 font-medium">Instant live WhatsApp alerts</p>
              </div>
            </div>
          </div>

          {/* Step by step guide if manual browser install needed */}
          {isiOS ? (
            <div className="mb-5 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs space-y-2 relative z-10">
              <p className="font-bold flex items-center gap-1.5 text-amber-800">
                <Share className="w-3.5 h-3.5" /> How to install on iPhone / iPad:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] font-medium text-amber-900/90 pl-1">
                <li>Tap the <strong>Share</strong> button (📤) at bottom of Safari.</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong> (➕).</li>
                <li>Tap <strong>"Add"</strong> in top right corner. That's it!</li>
              </ol>
            </div>
          ) : !deferredPrompt ? (
            <div className="mb-5 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs space-y-2 relative z-10">
              <p className="font-bold flex items-center gap-1.5 text-amber-800">
                <PlusSquare className="w-3.5 h-3.5" /> How to install on Android / Chrome:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] font-medium text-amber-900/90 pl-1">
                <li>Tap the <strong>three dots (⋮)</strong> at top right of Chrome.</li>
                <li>Tap <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>.</li>
                <li>Confirm by tapping <strong>"Install"</strong>!</li>
              </ol>
            </div>
          ) : null}

          {/* Action Buttons: INSTALL NOW + CANCEL BUTTON */}
          <div className="space-y-2.5 relative z-10">
            {/* Primary Install Button */}
            <button
              onClick={handleInstallNow}
              className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-gradient-to-r from-[#ff4d6d] via-[#f43f5e] to-[#e11d48] text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 active:scale-98 hover:opacity-95 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 stroke-[3]" />
              <span>Install App Now</span>
            </button>

            {/* Clear, Prominent CANCEL BUTTON */}
            <button
              onClick={closeModal}
              className="w-full py-3 sm:py-3.5 px-6 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}

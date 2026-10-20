import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Phone, Eye, EyeOff, Sparkles, LogIn, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

function getFriendlyErrorMessage(err: any): string {
  const code = err?.code || '';
  const msg = err?.message || '';

  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Incorrect email or password. Please try again or sign in with Google.';
  }
  if (code.includes('email-already-in-use')) {
    return 'An account already exists with this email. Please switch to Sign In above!';
  }
  if (code.includes('weak-password')) {
    return 'Password must be at least 6 characters long.';
  }
  if (code.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (code.includes('popup-closed-by-user')) {
    return 'Google Sign-In was cancelled.';
  }
  if (code.includes('unauthorized-domain')) {
    return 'Google Sign-In is unavailable on this domain. Please sign in with your email below.';
  }
  if (code.includes('network-request-failed')) {
    return 'Network connection issue. Please check your internet connection.';
  }
  if (code.includes('too-many-requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return msg || 'Authentication failed. Please check your credentials.';
}

export default function AuthModal({ isOpen, onClose, defaultMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const { loginWithGoogle, loginWithEmail, signUpWithEmail, resetPassword } = useAuthStore();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isForgotPassword) {
      if (!email.trim()) {
        toast.error('Please enter your registered email address.');
        return;
      }
      setSubmitLoading(true);
      try {
        await resetPassword(email.trim());
        toast.success(`Password reset link sent to ${email.trim()}! Please check your inbox. 📧`);
        setIsForgotPassword(false);
      } catch (err: any) {
        toast.error(getFriendlyErrorMessage(err));
      } finally {
        setSubmitLoading(false);
      }
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        toast.error('Please enter your full name.');
        return;
      }
      if (!email.trim()) {
        toast.error('Please enter your email address.');
        return;
      }
      if (password.length < 6) {
        toast.error('Password must be at least 6 characters long.');
        return;
      }

      setSubmitLoading(true);
      try {
        await signUpWithEmail(email.trim(), password.trim(), name.trim(), phone.trim());
        toast.success(`Welcome to Mintoo, ${name.trim()}! 🍲`);
        onClose();
      } catch (err: any) {
        toast.error(getFriendlyErrorMessage(err));
      } finally {
        setSubmitLoading(false);
      }
    } else {
      // Sign in mode
      if (!email.trim() || !password.trim()) {
        toast.error('Please enter your email and password.');
        return;
      }

      setSubmitLoading(true);
      try {
        await loginWithEmail(email.trim(), password.trim());
        toast.success('Welcome back to Mom\'s Magic! 🍳');
        onClose();
      } catch (err: any) {
        toast.error(getFriendlyErrorMessage(err));
      } finally {
        setSubmitLoading(false);
      }
    }
  };


  const handleGoogleAuth = async () => {
    setSubmitLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Signed in successfully with Google! 🚀');
      onClose();
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err));
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="bg-white border border-rose-100 rounded-[28px] sm:rounded-[32px] w-full max-w-md shadow-[0_20px_50px_rgba(225,29,72,0.18)] relative overflow-hidden my-auto text-left"
        >
          {/* Top Brand Gradient Stripe */}
          <div className="h-1.5 bg-gradient-to-r from-[#ff4d6d] via-[#e11d48] to-[#ff758f]" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-all cursor-pointer z-10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-5 sm:p-7 space-y-4">
            
            {/* Header branding */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-lg bg-rose-100 text-[#e11d48] flex items-center justify-center text-xs font-black">
                  🍲
                </span>
                <span className="text-[11px] font-black uppercase tracking-widest text-[#e11d48]">
                  Mintoo Yellapur
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                {isForgotPassword
                  ? 'Reset Password'
                  : mode === 'signup'
                  ? 'Create Your Account'
                  : 'Welcome Back!'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isForgotPassword
                  ? 'Enter your registered email to receive a password reset link'
                  : mode === 'signup'
                  ? 'Sign up to track your orders & save delivery addresses'
                  : 'Sign in to access your orders & saved delivery addresses'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            {!isForgotPassword && (
              <div className="grid grid-cols-2 gap-1 bg-gray-100/80 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className={`py-2 text-center text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    mode === 'signin'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`py-2 text-center text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Form: Email Sign In / Sign Up / Forgot Password */}
            {(
              <form onSubmit={handleEmailAuth} className="space-y-3 pt-1">
                {mode === 'signup' && !isForgotPassword && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 sm:py-3 pl-10 pr-3.5 text-xs font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      placeholder="name@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 sm:py-3 pl-10 pr-3.5 text-xs font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                    />
                  </div>
                </div>

                {mode === 'signup' && !isForgotPassword && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Phone Number (Optional)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        placeholder="WhatsApp / Phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 sm:py-3 pl-10 pr-3.5 text-xs font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                      />
                    </div>
                  </div>
                )}

                {!isForgotPassword && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        Password
                      </label>
                      {mode === 'signin' && (
                        <button
                          type="button"
                          onClick={() => setIsForgotPassword(true)}
                          className="text-[11px] font-bold text-[#e11d48] hover:underline cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder={mode === 'signup' ? 'Min. 6 characters' : 'Enter password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 sm:py-3 pl-10 pr-10 text-xs font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full bg-gradient-to-r from-[#ff4d6d] to-[#e11d48] hover:brightness-105 active:scale-98 text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-md shadow-rose-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
                >
                  {submitLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : isForgotPassword ? (
                    <>
                      <span>Send Reset Link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : mode === 'signup' ? (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Sign In to Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {isForgotPassword && (
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="w-full text-center text-xs font-bold text-gray-500 hover:text-gray-800 py-1 cursor-pointer"
                  >
                    ← Back to Sign In
                  </button>
                )}
              </form>
            )}

            {/* Separator & Google Sign-In */}
            {!isForgotPassword && (
              <>
                <div className="flex items-center gap-3 py-1">
                  <div className="h-px bg-gray-200 flex-1" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    OR
                  </span>
                  <div className="h-px bg-gray-200 flex-1" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={submitLoading}
                  className="w-full bg-white hover:bg-gray-50 border border-gray-200 active:scale-98 text-gray-800 font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs disabled:opacity-60"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </>
            )}

            {/* Bottom Perks Footnote */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500 font-semibold">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> 100% Safe & Secure
              </span>
              <span>⚡ 10 Min Fast Delivery</span>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

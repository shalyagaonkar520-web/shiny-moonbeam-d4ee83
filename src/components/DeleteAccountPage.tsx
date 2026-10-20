import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Trash2, Loader2, ShieldAlert, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSEO } from '../utils/seo';
import { useAuthStore } from '../store/authStore';
import { useSystemStore } from '../store/systemStore';
import { openExternal } from '../lib/openExternal';

function friendlyDeleteError(err: any): string {
  const code = String(err?.code || '');
  if (code.includes('wrong-password') || code.includes('invalid-credential')) return 'That password is incorrect.';
  if (code.includes('missing-password')) return 'Enter your password to confirm deletion.';
  if (code.includes('popup-closed-by-user') || code.includes('cancelled')) return 'Deletion cancelled. Your account was not deleted.';
  if (code.includes('user-mismatch')) return 'Please choose the same Google account you are signed in with.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Please wait a few minutes and try again.';
  if (code.includes('network-request-failed')) return 'No internet connection. Your account was not deleted.';
  return err?.message || 'Could not delete your account. Please try again.';
}

/**
 * Account deletion, reachable in the app (Profile -> Delete account) and on the
 * web at /delete-account, which is the URL to give Google Play's
 * "Delete account URL" field.
 */
export default function DeleteAccountPage() {
  useSEO("Delete Account - Mintoo", "Delete your Mintoo account and personal data.");
  const navigate = useNavigate();
  const { user, profile, deleteAccount } = useAuthStore();
  const supportNumber = useSystemStore((s) => s.settings?.whatsappNumber) || '+919606001790';

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const hasCloudAccount = !!user;
  const hasLocalProfile = !user && !!profile;
  const needsPassword = !!user?.providerData.some((p) => p.providerId === 'password');
  const canConfirm = confirmText.trim().toUpperCase() === 'DELETE' && (!needsPassword || password.length > 0);

  const handleDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(needsPassword ? password : undefined);
      setConfirmOpen(false);
      setDone(true);
      toast.success('Your account has been deleted.');
    } catch (err) {
      setError(friendlyDeleteError(err));
    } finally {
      setBusy(false);
    }
  };

  const requestByWhatsApp = () => {
    const digits = supportNumber.replace(/\D/g, '');
    const text = "Hi Mintoo, please delete my account and personal data. My registered phone number / email is: ";
    openExternal(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff1f4]/70 via-[#fff8fa]/60 to-white text-gray-900 pb-32 pt-6 px-4">
      <div className="max-w-md mx-auto space-y-5 text-left">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-9 h-9 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center text-gray-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-black text-gray-900">Delete Account</h1>
        </div>

        {done ? (
          <div className="bg-white rounded-[26px] p-6 border border-rose-100 shadow-sm text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-base font-black">Your account has been deleted</h2>
            <p className="text-xs text-gray-500 font-medium">
              Your profile and sign-in were removed and this device's saved data was cleared. You can still order as a guest any time.
            </p>
            <button onClick={() => navigate('/')} className="mt-2 px-6 py-3 rounded-2xl bg-[#e11d48] text-white font-black text-sm">
              Back to home
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-[26px] p-4 sm:p-5 border border-rose-100/90 shadow-sm space-y-4 text-sm">
              <section className="space-y-1.5">
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">What gets deleted</h2>
                <ul className="list-disc pl-5 space-y-1 text-gray-700 font-medium text-xs leading-relaxed">
                  <li>Your sign-in (Google or email) and your Mintoo profile</li>
                  <li>Your name, phone number, email and saved addresses</li>
                  <li>Your wallet balance and reward points. These cannot be refunded or restored after deletion</li>
                  <li>Order history, saved location and details stored on this device</li>
                </ul>
              </section>
              <section className="space-y-1.5">
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">What we keep</h2>
                <p className="text-gray-700 font-medium text-xs leading-relaxed">
                  Records of orders you placed and wallet transactions are kept only as long as we need them for
                  accounting, tax, refunds and dispute handling, and are then deleted. They are not used for marketing.
                </p>
              </section>
            </div>

            {hasCloudAccount || hasLocalProfile ? (
              <div className="bg-white rounded-[26px] p-4 sm:p-5 border border-rose-100/90 shadow-sm space-y-3">
                <p className="text-xs font-semibold text-gray-600">
                  Signed in as <span className="font-black text-gray-900">{user?.email || profile?.phone || profile?.name}</span>
                </p>
                <button
                  onClick={() => { setConfirmOpen(true); setError(null); }}
                  className="w-full py-3.5 rounded-2xl border border-red-200 bg-red-50 text-red-700 font-black text-sm flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> {hasCloudAccount ? 'Delete my account' : 'Delete my data on this device'}
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-[26px] p-4 sm:p-5 border border-rose-100/90 shadow-sm space-y-3">
                <p className="text-xs font-semibold text-gray-600 leading-relaxed">
                  Sign in with the account you want to delete, then come back to this page. If you can no longer sign in,
                  send us a request from your registered phone number and we will delete it for you.
                </p>
                <button onClick={() => navigate('/login')} className="w-full py-3.5 rounded-2xl bg-[#e11d48] text-white font-black text-sm">
                  Sign in to delete
                </button>
                <button onClick={requestByWhatsApp} className="w-full py-3 rounded-2xl border border-rose-200 text-gray-900 font-black text-sm">
                  Request deletion on WhatsApp
                </button>
              </div>
            )}

            <p className="text-[11px] text-gray-400 font-medium text-center">
              Read our <Link to="/privacy" className="underline">privacy policy</Link> for how we handle your data.
            </p>
          </>
        )}
      </div>

      {/* Portalled so the bottom nav bar cannot cover the confirm button. */}
      {confirmOpen && createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/40 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title">
          <div className="w-full max-w-md bg-white rounded-[26px] p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <h2 id="delete-confirm-title" className="text-base font-black">Delete account permanently?</h2>
              </div>
              <button onClick={() => setConfirmOpen(false)} aria-label="Close" className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-600 font-medium leading-relaxed">
              This cannot be undone. Your wallet balance and reward points will be lost.
              {hasCloudAccount && !needsPassword && ' You will be asked to choose your Google account to confirm.'}
            </p>
            {needsPassword && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm font-semibold outline-none focus:border-red-400"
              />
            )}
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              autoCapitalize="characters"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm font-semibold outline-none focus:border-red-400"
            />
            {error && <p role="alert" className="text-xs font-semibold text-red-600">{error}</p>}
            <button
              onClick={handleDelete}
              disabled={!canConfirm || busy}
              className="w-full py-3.5 rounded-2xl bg-red-600 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete permanently
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

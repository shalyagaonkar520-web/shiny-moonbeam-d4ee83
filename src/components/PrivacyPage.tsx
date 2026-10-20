import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useSEO } from '../utils/seo';
import { useSystemStore } from '../store/systemStore';

const LAST_UPDATED = '26 September 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h2 className="text-sm font-black text-gray-900">{title}</h2>
      <div className="text-xs text-gray-700 font-medium leading-relaxed space-y-1.5">{children}</div>
    </section>
  );
}

/**
 * Privacy policy. Every statement here describes what the app actually does
 * today; when a feature starts collecting or sharing something new, update the
 * matching section and LAST_UPDATED. This page's URL (/privacy) is the one to
 * give Google Play.
 */
export default function PrivacyPage() {
  useSEO("Privacy Policy - Mintoo", "How Mintoo collects, uses and protects your data.");
  const navigate = useNavigate();
  const supportNumber = useSystemStore((s) => s.settings?.whatsappNumber) || '+919606001790';

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
          <div>
            <h1 className="text-xl font-black text-gray-900">Privacy Policy</h1>
            <p className="text-[10px] font-bold text-gray-400">Last updated {LAST_UPDATED}</p>
          </div>
        </div>

        <div className="bg-white rounded-[26px] p-4 sm:p-5 border border-rose-100/90 shadow-sm space-y-5">
          <Section title="Who we are">
            <p>
              Mintoo is a food ordering and delivery service in Yellapur, Karnataka, available at momsmagic.shop
              and as an Android app. This policy explains what we collect when you use either, and why.
            </p>
          </Section>

          <Section title="What we collect">
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Contact details</b>: your name and phone number when you order, and your email if you sign in with Google or email.</li>
              <li><b>Delivery location</b>: the address you choose and its map coordinates, from your phone's GPS (only if you allow it) or from the point you pick on the map.</li>
              <li><b>Orders</b>: what you ordered, amounts, payment method, delivery instructions and order status.</li>
              <li><b>Payments</b>: online payments are handled by Razorpay. We receive a payment ID and whether it succeeded; we never see or store your card, UPI or bank details.</li>
              <li><b>Account data</b>: saved addresses, wallet balance, reward points and coupons.</li>
              <li><b>Device data</b>: a notification token so we can send order updates, your browser or device type when you install the app, and basic app usage statistics collected by Firebase in the Android app.</li>
              <li><b>Feedback</b> you choose to send us.</li>
            </ul>
          </Section>

          <Section title="How we use location">
            <p>
              We use your location to check that you are inside our delivery area, to calculate the delivery charge and
              to guide the rider to you. We ask for it only while you are using the app, and never track you in the
              background. You can always choose your location on the map instead of sharing GPS.
            </p>
          </Section>

          <Section title="Who we share it with">
            <p>Only what is needed to prepare and deliver your order:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The partner restaurant preparing your food, and the delivery rider (name, phone, address, order).</li>
              <li>Service providers that run the app for us: Google Firebase (sign-in, database, notifications), Razorpay (payments), Vercel (website hosting), WhatsApp and Telegram (order messages to our team), and OpenStreetMap services (turning map coordinates into an address, and drawing the delivery route on the tracking map).</li>
            </ul>
            <p>We do not sell your data or share it for advertising.</p>
          </Section>

          <Section title="Order tracking links">
            <p>
              Each order has a private tracking link. Anyone who has the link can see that order's progress and delivery
              address, so share it only with people you trust.
            </p>
          </Section>

          <Section title="How long we keep it, and deleting it">
            <p>
              We keep your account data until you delete your account. Order and payment records are kept as long as we
              need them for accounting, tax, refunds and disputes, then deleted.
            </p>
            <p>
              You can delete your account at any time from <b>Account → Delete account</b> in the app, or at{' '}
              <Link to="/delete-account" className="underline font-bold">momsmagic.shop/delete-account</Link>.
            </p>
          </Section>

          <Section title="Security">
            <p>
              Data is sent over encrypted connections (HTTPS) and stored in Google Firebase, where access is restricted
              by security rules. No system is perfectly secure, but we work to protect your information.
            </p>
          </Section>

          <Section title="Children">
            <p>Mintoo is not directed at children under 13, and we do not knowingly collect their data.</p>
          </Section>

          <Section title="Changes and contact">
            <p>
              If this policy changes, we will update the date at the top of this page. For any privacy question or
              request, message us on WhatsApp at <b>{supportNumber}</b>.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

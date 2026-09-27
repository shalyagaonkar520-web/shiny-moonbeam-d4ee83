import { useState } from 'react';
import { Star, Loader2, Check } from 'lucide-react';

const GOOD_TAGS = ['Tasty food', 'Good portion', 'Well packed', 'On time', 'Polite rider'];
const BAD_TAGS = ['Late delivery', 'Cold food', 'Wrong item', 'Poor packing', 'Less quantity'];
const STAR_WORDS = ['', 'Terrible', 'Bad', 'Okay', 'Good', 'Loved it!'];

const ratedKey = (orderId: string) => `moms_magic_rated_${orderId}`;

export function hasRatedLocally(orderId: string): boolean {
  try {
    return localStorage.getItem(ratedKey(orderId)) === '1';
  } catch {
    return false;
  }
}

interface Props {
  orderId: string;
  /** Server says this order already has a rating. */
  alreadyRated?: boolean;
  dark?: boolean;
}

/** Post-delivery rating: stars, quick tags and an optional comment. */
export default function RateOrderCard({ orderId, alreadyRated, dark }: Props) {
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(alreadyRated || hasRatedLocally(orderId));

  const card = dark
    ? 'bg-white/5 border border-white/10 text-white'
    : 'bg-white border border-rose-100/90 text-gray-900 shadow-sm';
  const muted = dark ? 'text-white/50' : 'text-gray-500';

  if (done) {
    return (
      <div className={`rounded-2xl p-4 flex items-center gap-2.5 ${card}`}>
        <Check className="w-4 h-4 text-emerald-500" />
        <p className="text-xs font-bold">Thanks for rating this order!</p>
      </div>
    );
  }

  const toggleTag = (t: string) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  const tagOptions = stars === 0 ? [] : stars >= 4 ? GOOD_TAGS : BAD_TAGS;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/rate-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, stars, tags, comment }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok || body?.error === 'already_rated') {
        try { localStorage.setItem(ratedKey(orderId), '1'); } catch { /* ignore */ }
        setDone(true);
      } else if (body?.error === 'not_delivered_yet') {
        setError('You can rate this order once it has been delivered.');
      } else {
        setError('Could not send your rating. Please try again.');
      }
    } catch {
      setError('No internet connection. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-2xl p-4 space-y-3 text-left ${card}`}>
      <div>
        <p className="text-sm font-black">How was your order?</p>
        <p className={`text-[11px] font-medium ${muted}`}>Your rating helps the kitchen and riders improve.</p>
      </div>

      <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={() => { setStars(n); setTags([]); }}
            className="p-0.5"
          >
            <Star className={`w-8 h-8 ${n <= stars ? 'fill-amber-400 text-amber-400' : dark ? 'text-white/25' : 'text-gray-300'}`} />
          </button>
        ))}
        {stars > 0 && <span className="ml-2 text-xs font-black">{STAR_WORDS[stars]}</span>}
      </div>

      {tagOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tagOptions.map((t) => (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              aria-pressed={tags.includes(t)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                tags.includes(t)
                  ? 'bg-[#e11d48] border-[#e11d48] text-white'
                  : dark ? 'border-white/15 text-white/70' : 'border-gray-200 text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {stars > 0 && (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder="Tell us more (optional)"
            rows={2}
            className={`w-full rounded-xl px-3 py-2.5 text-xs font-medium outline-none resize-none ${
              dark ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/30' : 'bg-gray-50 border border-gray-200'
            }`}
          />
          {error && <p role="alert" className="text-xs font-semibold text-[#e11d48]">{error}</p>}
          <button
            onClick={submit}
            disabled={busy}
            className="w-full py-3 rounded-xl bg-[#e11d48] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Submit rating
          </button>
        </>
      )}
    </div>
  );
}

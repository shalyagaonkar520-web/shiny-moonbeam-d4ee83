import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import {
  Eye, EyeOff, ImagePlus, Loader2, LogOut, Plus, Search, Shirt, Store, X,
} from 'lucide-react';
import { auth, db, firebaseReady } from '../firebase';
import { useSEO } from '../utils/seo';
import {
  CATEGORY_PRICE, CATEGORY_SIZES, LETTER_SIZES, MENSWEAR_CATEGORIES, MENSWEAR_SHOP_ID, MENSWEAR_SHOP_NAME,
  MenswearCategory, MenswearProduct, WAIST_SIZES,
} from '../data/mensWear';
import { useMenswearCatalog } from '../store/menswearStore';
import {
  addProduct, checkMenswearAdmin, friendlyError, setProductHidden, setProductPrice, setShopAcceptingOrders,
  setSizeSoldOut, uniqueSlug, uploadProductPhoto,
} from '../lib/menswearAdmin';

type Gate = { state: 'loading' } | { state: 'out' } | { state: 'denied'; reason: string } | { state: 'in'; user: User };

/**
 * /admin/menswear: the Mintoo Men's Wear shop's own admin page.
 *
 * Signs in with the email and password the panel gave the shop's HOTEL_ADMIN
 * account (Restaurants > Add restaurant). The password only ever goes to
 * Firebase Authentication. From here the shop can mark sizes sold out, hide
 * items, change prices, add new items with photos, and open or close itself.
 */
export default function MenswearAdminPage() {
  useSEO(`${MENSWEAR_SHOP_NAME} admin`, "Manage Mintoo Men's Wear stock.");
  const [gate, setGate] = useState<Gate>({ state: 'loading' });

  useEffect(() => {
    if (!firebaseReady) {
      setGate({ state: 'denied', reason: 'Firebase is not available.' });
      return;
    }
    return onAuthStateChanged(auth, async (user) => {
      if (!user || user.isAnonymous) return setGate({ state: 'out' });
      setGate({ state: 'loading' });
      try {
        const access = await checkMenswearAdmin(user.uid);
        setGate(access.ok ? { state: 'in', user } : { state: 'denied', reason: access.reason || 'Not allowed.' });
      } catch (err) {
        setGate({ state: 'denied', reason: friendlyError(err) });
      }
    });
  }, []);

  if (gate.state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f6f7]">
        <Loader2 className="w-8 h-8 text-[#e11d48] animate-spin" />
      </div>
    );
  }
  if (gate.state === 'out') return <AdminLogin />;
  if (gate.state === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f6f7] p-6">
        <div className="max-w-sm w-full bg-white rounded-3xl border border-gray-100 p-6 text-center space-y-3">
          <p className="text-base font-black text-gray-900">No access</p>
          <p className="text-sm text-gray-600">{gate.reason}</p>
          <button onClick={() => signOut(auth)} className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold text-sm cursor-pointer">
            Sign in with another account
          </button>
        </div>
      </div>
    );
  }
  return <AdminPanel user={gate.user} />;
}

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      const code = String(err?.code || '');
      setError(
        code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')
          ? 'Wrong email or password.'
          : code.includes('too-many-requests')
            ? 'Too many tries. Wait a few minutes and try again.'
            : friendlyError(err)
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-indigo-950 p-5">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-900 text-white flex items-center justify-center">
            <Shirt className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-gray-900 mt-3">{MENSWEAR_SHOP_NAME}</h1>
          <p className="text-xs text-gray-500">Shop admin sign in</p>
        </div>
        <label className="block">
          <span className="text-xs font-bold text-gray-700">Email</span>
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full px-3.5 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900" />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-gray-700">Password</span>
          <div className="relative mt-1">
            <input type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-3 pr-11 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 cursor-pointer" aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
            </button>
          </div>
        </label>
        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
        <button disabled={busy} className="w-full py-3.5 rounded-xl bg-[#e11d48] text-white font-black text-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Sign in
        </button>
      </form>
    </div>
  );
}

function AdminPanel({ user }: { user: User }) {
  const navigate = useNavigate();
  const { products, isSoldOut, loaded, error } = useMenswearCatalog(true);
  const [hotel, setHotel] = useState<any | null | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<MenswearCategory | 'All'>('All');
  const [adding, setAdding] = useState(false);

  useEffect(
    () => onSnapshot(doc(db, 'hotels', MENSWEAR_SHOP_ID), (s) => setHotel(s.exists() ? s.data() : null), () => setHotel(null)),
    []
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => (category === 'All' || p.category === category) && (!q || p.name.toLowerCase().includes(q)));
  }, [products, query, category]);

  const soldOutCount = products.reduce((n, p) => n + p.sizes.filter((s) => isSoldOut(p, s)).length, 0);
  const perms = hotel?.permissions || {};

  const toggleShop = async () => {
    try {
      await setShopAcceptingOrders(!hotel?.acceptingOrders);
      toast.success(hotel?.acceptingOrders ? 'Shop closed to orders' : 'Shop is taking orders');
    } catch (err) {
      toast.error(friendlyError(err));
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f6f7] pb-16">
      <header className="sticky top-0 z-40 bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto px-3 md:px-6 py-3 flex items-center gap-2">
          <Shirt className="w-6 h-6 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black truncate">{MENSWEAR_SHOP_NAME} admin</p>
            <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
          </div>
          <button onClick={() => navigate('/menswear')} className="px-3 py-2 rounded-xl bg-white/10 text-xs font-bold cursor-pointer hover:bg-white/20">
            View shop
          </button>
          <button onClick={() => signOut(auth)} className="p-2 rounded-xl bg-white/10 cursor-pointer hover:bg-white/20" aria-label="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 md:px-6 pt-4 space-y-3">
        {hotel === null && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            The shop record "{MENSWEAR_SHOP_ID}" is missing in the panel, so customers cannot order yet. Create the restaurant
            "Mintoo Men's Wear" in the panel (city Yellapur).
          </div>
        )}
        {hotel && (!perms.menuEdit || !perms.priceEdit) && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            Some changes will be refused until the owner switches on {[!perms.menuEdit && '"Edit dishes"', !perms.priceEdit && '"Change prices"'].filter(Boolean).join(' and ')} for
            this shop in the panel (Restaurants &gt; Mintoo Men's Wear).
          </div>
        )}
        {error && <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">{error}</div>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="bg-white rounded-2xl border border-gray-100 p-3 col-span-2 flex items-center gap-3">
            <Store className={`w-6 h-6 shrink-0 ${hotel?.acceptingOrders ? 'text-emerald-600' : 'text-gray-400'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-gray-900">{hotel?.acceptingOrders ? 'Taking orders' : 'Closed to orders'}</p>
              <p className="text-[11px] text-gray-500">Customers can order only while open</p>
            </div>
            <button
              onClick={toggleShop}
              disabled={!hotel}
              className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer disabled:opacity-40 ${hotel?.acceptingOrders ? 'bg-emerald-500' : 'bg-gray-300'}`}
              aria-label="Open or close the shop"
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${hotel?.acceptingOrders ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-3">
            <p className="text-2xl font-black text-gray-900">{products.filter((p) => !p.hidden).length}</p>
            <p className="text-[11px] text-gray-500">items in the shop</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-3">
            <p className="text-2xl font-black text-rose-600">{soldOutCount}</p>
            <p className="text-[11px] text-gray-500">sizes sold out</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search items"
              className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-3 py-3 text-sm outline-none focus:border-gray-900" />
          </div>
          <button onClick={() => setAdding(true)} className="flex items-center justify-center gap-1.5 px-5 py-3 rounded-2xl bg-[#e11d48] text-white font-black text-sm cursor-pointer active:scale-95 transition-transform">
            <Plus className="w-4 h-4" strokeWidth={3} /> Add new item
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-3 px-3">
          {(['All', ...MENSWEAR_CATEGORIES] as const).map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold border cursor-pointer ${category === c ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200'}`}>
              {c}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-gray-500">
          Tap a size to mark it sold out (red) or back in stock. {loaded ? '' : 'Loading live stock...'}
        </p>

        <div className="grid md:grid-cols-2 gap-2.5">
          {shown.map((p) => <ProductRow key={p.slug} product={p} isSoldOut={isSoldOut} />)}
        </div>
      </main>

      {adding && <AddProduct taken={products.map((p) => p.slug)} onClose={() => setAdding(false)} />}
    </div>
  );
}

function ProductRow({ product, isSoldOut }: { product: MenswearProduct; isSoldOut: (p: MenswearProduct, s: string) => boolean }) {
  const [price, setPrice] = useState(String(product.price));
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => setPrice(String(product.price)), [product.price]);

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(null);
    }
  };

  const priceNum = Number(price);
  const priceChanged = price !== String(product.price);
  const priceValid = Number.isInteger(priceNum) && priceNum > 0 && priceNum <= 100000;

  return (
    <div className={`bg-white rounded-2xl border p-3 flex gap-3 ${product.hidden ? 'border-dashed border-gray-300 opacity-70' : 'border-gray-100'}`}>
      <img src={product.images[0]} alt="" className="w-16 h-20 md:w-20 md:h-24 rounded-xl object-cover bg-gray-100 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-gray-900 leading-snug">{product.name}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase">
              {product.category}{product.added ? ' · added by you' : ''}{product.hidden ? ' · hidden' : ''}
            </p>
          </div>
          <button
            disabled={busy === 'hide'}
            onClick={() => run('hide', () => setProductHidden(product, !product.hidden), product.hidden ? 'Back in the shop' : 'Hidden from the shop')}
            className="shrink-0 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-700 cursor-pointer hover:bg-gray-50"
          >
            {product.hidden ? 'Show' : 'Hide'}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-sm font-black text-gray-900">₹</span>
          <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric"
            className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 text-sm font-bold outline-none focus:border-gray-900" aria-label="Price" />
          {priceChanged && (
            <button
              disabled={!priceValid || busy === 'price'}
              onClick={() => run('price', () => setProductPrice(product, priceNum), `Price set to ₹${priceNum}`)}
              className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold cursor-pointer disabled:opacity-40"
            >
              Save
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {product.sizes.map((s) => {
            const out = isSoldOut(product, s);
            return (
              <button
                key={s}
                disabled={busy === s}
                onClick={() => run(s, () => setSizeSoldOut(product, s, !out), out ? `${s} back in stock` : `${s} marked sold out`)}
                className={`min-w-[42px] h-9 px-2 rounded-lg border text-xs font-black cursor-pointer disabled:opacity-50 ${
                  out ? 'bg-rose-600 border-rose-600 text-white line-through' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                }`}
                aria-label={`Size ${s}: ${out ? 'sold out' : 'in stock'}`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const SIZE_SETS: Record<string, readonly string[]> = {
  'Letter (S-XXL)': LETTER_SIZES,
  'Waist (28-36)': WAIST_SIZES,
  'Free size': ['Free'],
};

function AddProduct({ taken, onClose }: { taken: string[]; onClose: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MenswearCategory>('Casual Shirts');
  const [price, setPrice] = useState(String(CATEGORY_PRICE['Casual Shirts']));
  const [sizes, setSizes] = useState<string[]>([...CATEGORY_SIZES['Casual Shirts']]);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const pickCategory = (c: MenswearCategory) => {
    setCategory(c);
    setPrice(String(CATEGORY_PRICE[c]));
    setSizes([...CATEGORY_SIZES[c]]);
  };
  const allSizes = Array.from(new Set([...LETTER_SIZES, ...WAIST_SIZES, 'Free']));
  const toggleSize = (s: string) =>
    setSizes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : allSizes.filter((x) => x === s || cur.includes(x))));

  const priceNum = Number(price);
  const problem =
    (!name.trim() && 'Give the item a name.') ||
    (name.trim().length > 80 && 'Keep the name under 80 letters.') ||
    ((!Number.isInteger(priceNum) || priceNum < 1) && 'Enter a price.') ||
    (!sizes.length && 'Pick at least one size.') ||
    (!files.length && 'Add at least one photo.') ||
    null;

  const save = async () => {
    if (problem) return toast.error(problem);
    setBusy(true);
    try {
      const slug = uniqueSlug(name.trim(), taken);
      const photos: string[] = [];
      for (let i = 0; i < files.length; i += 1) photos.push(await uploadProductPhoto(slug, files[i], i));
      await addProduct(slug, { name: name.trim(), category, price: priceNum, sizes, photos });
      toast.success(`${name.trim()} added to the shop`);
      onClose();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label="Add new item">
      <button className="absolute inset-0 bg-black/50 cursor-default" onClick={() => !busy && onClose()} aria-label="Close" />
      <div className="relative w-full md:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl md:rounded-3xl p-5 space-y-4">
        <div className="flex items-center">
          <p className="flex-1 text-lg font-black text-gray-900">Add new item</p>
          <button onClick={() => !busy && onClose()} className="p-1.5 rounded-full hover:bg-gray-100 cursor-pointer" aria-label="Close">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-700 mb-1.5">Photos (first one is the cover)</p>
          <div className="flex gap-2 flex-wrap">
            {previews.map((u, i) => (
              <div key={u} className="relative">
                <img src={u} alt="" className="w-20 h-24 rounded-xl object-cover" />
                <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center cursor-pointer" aria-label="Remove photo">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {files.length < 6 && (
              <label className="w-20 h-24 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-gray-500">
                <ImagePlus className="w-6 h-6" />
                <span className="text-[10px] font-bold mt-1">Add</span>
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => { setFiles([...files, ...Array.from(e.target.files || [])].slice(0, 6)); e.target.value = ''; }} />
              </label>
            )}
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-gray-700">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Blue Denim Shirt"
            className="mt-1 w-full px-3.5 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-gray-700">Category</span>
            <select value={category} onChange={(e) => pickCategory(e.target.value as MenswearCategory)}
              className="mt-1 w-full px-3 py-3 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-gray-900">
              {MENSWEAR_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-gray-700">Price (₹)</span>
            <input value={price} inputMode="numeric" onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))}
              className="mt-1 w-full px-3.5 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900" />
          </label>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-gray-700 flex-1">Sizes</span>
            {Object.entries(SIZE_SETS).map(([label, set]) => (
              <button key={label} onClick={() => setSizes([...set])} className="text-[10px] font-bold text-indigo-700 cursor-pointer">{label}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allSizes.map((s) => (
              <button key={s} onClick={() => toggleSize(s)}
                className={`min-w-[42px] h-9 px-2 rounded-lg border text-xs font-black cursor-pointer ${sizes.includes(s) ? 'bg-gray-900 border-gray-900 text-white' : 'border-gray-200 text-gray-500'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={busy}
          className="w-full py-3.5 rounded-xl bg-[#e11d48] text-white font-black text-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} {busy ? 'Uploading...' : 'Add to shop'}
        </button>
      </div>
    </div>
  );
}

// /api/admin/set-password against the Auth and Firestore emulators. Run:
//   npx -y firebase-tools@13 emulators:exec --only auth,firestore --project demo-setpass "node tests/setpassword.emulator.mjs"
import { generateKeyPairSync } from 'node:crypto';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
process.env.FIREBASE_PROJECT_ID = 'demo-setpass';
process.env.FIREBASE_CLIENT_EMAIL = 'test@demo-setpass.iam.gserviceaccount.com';
process.env.FIREBASE_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' });
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';

const base = new URL('../api/', import.meta.url).href;
const { adminDb } = await import(base + '_firebaseAdmin.js');
const { loadAdminAuth } = await import(base + '_adminAuth.js');
const handler = (await import(base + 'admin/[op].js')).default;
const { getAuth } = await loadAdminAuth();
const AUTH = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1`;

let fail = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) fail++; };

async function signIn(email, password) {
  const r = await fetch(`${AUTH}/accounts:signInWithPassword?key=fake`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  const b = await r.json();
  return r.ok ? b.idToken : null;
}
async function account(email, role, extra = {}) {
  const u = await getAuth().createUser({ email, password: 'oldpass123' });
  await adminDb.doc(`users/${u.uid}`).set({ email, role, active: true, ...extra });
  return u.uid;
}
function call(body, token, origin = 'https://mintoo-panel.web.app', method = 'POST') {
  return new Promise((resolve) => {
    const headers = {};
    const res = {
      code: 200, setHeader(k, v) { headers[k] = v; },
      status(c) { this.code = c; return this; },
      json(b) { resolve({ code: this.code, body: b, headers }); },
      end() { resolve({ code: this.code, headers }); },
    };
    handler({ method, query: { op: 'set-password' }, headers: { origin, ...(token ? { authorization: `Bearer ${token}` } : {}) }, body }, res)
      .catch((e) => resolve({ code: 500, body: { error: String(e) } }));
  });
}

await account('boss@x.com', 'SUPER_ADMIN');
await account('ops@x.com', 'OPS_ADMIN');
await account('kitchen@x.com', 'HOTEL_ADMIN', { hotelId: 'moms-magic' });
await account('rider@x.com', 'RIDER');
await account('diner@x.com', 'CUSTOMER');
await account('other.boss@x.com', 'SUPER_ADMIN');
const boss = await signIn('boss@x.com', 'oldpass123');
const ops = await signIn('ops@x.com', 'oldpass123');

let r = await call({}, null, 'https://evil.example', 'OPTIONS');
check('preflight from another site refused', r.code === 403 && !r.headers['Access-Control-Allow-Origin']);
r = await call({ email: 'kitchen@x.com', password: 'newpass123' }, null);
check('no sign-in refused', r.code === 401);
r = await call({ email: 'kitchen@x.com', password: 'newpass123' }, ops);
check('ops admin may not set passwords', r.code === 403);
r = await call({ email: 'kitchen@x.com', password: 'short' }, boss);
check('short password refused', r.code === 400 && /8 characters/.test(r.body.error));
r = await call({ email: 'nobody@x.com', password: 'newpass123' }, boss);
check('unknown login reported', r.code === 404);
r = await call({ email: 'diner@x.com', password: 'newpass123' }, boss);
check('customer password cannot be set', r.code === 403);
r = await call({ email: 'other.boss@x.com', password: 'newpass123' }, boss);
check('another super admin password cannot be set', r.code === 403);
r = await call({ email: 'boss@x.com', password: 'newpass123' }, boss);
check('own password not changed here', r.code === 400);

const oldKitchen = await signIn('kitchen@x.com', 'oldpass123');
// Revocation is recorded in whole seconds; a session from the same second
// would still pass, so let the old one age as a real one would.
await new Promise((r) => setTimeout(r, 1100));
r = await call({ email: 'Kitchen@X.com ', password: 'Kitchen#2026' }, boss);
check('restaurant password set', r.code === 200 && r.body.role === 'HOTEL_ADMIN', `(${r.code} ${r.body?.error || ''})`);
check('new restaurant password works', !!(await signIn('kitchen@x.com', 'Kitchen#2026')));
check('old restaurant password no longer works', !(await signIn('kitchen@x.com', 'oldpass123')));
let revoked = false;
try { await getAuth().verifyIdToken(oldKitchen, true); } catch { revoked = true; }
check('old restaurant session signed out', revoked);
r = await call({ email: 'rider@x.com', password: 'Rider#2026x' }, boss);
check('rider password set', r.code === 200 && !!(await signIn('rider@x.com', 'Rider#2026x')));

const logs = (await adminDb.collection('auditLogs').where('action', '==', 'login.setPassword').get()).docs.map((d) => d.data());
check('each change is in the audit log', logs.length === 2 && logs.every((l) => l.actorEmail === 'boss@x.com'));
check('the password itself is never logged', !JSON.stringify(logs).includes('Kitchen#2026') && !JSON.stringify(logs).includes('Rider#2026x'));

console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);

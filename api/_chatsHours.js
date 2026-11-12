// Server copy of src/lib/chatsHours.ts: Chats (Chetana Masalapuri Center) take
// orders only from 4:00 PM IST until midnight. tests/chatsHours.test.mjs checks
// both agree.

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const CHATS_OPENS_AT_MS = 16 * 60 * 60 * 1000;

export function isChatsOpenNow(now = new Date()) {
  const t = (((now.getTime() + IST_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS;
  return t >= CHATS_OPENS_AT_MS;
}

export function isChatsLine(line) {
  return !!line && ((typeof line.id === 'string' && line.id.startsWith('chetana-')) || line.hotelId === 'chetana-masalapuri-center');
}

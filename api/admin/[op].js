// /api/admin/refund and /api/admin/health, served by one function.
//
// Vercel's Hobby plan allows 12 functions and the site already had 11, so
// the Super Admin's two endpoints share this one. The handlers themselves
// live in api/_admin/ (underscore folders are not deployed as functions).

import refund from '../_admin/refund.js';
import health from '../_admin/health.js';
import { panelCors } from '../_staffAuth.js';

const HANDLERS = { refund, health };

export default async function handler(req, res) {
  const op = HANDLERS[String(req.query?.op || '')];
  if (!op) {
    if (panelCors(req, res)) return;
    return res.status(404).json({ error: 'Unknown admin endpoint.' });
  }
  return op(req, res);
}

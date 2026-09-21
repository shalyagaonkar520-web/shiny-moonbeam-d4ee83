import fs from 'fs';
import path from 'path';

// Shared admin check.
//
// This used to accept any Authorization header containing the literal
// 'mock-jwt-admin-token-123456', a string committed to a public repo -- so
// anyone who read the source could call this endpoint. It now compares against
// ADMIN_API_TOKEN from the environment and refuses every request when that is
// not set, rather than falling back to something guessable.
function isAuthorisedAdmin(authHeader) {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) return false;
  if (!authHeader || typeof authHeader !== 'string') return false;
  const supplied = authHeader.replace(/^Bearer\s+/i, '').trim();
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return require('crypto').timingSafeEqual(a, b);
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const drinksPath = path.resolve(process.cwd(), 'src/data/barDrinks.json');

  // Helper to read drinks
  const getDrinks = () => {
    try {
      if (fs.existsSync(drinksPath)) {
        return JSON.parse(fs.readFileSync(drinksPath, 'utf8'));
      }
    } catch (e) {
      console.error('Error reading drinks file:', e);
    }
    return [];
  };

  // Helper to save drinks
  const saveDrinks = (drinks) => {
    try {
      fs.writeFileSync(drinksPath, JSON.stringify(drinks, null, 2), 'utf8');
      return true;
    } catch (e) {
      console.error('Error writing drinks file:', e);
      return false;
    }
  };

  // Handle GET
  if (req.method === 'GET') {
    const drinks = getDrinks();
    return res.status(200).json(drinks);
  }

  // Auth helper
  const checkAuth = () => {
    const authHeader = req.headers['authorization'];
    return isAuthorisedAdmin(authHeader);
  };

  // Handle POST (Add / Edit)
  if (req.method === 'POST') {
    if (!checkAuth()) {
      return res.status(401).json({ success: false, message: 'Unauthorized access' });
    }

    try {
      const drink = req.body;
      const drinks = getDrinks();

      if (drink.id) {
        // Edit existing drink
        const idx = drinks.findIndex(d => d.id === drink.id);
        if (idx > -1) {
          drinks[idx] = { ...drinks[idx], ...drink };
        } else {
          drinks.push(drink);
        }
      } else {
        // Create new drink
        drink.id = 'drink-' + Date.now();
        drinks.push(drink);
      }

      const success = saveDrinks(drinks);
      if (!success) {
        return res.status(500).json({ success: false, message: 'Failed to write database file' });
      }

      return res.status(200).json({ success: true, drink });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }
  }

  // Handle DELETE
  if (req.method === 'DELETE') {
    if (!checkAuth()) {
      return res.status(401).json({ success: false, message: 'Unauthorized access' });
    }

    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Missing drink ID' });
    }

    try {
      let drinks = getDrinks();
      drinks = drinks.filter(d => d.id !== id);

      const success = saveDrinks(drinks);
      if (!success) {
        return res.status(500).json({ success: false, message: 'Failed to write database file' });
      }

      return res.status(200).json({ success: true, message: 'Drink deleted successfully' });
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Failed to delete drink' });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}

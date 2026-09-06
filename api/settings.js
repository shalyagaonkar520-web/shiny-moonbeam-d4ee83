import fs from 'fs';
import path from 'path';

let memorySettings = {
  websiteStatus: "ON",
  maintenanceMessage: "Mom's Magic is Open! Welcome ❤️",
  openTime: "00:00",
  closeTime: "23:59",
  reopenMessage: "We are open 24/7!",
  emergencyStop: false,
  festivalMode: false,
  deliveryPause: false,
  orderLimit: 50,
  lastUpdated: new Date().toISOString(),
  whatsappNumber: "+919606001790",
  whatsappAlertsEnabled: true
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let currentSettings = { ...memorySettings };
  try {
    const settingsPath = path.resolve(process.cwd(), 'src/data/adminSettings.json');
    if (fs.existsSync(settingsPath)) {
      const fileData = fs.readFileSync(settingsPath, 'utf8');
      currentSettings = { ...currentSettings, ...JSON.parse(fileData) };
    }
  } catch (err) {
    // Ephemeral catch
  }

  // Handle GET Settings
  if (req.method === 'GET') {
    return res.status(200).json(currentSettings);
  }

  // Handle POST Settings
  if (req.method === 'POST') {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.includes('mock-jwt-admin-token-123456')) {
      return res.status(401).json({ success: false, message: 'Unauthorized access' });
    }

    try {
      const newSettings = req.body;
      newSettings.lastUpdated = new Date().toISOString();
      
      memorySettings = { ...currentSettings, ...newSettings };

      try {
        const settingsPath = path.resolve(process.cwd(), 'src/data/adminSettings.json');
        fs.writeFileSync(settingsPath, JSON.stringify(memorySettings, null, 2), 'utf8');
      } catch (err) {
        // Ephemeral filesystem write might fail
      }

      return res.status(200).json({ success: true, settings: memorySettings });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid settings payload' });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}

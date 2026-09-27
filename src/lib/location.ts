// ═══════════════════════════════════════════════════════════════
// HAVERSINE DISTANCE FORMULA
// ═══════════════════════════════════════════════════════════════
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ═══════════════════════════════════════════════════════════════
// NOMINATIM REVERSE GEOCODING
// ═══════════════════════════════════════════════════════════════
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    // Capped at 5 s: on a poor connection Nominatim can hang for a minute.
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => controller?.abort(), 5000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' }, signal: controller?.signal }
    ).finally(() => clearTimeout(timer));
    const data = await res.json();
    if (data && data.address) {
      const addr = data.address;
      const parts = [
        addr.house_number || '',
        addr.road || '',
        addr.neighbourhood || addr.suburb || addr.hamlet || '',
        addr.city || addr.town || addr.village || addr.county || '',
        addr.state || '',
      ].filter(Boolean);
      return parts.join(', ') || data.display_name || 'Unknown Location';
    }
    return data.display_name || 'Unknown Location';
  } catch {
    return 'Unable to fetch address';
  }
}

// Hotel Sankalpa - centralized dish image map.
// Single source of truth: every menu item name maps to its own photo.
// Files live in /public/images/menu/<category-folder>/<slug>.jpg
// Each photo was visually checked against its dish; every item is vegetarian.

export const SANKALPA_MENU_IMAGES: Record<string, string> = {
  // Veg Main Course
  'Paneer Handi': '/images/menu/veg-main-course/paneer-handi.jpg',
  'Aloo Jeera': '/images/menu/veg-main-course/aloo-jeera.jpg',
  'Gobi Masala': '/images/menu/veg-main-course/gobi-masala.jpg',
  'Veg Keema': '/images/menu/veg-main-course/veg-keema.jpg',
  'Veg Makkanwala': '/images/menu/veg-main-course/veg-makkanwala.jpg',
  'Kaju Kolhapuri': '/images/menu/veg-main-course/kaju-kolhapuri.jpg',
  'Mix Veg': '/images/menu/veg-main-course/mix-veg.jpg',
  'Veg Kolhapuri': '/images/menu/veg-main-course/veg-kolhapuri.jpg',
  'Mushroom Butter Masala': '/images/menu/veg-main-course/mushroom-butter-masala.jpg',
  'Tomato Masala': '/images/menu/veg-main-course/tomato-masala.jpg',
  'Mushroom Masala': '/images/menu/veg-main-course/mushroom-masala.jpg',
  'Kaju Masala': '/images/menu/veg-main-course/kaju-masala.jpg',
  'Paneer Masala': '/images/menu/veg-main-course/paneer-masala.jpg',
  'Paneer Kadai': '/images/menu/veg-main-course/paneer-kadai.jpg',
  'Kaju Kurma': '/images/menu/veg-main-course/kaju-kurma.jpg',
  'Paneer Tikka (Main Course)': '/images/menu/veg-main-course/paneer-tikka-main-course.jpg',
  'Mushroom Tikka Masala': '/images/menu/veg-main-course/mushroom-tikka-masala.jpg',
  'Kaju Paneer Masala': '/images/menu/veg-main-course/kaju-paneer-masala.jpg',
  'Paneer Tawa': '/images/menu/veg-main-course/paneer-tawa.jpg',
  'Veg Kadai': '/images/menu/veg-main-course/veg-kadai.jpg',
  'Paneer Butter Masala': '/images/menu/veg-main-course/paneer-butter-masala.jpg',
  'Aloo Gobi Masala': '/images/menu/veg-main-course/aloo-gobi-masala.jpg',

  // Veg Starter
  'Aloo Pakoda': '/images/menu/veg-starter/aloo-pakoda.jpg',
  'Onion Pakoda': '/images/menu/veg-starter/onion-pakoda.jpg',
  'Mushroom Manchurian': '/images/menu/veg-starter/mushroom-manchurian.jpg',
  'Mirchi Bhaji': '/images/menu/veg-starter/mirchi-bhaji.jpg',
  'Roasted Papad': '/images/menu/veg-starter/roasted-papad.jpg',
  'Fried Papad': '/images/menu/veg-starter/fried-papad.jpg',
  'Gobi Manchurian': '/images/menu/veg-starter/gobi-manchurian.jpg',
  'Gobi Chilly': '/images/menu/veg-starter/gobi-chilly.jpg',
  'Masala Papad': '/images/menu/veg-starter/masala-papad.jpg',
  'Paneer Chilly': '/images/menu/veg-starter/paneer-chilly.jpg',
  'Paneer 65': '/images/menu/veg-starter/paneer-65.jpg',
  'Finger Chips': '/images/menu/veg-starter/finger-chips.jpg',

  // Rice Items
  'Tomato Rice': '/images/menu/rice/tomato-rice.jpg',
  'Jeera Rice': '/images/menu/rice/jeera-rice.jpg',
  'Ghee Rice': '/images/menu/rice/ghee-rice.jpg',
  'Masala Rice': '/images/menu/rice/masala-rice.jpg',
  'Curd Rice': '/images/menu/rice/curd-rice.jpg',
  'Paneer Pulao': '/images/menu/rice/paneer-pulao.jpg',
  'Peas Pulao': '/images/menu/rice/peas-pulao.jpg',
  'Peas Panner Pulav': '/images/menu/rice/peas-paneer-pulav.jpg',
  'Veg Biryani': '/images/menu/rice/veg-biryani.jpg',
  'Mushroom Biryani': '/images/menu/rice/mushroom-biryani.jpg',
  'Lemon Rice': '/images/menu/rice/lemon-rice.jpg',
  'Veg Fried Rice': '/images/menu/rice/veg-fried-rice.jpg',
  'Paneer Fried Rice': '/images/menu/rice/paneer-fried-rice.jpg',
  'Onion Chilli Fried Rice': '/images/menu/rice/onion-chilli-fried-rice.jpg',
  'Daal Khichdi': '/images/menu/rice/daal-khichdi.jpg',

  // Dosa
  'Butter Masala Dosa': '/images/menu/dosa/butter-masala-dosa.jpg',
  'Plain Dosa': '/images/menu/dosa/plain-dosa.jpg',
  'Set Dosa': '/images/menu/dosa/set-dosa.jpg',
  'Butter Plain Dosa': '/images/menu/dosa/butter-plain-dosa.jpg',
  'Rava Dosa': '/images/menu/dosa/rava-dosa.jpg',
  'Khali Dosa': '/images/menu/dosa/khali-dosa.jpg',
  'Uttappa': '/images/menu/dosa/uttappa.jpg',
  'Masala Dosa': '/images/menu/dosa/masala-dosa.jpg',

  // South Indian Breakfast
  'Idli Vada (2+1)': '/images/menu/breakfast/idli-vada-2-1.jpg',
  'Buns': '/images/menu/breakfast/buns.jpg',
  'Upma': '/images/menu/breakfast/upma.jpg',
  'Idli (2 pcs)': '/images/menu/breakfast/idli-2-pcs.jpg',
  'Idli + Vada (1+1)': '/images/menu/breakfast/idli-vada-1-1.jpg',
  'Singal Puri': '/images/menu/breakfast/singal-puri.jpg',
  'Vada (2 pcs)': '/images/menu/breakfast/vada-2-pcs.jpg',

  // Tandoori
  'Roti': '/images/menu/tandoori/roti.jpg',
  'Naan': '/images/menu/tandoori/naan.jpg',
  'Butter Naan': '/images/menu/tandoori/butter-naan.jpg',
  'Butter Garlic Naan': '/images/menu/tandoori/butter-garlic-naan.jpg',
  'Garlic Naan': '/images/menu/tandoori/garlic-naan.jpg',
  'Aloo Parota': '/images/menu/tandoori/aloo-parota.jpg',
  'Butter Kulcha': '/images/menu/tandoori/butter-kulcha.jpg',
  'Butter Parota': '/images/menu/tandoori/butter-parota.jpg',
  'Masala Roti': '/images/menu/tandoori/masala-roti.jpg',
  'Tandoori Parota': '/images/menu/tandoori/tandoori-parota.jpg',
  'Butter Roti': '/images/menu/tandoori/butter-roti.jpg',
  'Paneer Tikka (Tandoori Counter)': '/images/menu/tandoori/paneer-tikka-tandoori.jpg',

  // Daal
  'Daal Butter Fry': '/images/menu/daal/daal-butter-fry.jpg',
  'Daal Kolhapuri': '/images/menu/daal/daal-kolhapuri.jpg',
  'Daal Fry': '/images/menu/daal/daal-fry.jpg',
  'Daal Tadka': '/images/menu/daal/daal-tadka.jpg',
  'Daal Paneer': '/images/menu/daal/daal-paneer.jpg',

  // Soup
  'Tomato Soup': '/images/menu/soup/tomato-soup.jpg',
  'Veg Manchow Soup': '/images/menu/soup/veg-manchow-soup.jpg',

  // Thali
  'Rice South Thali': '/images/menu/thali/rice-south-thali.jpg',
  'South Thali': '/images/menu/thali/south-thali.jpg',
};

// Shown only if a dish photo ever fails to load.
export const SANKALPA_FALLBACK_IMAGE = '/hotel_sankalpa.webp';

export function getSankalpaDishImage(itemName: string): string {
  return SANKALPA_MENU_IMAGES[itemName] || SANKALPA_FALLBACK_IMAGE;
}

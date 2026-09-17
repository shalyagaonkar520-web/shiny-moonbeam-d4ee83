import fs from 'fs';

const REAL_FOLDER_MAP = {
  'party-3': '/happy_meal_combo.jpg',
  'party-4': '/white_forest_cake.png',
  'ff-1': '/masala_papad.png',
  'ff-2': '/shawarma_new.png',
  'ff-3': '/kheema_pav.png',
  'rn-1': '/veg_noodles_real.png',
  'rn-2': '/veg_schezwan_rice.png',
  'rn-3': '/gobi_manchurian.png',
  'rn-4': '/veg_fried_rice.png',
  'rn-5': '/egg_fried_rice.png',
  'rn-6': '/veg_noodles_real.png',
  'rn-7': '/chicken_fried_rice.png',
  'rn-8': '/gobi_chilli.png',
  'rn-9': '/veg_pulav.png',
  'rn-10': '/schezwan_egg_rice.png',
  'rn-11': '/mutton_fried_rice.png',
  'rn-12': '/schezwan_mutton_rice.png',
  'rn-13': '/veg_noodles.png',
  'rn-14': '/triple_schezwan_rice.png',
  'special-today': '/mutton_fried_rice.png',
  'br-1': '/kushka.png',
  'br-2': '/egg_biryani.png',
  'br-4': '/veg_biryani.png',
  'br-5': '/chicken_biryani_new.png',
  'br-5-full': '/chicken_biryani_new.png',
  'br-6': '/mutton_biryani.png',
  'br-7': '/paneer_biryani.png',
  'br-8': '/mutton_biryani.png',
  'mt-1': '/mutton_sukka.png',
  'st-1': '/chicken_crispy.png',
  'st-2': '/chicken_65.png',
  'st-3': '/chicken_kabab.png',
  'st-4': '/chicken_lollipop.png',
  'st-5': '/chicken_tikka.png',
  'st-6': '/chicken_65_chinese.png',
  'st-7': '/chicken_kabab_half.png',
  'st-8': '/fish_fry.png',
  'vg-1': '/dal_tadka.png',
  'vg-2': '/palak_paneer.jpg',
  'vg-4': '/dal_tadka.png',
  'vg-5': '/dal_tadka.png',
  'vg-6': '/palak_paneer.jpg',
  'vg-7': '/kaju_masala.png',
  'vg-8': '/palak_paneer.jpg',
  'vg-9': '/dal_tadka.png',
  'rt-1': '/chapati.jpg',
  'rt-2': '/parota.jpg',
  'rt-3': '/butter_parota.jpg',
  'rt-4': '/tandoor_roti_real.png',
  'rt-6': '/butter_roti.png',
  'rt-7': '/butter_naan.png',
  'rt-8': '/butter_kulcha.png',
  'momo-1': '/fried_momos.png',
  'momo-2': '/fried_momos.png',
  'drink-special-2': '/butterscotch_shake_user.png',
  'drink-special-3': '/vanilla_shake_user.png',
  'drink-coke': '/coke_range.png',
  'drink-sprite': '/sprite_range.png'
};

let menuContent = fs.readFileSync('src/data/menuItems.ts', 'utf8');
let count = 0;

for (const [id, newImg] of Object.entries(REAL_FOLDER_MAP)) {
  const regex = new RegExp(`(id:\\s*['"]${id}['"][\\s\\S]*?image:\\s*['"])([^'"]+)(['"])`, 'g');
  if (regex.test(menuContent)) {
    menuContent = menuContent.replace(regex, `$1${newImg}$3`);
    count++;
  }
}

fs.writeFileSync('src/data/menuItems.ts', menuContent, 'utf8');
console.log(`Updated ${count} items in menuItems.ts with folder photos.`);

// Update partyItems.ts
let partyContent = fs.readFileSync('src/data/partyItems.ts', 'utf8');
partyContent = partyContent
  .replace(/image:\s*['"]\/images\/butterscotch-cake\.webp['"]/g, "image: '/butterscotch_cake.png'")
  .replace(/image:\s*['"]\/images\/red-velvet-cake\.webp['"]/g, "image: '/red_velvet_cake.png'")
  .replace(/image:\s*['"]\/images\/strawberry-cake\.webp['"]/g, "image: '/strawberry_cake.jpg'")
  .replace(/image:\s*['"]\/images\/mango-cake\.webp['"]/g, "image: '/mango_shake_user.png'")
  .replace(/image:\s*['"]\/images\/kiwi-cake\.webp['"]/g, "image: '/kiwi_cake.png'")
  .replace(/image:\s*['"]\/images\/chocolate-cake\.webp['"]/g, "image: '/black_forest_cake.png'")
  .replace(/image:\s*['"]\/images\/veg-puffs\.webp['"]/g, "image: '/veg_puff.png'")
  .replace(/image:\s*['"]\/images\/egg-puffs\.webp['"]/g, "image: '/egg_puff.png'");

fs.writeFileSync('src/data/partyItems.ts', partyContent, 'utf8');
console.log('Updated partyItems.ts with folder photos.');

// Update LandingPage.tsx WHATS_ON_YOUR_MIND
let landingContent = fs.readFileSync('src/components/LandingPage.tsx', 'utf8');
landingContent = landingContent
  .replace(/image:\s*['"]\/images\/chicken-biryani-full\.webp['"]/, "image: '/chicken_biryani_new.png'")
  .replace(/image:\s*['"]\/images\/dal-tadka\.webp['"]/, "image: '/dal_tadka.png'")
  .replace(/image:\s*['"]\/images\/parota\.webp['"]/, "image: '/parota.jpg'")
  .replace(/image:\s*['"]\/images\/chicken-65-chinese\.webp['"]/, "image: '/chicken_65_chinese.png'")
  .replace(/image:\s*['"]\/images\/chicken-roll\.webp['"]/, "image: '/roll_combo.jpg'")
  .replace(/image:\s*['"]\/images\/chocolate-cake\.webp['"]/, "image: '/black_forest_cake.png'")
  .replace(/image:\s*['"]\/images\/classic-mojito\.webp['"]/, "image: '/classic_mojito.png'");

fs.writeFileSync('src/components/LandingPage.tsx', landingContent, 'utf8');
console.log('Updated LandingPage.tsx WHATS_ON_YOUR_MIND with folder photos.');

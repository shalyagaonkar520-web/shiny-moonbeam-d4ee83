import fs from 'fs';

// Read all files in public
const publicFiles = fs.readdirSync('public').filter(f => f.match(/\.(png|jpg|jpeg)$/i));
const publicFileSet = new Set(publicFiles);

console.log(`Found ${publicFiles.length} original files in public/`);

const SPECIFIC_MAP = {
  'kheema-pav': '/kheema_pav.png',
  'masala-papad': '/masala_papad.png',
  'shawarma': '/shawarma_new.png',
  'samosa': '/samosa.png',
  'vada-pav': '/vada_pav.png',
  'veg-noodles': '/veg_noodles_real.png',
  'veg-schezwan-rice': '/veg_schezwan_rice.png',
  'gobi-manchurian': '/gobi_manchurian.png',
  'veg-fried-rice': '/veg_fried_rice.png',
  'egg-fried-rice': '/egg_fried_rice.png',
  'chicken-noodles': '/veg_noodles_real.png',
  'chicken-fried-rice': '/chicken_fried_rice.png',
  'gobi-chilli': '/gobi_chilli.png',
  'veg-pulav': '/veg_pulav.png',
  'schezwan-egg-rice': '/schezwan_egg_rice.png',
  'mutton-fried-rice': '/mutton_fried_rice.png',
  'schezwan-mutton-rice': '/schezwan_mutton_rice.png',
  'hakka-noodles': '/veg_noodles.png',
  'triple-schezwan-rice': '/triple_schezwan_rice.png',
  'kushka': '/kushka.png',
  'egg-biryani': '/egg_biryani.png',
  'veg-biryani': '/veg_biryani.png',
  'chicken-biryani-half': '/chicken_biryani_new.png',
  'chicken-biryani-full': '/chicken_biryani_new.png',
  'mutton-biryani-half': '/mutton_biryani.png',
  'paneer-biryani': '/paneer_biryani.png',
  'mutton-biryani-special': '/mutton_biryani.png',
  'mutton-sukka': '/mutton_sukka.png',
  'chicken-crispy': '/chicken_crispy.png',
  'chicken-65': '/chicken_65.png',
  'chicken-kabab': '/chicken_kabab.png',
  'chicken-lollipop': '/chicken_lollipop.png',
  'chicken-tikka': '/chicken_tikka.png',
  'chicken-65-chinese': '/chicken_65_chinese.png',
  'chicken-kabab-half': '/chicken_kabab_half.png',
  'fish-fry': '/fish_fry.png',
  'veg-kolhapuri': '/dal_tadka.png',
  'palak-paneer': '/palak_paneer.jpg',
  'veg-kadai': '/dal_tadka.png',
  'veg-korma': '/dal_tadka.png',
  'paneer-masala': '/palak_paneer.jpg',
  'kaju-masala': '/kaju_masala.png',
  'paneer-butter-masala': '/palak_paneer.jpg',
  'dal-tadka': '/dal_tadka.png',
  'chapati': '/chapati.jpg',
  'parota': '/parota.jpg',
  'butter-roti': '/butter_roti.png',
  'tandoori-roti': '/tandoor_roti_real.png',
  'two-butter-roti': '/butter_roti.png',
  'butter-naan': '/butter_naan.png',
  'butter-kulcha': '/butter_kulcha.png',
  'chicken-roll': '/roll_large.jpg',
  'fried-momos': '/fried_momos.png',
  'steamed-momos': '/fried_momos.png',
  'butterscotch-milkshake': '/butterscotch_shake_user.png',
  'vanilla-milkshake': '/vanilla_shake_user.png',
  'coke': '/coke_range.png',
  'sprite': '/sprite_range.png',
  'veggie-delight-combo': '/happy_meal_combo.jpg',
  'sweet-box-family': '/white_forest_cake.png',
  'mutton-fried-rice-special': '/mutton_fried_rice.png'
};

let menuContent = fs.readFileSync('src/data/menuItems.ts', 'utf8');
let replaced = 0;

for (const [key, realPath] of Object.entries(SPECIFIC_MAP)) {
  const regex = new RegExp(`"image":\\s*"\\/images\\/${key}\\.webp"`, 'g');
  if (regex.test(menuContent)) {
    menuContent = menuContent.replace(regex, `"image": "${realPath}"`);
    replaced++;
  }
}

fs.writeFileSync('src/data/menuItems.ts', menuContent, 'utf8');
console.log(`Replaced ${replaced} image entries in menuItems.ts with authentic folder photos.`);

// Real, verified food photos matched directly from the project's local image folder
// for Hotel Mumtaz restaurant dishes.

export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  'soups': '/hot_and_sour_soup.jpg',
  'biryani': '/chicken_biryani_stitch.png',
  'chicken starters': '/chicken_kabab_stitch.png',
  'mutton starters': '/mutton_sukka_stitch.png',
  'egg starters': '/egg_puff.png',
  'veg starters': '/gobi_manchurian.png',
  'egg main course': '/egg_biryani_stitch.png',
  'chicken main course': '/chicken_tikka.png',
  'veg main course': '/dal_tadka_stitch.png',
  'mutton main course': '/mutton_sukka_stitch.png',
  'chicken family pack': '/chicken_biryani_stitch.png',
  'mutton family pack': '/mutton_biryani_stitch.png',
  'fish masala': '/fish_fry.png',
  'fish thali': '/fish_fry.png',
  'fish starters': '/fish_fry.png',
  'kaka traditional biryani': '/chicken_biryani_stitch.png',
  'thalis': '/chicken_biryani_stitch.png',
  'roti / paratha': '/butter_naan_stitch.png',
  'rice': '/veg_pulav.png',
  'rice & noodles': '/veg_fried_rice.png',
  'veg fried rice & noodles': '/veg_fried_rice.png',
  'noodles & fried rice (non-veg)': '/chicken_fried_rice.png',
  'fast food & snacks': '/shawarma_new.png',
  'drinks & shakes': '/classic_mojito.png',
  'ice cakes': '/black_forest_cake.png',
  'raita & salad': '/masala_papad.png',
  'desserts & falooda': '/white_forest_cake.png',
  'fruit desserts': '/kiwi_cake.png',
  'icecreams': '/butterscotch_cake.png',
  'milk shakes': '/butterscotch_shake_user.png',
  'fresh juices': '/mango_shake_user.png',
  'beverages': '/classic_mojito.png',
  'pizza - nonveg': '/chicken_tikka.png',
  'pizza - veg': '/paneer_chilli.jpg',
  'make to order (pizza base)': '/butter_naan_stitch.png',
  'pizza extras': '/butter_naan_stitch.png',
  'hot beverages': '/cold_coffee.png',
  'shawarma & rolls': '/shawarma_new.png'
};

export function getFallbackDishImage(categoryTitle: string): string {
  const cat = categoryTitle.toLowerCase().trim();
  return CATEGORY_FALLBACK_IMAGES[cat] || '/chicken_biryani_stitch.png';
}

export function resolveMumtazDishImage(categoryTitle: string, itemName: string): string {
  const cat = categoryTitle.toLowerCase().trim();
  const n = itemName.toLowerCase().trim();
  const has = (...kws: string[]) => kws.some((k) => n.includes(k));

  // --- 1. BIRYANI & KHUSKA (Stitch Ultra-HD Macro Photography) ---
  if (cat.includes('biryani') || has('biryani', 'khuska', 'kushka')) {
    if (has('chicken')) return '/chicken_biryani_stitch.png';
    if (has('mutton')) return '/mutton_biryani_stitch.png';
    if (has('egg')) return '/egg_biryani_stitch.png';
    if (has('paneer')) return '/veg_biryani_stitch.png';
    if (has('veg')) return '/veg_biryani_stitch.png';
    if (has('khuska', 'kushka')) return '/kushka_stitch.png';
    if (has('prawns')) return '/fish_fry.png';
    return '/chicken_biryani_stitch.png';
  }

  // --- 2. CHICKEN STARTERS (Stitch Ultra-HD Starters) ---
  if (cat === 'chicken starters') {
    if (has('lollipop')) return '/chicken_lollipop.png';
    if (has('65 chinese')) return '/chicken_65_chinese.png';
    if (has('65')) return '/chicken_65.png';
    if (has('chilli')) return '/chicken_chilli.jpg';
    if (has('manchurian')) return '/chicken_manchurian.jpg';
    if (has('tikka', 'tandoori', 'al faham', 'angara', 'leg piece')) return '/chicken_tikka.png';
    if (has('half')) return '/chicken_kabab_stitch.png';
    if (has('crispy', 'spinach', 'lemon', 'butter garlic')) return '/chicken_crispy.png';
    return '/chicken_kabab_stitch.png';
  }

  // --- 3. MUTTON STARTERS (Stitch Ultra-HD Mutton Sukka) ---
  if (cat === 'mutton starters') {
    if (has('kheema', 'keema')) return '/kheema_pav.png';
    return '/mutton_sukka_stitch.png';
  }

  // --- 4. EGG STARTERS & MAIN COURSE ---
  if (cat.includes('egg starters') || cat.includes('egg main course')) {
    if (has('kadai')) return '/egg_kadai.jpg';
    if (has('handi')) return '/egg_handi.png';
    if (has('makhani', 'makkani')) return '/egg_makhani.png';
    if (has('biryani')) return '/egg_biryani_stitch.png';
    return '/egg_kadai.jpg';
  }

  // --- 5. VEG STARTERS ---
  if (cat === 'veg starters') {
    if (has('papad')) return '/masala_papad.png';
    if (has('paneer chilli')) return '/paneer_chilli.jpg';
    if (has('paneer manchurian')) return '/paneer_manchurian.jpg';
    if (has('paneer')) return '/paneer_cutlet.png';
    if (has('mushroom chilli')) return '/mushroom_chilli.jpg';
    if (has('mushroom manchurian')) return '/mushroom_manchurian.jpg';
    if (has('gobi chilli', '65')) return '/gobi_chilli.png';
    if (has('gobi')) return '/gobi_manchurian.png';
    if (has('baby corn')) return '/gobi_chilli.png';
    if (has('fries', 'french fries')) return '/masala_papad.png';
    return '/gobi_manchurian.png';
  }

  // --- 6. SOUPS ---
  if (cat.includes('soup')) {
    if (has('mutton')) return '/mutton_soup_real.png';
    if (has('manchow')) return '/veg_manchow_soup_real.png';
    if (has('hot', 'sour')) return '/hot_and_sour_soup.jpg';
    if (has('chicken')) return '/hot_and_sour_soup.jpg';
    return '/veg_manchow_soup.jpg';
  }

  // --- 7. VEG MAIN COURSE (Stitch Ultra-HD Dal & Paneer) ---
  if (cat === 'veg main course') {
    if (has('kaju')) return '/kaju_masala.png';
    if (has('tawa')) return '/paneer_tawa.jpg';
    if (has('handi')) return '/paneer_handi.png';
    if (has('tikka')) return '/paneer_tikka_masala.png';
    if (has('paneer')) return '/paneer_handi.png';
    if (has('mushroom')) return '/mushroom_kadai.png';
    if (has('gobi')) return '/gobi_manchurian.png';
    return '/dal_tadka_stitch.png';
  }

  // --- 8. CHICKEN MAIN COURSE & FAMILY PACKS ---
  if (cat === 'chicken main course' || cat === 'chicken family pack') {
    if (has('mumtaz')) return '/chicken_mumtaz_spl.jpg';
    if (has('sizzler', 'sizler')) return '/chicken_sizzler.png';
    if (has('crispy')) return '/chicken_crispy.png';
    if (has('chilli')) return '/chicken_chilli.jpg';
    if (has('manchurian')) return '/chicken_manchurian.jpg';
    if (has('shahi', 'shaan')) return '/chicken_biryani_stitch.png';
    return '/chicken_tikka.png';
  }

  // --- 9. MUTTON MAIN COURSE & FAMILY PACKS ---
  if (cat === 'mutton main course' || cat === 'mutton family pack') {
    if (has('kheema', 'keema')) return '/kheema_pav.png';
    if (has('kadai')) return '/mutton_kadai.png';
    if (has('handi')) return '/mutton_handi.png';
    if (has('makhani', 'makkani')) return '/mutton_makkhani.jpg';
    if (has('rogan', 'roash', 'josh')) return '/mutton_rogan_josh.png';
    if (has('shahi', 'shaan')) return '/mutton_biryani_stitch.png';
    return '/mutton_sukka_stitch.png';
  }

  // --- 10. FISH & SEAFOOD ---
  if (cat.includes('fish') || has('prawns', 'crab', 'fish', 'bangda', 'pomfret', 'surmai', 'dhodi', 'belonji', 'katla')) {
    return '/fish_fry.png';
  }

  // --- 11. THALIS ---
  if (cat.includes('thali')) {
    if (has('chicken')) return '/chicken_biryani_stitch.png';
    if (has('mutton')) return '/mutton_biryani_stitch.png';
    if (has('egg')) return '/egg_biryani_stitch.png';
    if (has('fish')) return '/fish_fry.png';
    return '/dal_tadka_stitch.png';
  }

  // --- 12. ROTI / PARATHA (Stitch Ultra-HD Naan & Roti) ---
  if (cat.includes('roti') || cat.includes('paratha')) {
    if (has('garlic naan', 'cheese naan')) return '/garlic_naan.png';
    if (has('naan')) return '/butter_naan_stitch.png';
    if (has('kulcha')) return '/butter_kulcha.png';
    if (has('tandoori roti')) return '/butter_naan_stitch.png';
    if (has('butter roti')) return '/butter_roti.png';
    if (has('chapati')) return '/chapati.jpg';
    if (has('parota', 'paratha', 'lachha', 'selone')) return '/butter_parota.jpg';
    return '/butter_naan_stitch.png';
  }

  // --- 13. RICE ---
  if (cat === 'rice') {
    if (has('dal')) return '/dal_tadka.png';
    return '/veg_pulav.png';
  }

  // --- 14. VEG FRIED RICE & NOODLES ---
  if (cat === 'veg fried rice & noodles') {
    if (has('noodles')) return '/veg_noodles_real.png';
    if (has('schezwan')) return '/veg_schezwan_rice.png';
    return '/veg_fried_rice.png';
  }

  // --- 15. NOODLES & FRIED RICE (NON-VEG) ---
  if (cat === 'noodles & fried rice (non-veg)') {
    if (has('mutton schezwan')) return '/schezwan_mutton_rice.png';
    if (has('mutton')) return '/mutton_fried_rice.png';
    if (has('egg schezwan')) return '/schezwan_egg_rice.png';
    if (has('egg fried')) return '/egg_fried_rice.png';
    if (has('mix', 'triple', 'prawns')) return '/triple_schezwan_rice.png';
    if (has('noodles')) return '/veg_noodles_real.png';
    if (has('schezwan')) return '/chicken_fried_rice.png';
    return '/chicken_fried_rice.png';
  }

  // --- 16. SHAWARMA & ROLLS ---
  if (cat.includes('shawarma') || cat.includes('roll')) {
    if (has('roll')) return '/roll_large.jpg';
    return '/shawarma_new.png';
  }

  // --- 17. RAITA & SALAD ---
  if (cat.includes('salad') || cat.includes('raita')) {
    return '/masala_papad.png';
  }

  // --- 18. DESSERTS & FALOODA ---
  if (cat.includes('dessert') || cat.includes('falooda')) {
    if (has('mango')) return '/mango_shake_user.png';
    if (has('strawberry')) return '/strawberry_cake.jpg';
    if (has('chocolate')) return '/black_forest_cake.png';
    if (has('pista', 'butter')) return '/butterscotch_cake.png';
    return '/white_forest_cake.png';
  }

  // --- 19. FRUIT DESSERTS & ICECREAMS ---
  if (cat.includes('fruit') || cat.includes('icecream')) {
    if (has('strawberry')) return '/strawberry_cake.jpg';
    if (has('mango')) return '/mango_shake_user.png';
    if (has('butter scotch', 'gadbad')) return '/butterscotch_cake.png';
    if (has('choco')) return '/black_forest_cake.png';
    return '/kiwi_cake.png';
  }

  // --- 20. MILK SHAKES & JUICES ---
  if (cat.includes('shake') || cat.includes('juice')) {
    if (has('butter scotch')) return '/butterscotch_shake_user.png';
    if (has('vanilla')) return '/vanilla_shake_user.png';
    if (has('mango')) return '/mango_shake_user.png';
    if (has('strawberry', 'watermelon', 'pomegranate')) return '/strawberry_mojito.png';
    if (has('grapes')) return '/blue_curacao.png';
    return '/mango_shake_user.png';
  }

  // --- 21. BEVERAGES ---
  if (cat.includes('beverage')) {
    if (has('cold coffee', 'coffee')) return '/cold_coffee.png';
    if (has('blue cool')) return '/blue_curacao.png';
    if (has('mojito')) return '/classic_mojito.png';
    if (has('coke')) return '/coke_range.png';
    if (has('sprite', 'lemon')) return '/sprite_range.png';
    if (has('mango')) return '/mango_shake_user.png';
    return '/classic_mojito.png';
  }

  // --- 22. PIZZA ---
  if (cat.includes('pizza')) {
    if (has('chicken')) return '/chicken_tikka.png';
    if (has('paneer')) return '/palak_paneer.jpg';
    return '/gobi_manchurian.png';
  }

  return '/chicken_biryani_new.png';
}

export function isNonVegItem(categoryTitle: string, itemName: string): boolean {
  const cat = categoryTitle.toLowerCase();
  const n = itemName.toLowerCase();

  if (
    cat === 'veg starters' ||
    cat === 'veg main course' ||
    cat === 'veg fried rice & noodles' ||
    cat === 'pizza - veg' ||
    cat === 'desserts & falooda' ||
    cat === 'fruit desserts' ||
    cat === 'icecreams' ||
    cat === 'milk shakes' ||
    cat === 'fresh juices' ||
    cat === 'hot beverages'
  ) {
    return false;
  }

  if (cat === 'raita & salad' || cat === 'roti / paratha' || cat === 'rice') {
    return false;
  }

  return /chicken|mutton|egg|fish|prawns|crab|bangda|pomfret|surmai|kingfish|katla|dhodi|belonji|meat|kheema|seekh|shahi chicken|murg/.test(
    n + ' ' + cat
  );
}

export function isBestseller(categoryTitle: string, itemName: string): boolean {
  const n = itemName.toLowerCase();
  return (
    n.includes('chicken dum biryani') ||
    n.includes('mutton dum biryani') ||
    n.includes('chicken lollipop') ||
    n.includes('chicken 65') ||
    n.includes('chicken tandoori') ||
    n.includes('butter chicken') ||
    n.includes('daal tadka') ||
    n.includes('paneer tikka') ||
    n.includes('chicken shawarma') ||
    n.includes('butter naan') ||
    n.includes('chicken fried rice') ||
    n.includes('royal falooda') ||
    n.includes('gadbad') ||
    n.includes('prawns biryani') ||
    n.includes('mutton sukka')
  );
}

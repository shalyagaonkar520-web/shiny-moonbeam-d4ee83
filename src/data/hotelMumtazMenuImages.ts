// Real, verified food photos matched directly from the project's local image folder
// for Hotel Mumtaz restaurant dishes.

export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  'soups': '/hot_and_sour_soup.webp',
  'biryani': '/chicken_biryani_stitch.webp',
  'chicken starters': '/chicken_kabab_stitch.webp',
  'mutton starters': '/mutton_sukka_stitch.webp',
  'egg starters': '/egg_puff.webp',
  'veg starters': '/gobi_manchurian.webp',
  'egg main course': '/egg_biryani_stitch.webp',
  'chicken main course': '/chicken_tikka.webp',
  'veg main course': '/dal_tadka_stitch.webp',
  'mutton main course': '/mutton_sukka_stitch.webp',
  'chicken family pack': '/chicken_biryani_stitch.webp',
  'mutton family pack': '/mutton_biryani_stitch.webp',
  'fish masala': '/fish_fry.webp',
  'fish thali': '/fish_fry.webp',
  'fish starters': '/fish_fry.webp',
  'kaka traditional biryani': '/chicken_biryani_stitch.webp',
  'thalis': '/chicken_biryani_stitch.webp',
  'roti / paratha': '/butter_naan_stitch.webp',
  'rice': '/veg_pulav.webp',
  'rice & noodles': '/veg_fried_rice.webp',
  'veg fried rice & noodles': '/veg_fried_rice.webp',
  'noodles & fried rice (non-veg)': '/chicken_fried_rice.webp',
  'fast food & snacks': '/shawarma_new.webp',
  'drinks & shakes': '/classic_mojito.webp',
  'ice cakes': '/black_forest_cake.webp',
  'raita & salad': '/masala_papad.webp',
  'desserts & falooda': '/white_forest_cake.webp',
  'fruit desserts': '/kiwi_cake.webp',
  'icecreams': '/butterscotch_cake.webp',
  'milk shakes': '/butterscotch_shake_user.webp',
  'fresh juices': '/mango_shake_user.webp',
  'beverages': '/classic_mojito.webp',
  'pizza - nonveg': '/chicken_tikka.webp',
  'pizza - veg': '/paneer_chilli.webp',
  'make to order (pizza base)': '/butter_naan_stitch.webp',
  'pizza extras': '/butter_naan_stitch.webp',
  'hot beverages': '/cold_coffee.webp',
  'shawarma & rolls': '/shawarma_new.webp'
};

export function getFallbackDishImage(categoryTitle: string): string {
  const cat = categoryTitle.toLowerCase().trim();
  return CATEGORY_FALLBACK_IMAGES[cat] || '/chicken_biryani_stitch.webp';
}

export function resolveMumtazDishImage(categoryTitle: string, itemName: string): string {
  const cat = categoryTitle.toLowerCase().trim();
  const n = itemName.toLowerCase().trim();
  const has = (...kws: string[]) => kws.some((k) => n.includes(k));

  // --- 1. BIRYANI & KHUSKA (Stitch Ultra-HD Macro Photography) ---
  if (cat.includes('biryani') || has('biryani', 'khuska', 'kushka')) {
    if (has('chicken')) return '/chicken_biryani_stitch.webp';
    if (has('mutton')) return '/mutton_biryani_stitch.webp';
    if (has('egg')) return '/egg_biryani_stitch.webp';
    if (has('paneer')) return '/veg_biryani_stitch.webp';
    if (has('veg')) return '/veg_biryani_stitch.webp';
    if (has('khuska', 'kushka')) return '/kushka_stitch.webp';
    if (has('prawns')) return '/fish_fry.webp';
    return '/chicken_biryani_stitch.webp';
  }

  // --- 2. CHICKEN STARTERS (Stitch Ultra-HD Starters) ---
  if (cat === 'chicken starters') {
    if (has('lollipop')) return '/chicken_lollipop.webp';
    if (has('65 chinese')) return '/chicken_65_chinese.webp';
    if (has('65')) return '/chicken_65.webp';
    if (has('chilli')) return '/chicken_chilli.webp';
    if (has('manchurian')) return '/chicken_manchurian.webp';
    if (has('tikka', 'tandoori', 'al faham', 'angara', 'leg piece')) return '/chicken_tikka.webp';
    if (has('half')) return '/chicken_kabab_stitch.webp';
    if (has('crispy', 'spinach', 'lemon', 'butter garlic')) return '/chicken_crispy.webp';
    return '/chicken_kabab_stitch.webp';
  }

  // --- 3. MUTTON STARTERS (Stitch Ultra-HD Mutton Sukka) ---
  if (cat === 'mutton starters') {
    if (has('kheema', 'keema')) return '/kheema_pav.webp';
    return '/mutton_sukka_stitch.webp';
  }

  // --- 4. EGG STARTERS & MAIN COURSE ---
  if (cat.includes('egg starters') || cat.includes('egg main course')) {
    if (has('kadai')) return '/egg_kadai.webp';
    if (has('handi')) return '/egg_handi.webp';
    if (has('makhani', 'makkani')) return '/egg_makhani.webp';
    if (has('biryani')) return '/egg_biryani_stitch.webp';
    return '/egg_kadai.webp';
  }

  // --- 5. VEG STARTERS ---
  if (cat === 'veg starters') {
    if (has('papad')) return '/masala_papad.webp';
    if (has('paneer chilli')) return '/paneer_chilli.webp';
    if (has('paneer manchurian')) return '/paneer_manchurian.webp';
    if (has('paneer')) return '/paneer_cutlet.webp';
    if (has('mushroom chilli')) return '/mushroom_chilli.webp';
    if (has('mushroom manchurian')) return '/mushroom_manchurian.webp';
    if (has('gobi chilli', '65')) return '/gobi_chilli.webp';
    if (has('gobi')) return '/gobi_manchurian.webp';
    if (has('baby corn')) return '/gobi_chilli.webp';
    if (has('fries', 'french fries')) return '/masala_papad.webp';
    return '/gobi_manchurian.webp';
  }

  // --- 6. SOUPS ---
  if (cat.includes('soup')) {
    if (has('mutton')) return '/mutton_soup_real.webp';
    if (has('manchow')) return '/veg_manchow_soup_real.webp';
    if (has('hot', 'sour')) return '/hot_and_sour_soup.webp';
    if (has('chicken')) return '/hot_and_sour_soup.webp';
    return '/veg_manchow_soup.webp';
  }

  // --- 7. VEG MAIN COURSE (Stitch Ultra-HD Dal & Paneer) ---
  if (cat === 'veg main course') {
    if (has('kaju')) return '/kaju_masala.webp';
    if (has('tawa')) return '/paneer_tawa.webp';
    if (has('handi')) return '/paneer_handi.webp';
    if (has('tikka')) return '/paneer_tikka_masala.webp';
    if (has('paneer')) return '/paneer_handi.webp';
    if (has('mushroom')) return '/mushroom_kadai.webp';
    if (has('gobi')) return '/gobi_manchurian.webp';
    return '/dal_tadka_stitch.webp';
  }

  // --- 8. CHICKEN MAIN COURSE & FAMILY PACKS ---
  if (cat === 'chicken main course' || cat === 'chicken family pack') {
    if (has('mumtaz')) return '/chicken_mumtaz_spl.webp';
    if (has('sizzler', 'sizler')) return '/chicken_sizzler.webp';
    if (has('crispy')) return '/chicken_crispy.webp';
    if (has('chilli')) return '/chicken_chilli.webp';
    if (has('manchurian')) return '/chicken_manchurian.webp';
    if (has('shahi', 'shaan')) return '/chicken_biryani_stitch.webp';
    return '/chicken_tikka.webp';
  }

  // --- 9. MUTTON MAIN COURSE & FAMILY PACKS ---
  if (cat === 'mutton main course' || cat === 'mutton family pack') {
    if (has('kheema', 'keema')) return '/kheema_pav.webp';
    if (has('kadai')) return '/mutton_kadai.webp';
    if (has('handi')) return '/mutton_handi.webp';
    if (has('makhani', 'makkani')) return '/mutton_makkhani.webp';
    if (has('rogan', 'roash', 'josh')) return '/mutton_rogan_josh.webp';
    if (has('shahi', 'shaan')) return '/mutton_biryani_stitch.webp';
    return '/mutton_sukka_stitch.webp';
  }

  // --- 10. FISH & SEAFOOD ---
  if (cat.includes('fish') || has('prawns', 'crab', 'fish', 'bangda', 'pomfret', 'surmai', 'dhodi', 'belonji', 'katla')) {
    return '/fish_fry.webp';
  }

  // --- 11. THALIS ---
  if (cat.includes('thali')) {
    if (has('chicken')) return '/chicken_biryani_stitch.webp';
    if (has('mutton')) return '/mutton_biryani_stitch.webp';
    if (has('egg')) return '/egg_biryani_stitch.webp';
    if (has('fish')) return '/fish_fry.webp';
    return '/dal_tadka_stitch.webp';
  }

  // --- 12. ROTI / PARATHA (Stitch Ultra-HD Naan & Roti) ---
  if (cat.includes('roti') || cat.includes('paratha')) {
    if (has('garlic naan', 'cheese naan')) return '/garlic_naan.webp';
    if (has('naan')) return '/butter_naan_stitch.webp';
    if (has('kulcha')) return '/butter_kulcha.webp';
    if (has('tandoori roti')) return '/butter_naan_stitch.webp';
    if (has('butter roti')) return '/butter_roti.webp';
    if (has('chapati')) return '/chapati.webp';
    if (has('parota', 'paratha', 'lachha', 'selone')) return '/butter_parota.webp';
    return '/butter_naan_stitch.webp';
  }

  // --- 13. RICE ---
  if (cat === 'rice') {
    if (has('dal')) return '/dal_tadka.webp';
    return '/veg_pulav.webp';
  }

  // --- 14. VEG FRIED RICE & NOODLES ---
  if (cat === 'veg fried rice & noodles') {
    if (has('noodles')) return '/veg_noodles_real.webp';
    if (has('schezwan')) return '/veg_schezwan_rice.webp';
    return '/veg_fried_rice.webp';
  }

  // --- 15. NOODLES & FRIED RICE (NON-VEG) ---
  if (cat === 'noodles & fried rice (non-veg)') {
    if (has('mutton schezwan')) return '/schezwan_mutton_rice.webp';
    if (has('mutton')) return '/mutton_fried_rice.webp';
    if (has('egg schezwan')) return '/schezwan_egg_rice.webp';
    if (has('egg fried')) return '/egg_fried_rice.webp';
    if (has('mix', 'triple', 'prawns')) return '/triple_schezwan_rice.webp';
    if (has('noodles')) return '/veg_noodles_real.webp';
    if (has('schezwan')) return '/chicken_fried_rice.webp';
    return '/chicken_fried_rice.webp';
  }

  // --- 16. SHAWARMA & ROLLS ---
  if (cat.includes('shawarma') || cat.includes('roll')) {
    if (has('roll')) return '/roll_large.webp';
    return '/shawarma_new.webp';
  }

  // --- 17. RAITA & SALAD ---
  if (cat.includes('salad') || cat.includes('raita')) {
    return '/masala_papad.webp';
  }

  // --- 18. DESSERTS & FALOODA ---
  if (cat.includes('dessert') || cat.includes('falooda')) {
    if (has('mango')) return '/mango_shake_user.webp';
    if (has('strawberry')) return '/strawberry_cake.webp';
    if (has('chocolate')) return '/black_forest_cake.webp';
    if (has('pista', 'butter')) return '/butterscotch_cake.webp';
    return '/white_forest_cake.webp';
  }

  // --- 19. FRUIT DESSERTS & ICECREAMS ---
  if (cat.includes('fruit') || cat.includes('icecream')) {
    if (has('strawberry')) return '/strawberry_cake.webp';
    if (has('mango')) return '/mango_shake_user.webp';
    if (has('butter scotch', 'gadbad')) return '/butterscotch_cake.webp';
    if (has('choco')) return '/black_forest_cake.webp';
    return '/kiwi_cake.webp';
  }

  // --- 20. MILK SHAKES & JUICES ---
  if (cat.includes('shake') || cat.includes('juice')) {
    if (has('butter scotch')) return '/butterscotch_shake_user.webp';
    if (has('vanilla')) return '/vanilla_shake_user.webp';
    if (has('mango')) return '/mango_shake_user.webp';
    if (has('strawberry', 'watermelon', 'pomegranate')) return '/strawberry_mojito.webp';
    if (has('grapes')) return '/blue_curacao.webp';
    return '/mango_shake_user.webp';
  }

  // --- 21. BEVERAGES ---
  if (cat.includes('beverage')) {
    if (has('cold coffee', 'coffee')) return '/cold_coffee.webp';
    if (has('blue cool')) return '/blue_curacao.webp';
    if (has('mojito')) return '/classic_mojito.webp';
    if (has('coke')) return '/coke_range.webp';
    if (has('sprite', 'lemon')) return '/sprite_range.webp';
    if (has('mango')) return '/mango_shake_user.webp';
    return '/classic_mojito.webp';
  }

  // --- 22. PIZZA ---
  if (cat.includes('pizza')) {
    if (has('chicken')) return '/chicken_tikka.webp';
    if (has('paneer')) return '/palak_paneer.webp';
    return '/gobi_manchurian.webp';
  }

  return '/chicken_biryani_new.webp';
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

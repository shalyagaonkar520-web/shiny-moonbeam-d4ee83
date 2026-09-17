export interface AlAminMenuItem {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  isVeg: boolean;
  fires?: number;
  isTopPick?: boolean;
  category: string;
}

export interface AlAminMenuCategory {
  title: string;
  items: AlAminMenuItem[];
}

export const HOTEL_AL_AMIN_MENU: AlAminMenuCategory[] = [
  {
    "title": "Fast Food",
    "items": [
      {
        "id": "alamin-ff-1",
        "name": "Masala Papad",
        "price": 69,
        "image": "/masala_papad.webp",
        "description": "Crispy papad topped with spicy onion, tomato, and masala mix.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Fast Food"
      },
      {
        "id": "alamin-ff-2",
        "name": "Shawarma",
        "price": 99,
        "image": "/shawarma_new.webp",
        "description": "Juicy roasted meat wrapped in soft pita with garlic sauce.",
        "isVeg": false,
        "fires": 2,
        "isTopPick": true,
        "category": "Fast Food"
      },
      {
        "id": "alamin-ff-3",
        "name": "Kheema Pav",
        "price": 40,
        "image": "/kheema_pav.webp",
        "description": "Spicy minced meat served with buttered pav buns.",
        "isVeg": false,
        "fires": 1,
        "isTopPick": false,
        "category": "Fast Food"
      },
      {
        "id": "alamin-ff-4",
        "name": "Samosa",
        "price": 30,
        "image": "/samosa.webp",
        "description": "Crispy golden pastry stuffed with spiced potatoes and peas.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Fast Food"
      },
      {
        "id": "alamin-ff-5",
        "name": "Vada Pav",
        "price": 35,
        "image": "/vada_pav.webp",
        "description": "Iconic Mumbai style spiced potato fritter in fresh pav with chutneys.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Fast Food"
      },
      {
        "id": "alamin-ff-6",
        "name": "Chicken Roll",
        "price": 103,
        "image": "/roll_large.webp",
        "description": "Juicy chicken filling wrapped in soft roti with spicy sauces.",
        "isVeg": false,
        "fires": 1,
        "isTopPick": false,
        "category": "Fast Food"
      },
      {
        "id": "alamin-ff-7",
        "name": "Fried Momos 12 Pc",
        "price": 263,
        "image": "/fried_momos.webp",
        "description": "Crispy fried chicken momos served with fiery chili garlic dip.",
        "isVeg": false,
        "fires": 1,
        "isTopPick": false,
        "category": "Fast Food"
      },
      {
        "id": "alamin-ff-8",
        "name": "Veg Puffs",
        "price": 25,
        "image": "/images/veg-puffs.webp",
        "description": "Flaky baked puff pastry stuffed with spiced vegetables.",
        "isVeg": true,
        "fires": 0,
        "isTopPick": false,
        "category": "Fast Food"
      },
      {
        "id": "alamin-ff-9",
        "name": "Egg Puffs",
        "price": 30,
        "image": "/images/egg-puffs.webp",
        "description": "Freshly baked puff pastry loaded with spiced boiled egg.",
        "isVeg": false,
        "fires": 0,
        "isTopPick": false,
        "category": "Fast Food"
      }
    ]
  },
  {
    "title": "Biryani",
    "items": [
      {
        "id": "alamin-br-1",
        "name": "Kushka",
        "price": 79,
        "image": "/kushka.webp",
        "description": "Aromatic basmati biryani rice cooked in authentic spices without meat.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Biryani"
      },
      {
        "id": "alamin-br-2",
        "name": "Egg Biryani",
        "price": 129,
        "image": "/egg_biryani.webp",
        "description": "Fragrant dum biryani layered with spiced boiled eggs.",
        "isVeg": false,
        "fires": 1,
        "isTopPick": true,
        "category": "Biryani"
      },
      {
        "id": "alamin-br-3",
        "name": "Veg Biryani",
        "price": 139,
        "image": "/veg_biryani.webp",
        "description": "Layered dum biryani loaded with fresh vegetables and fragrant herbs.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Biryani"
      },
      {
        "id": "alamin-br-4",
        "name": "Chicken Biryani Half",
        "price": 109,
        "image": "/chicken_biryani_new.webp",
        "description": "Authentic dum chicken biryani made with long grain basmati rice and secret spices.",
        "isVeg": false,
        "fires": 5,
        "isTopPick": true,
        "category": "Biryani"
      },
      {
        "id": "alamin-br-5",
        "name": "Chicken Biryani Full",
        "price": 159,
        "image": "/chicken_biryani_new.webp",
        "description": "Full portion of tender chicken cooked in rich and fragrant dum biryani.",
        "isVeg": false,
        "fires": 5,
        "isTopPick": true,
        "category": "Biryani"
      },
      {
        "id": "alamin-br-6",
        "name": "Mutton Biryani Half",
        "price": 179,
        "image": "/mutton_biryani.webp",
        "description": "Tender marinated mutton pieces slow-cooked with basmati rice.",
        "isVeg": false,
        "fires": 4,
        "isTopPick": true,
        "category": "Biryani"
      },
      {
        "id": "alamin-br-7",
        "name": "Paneer Biryani",
        "price": 190,
        "image": "/paneer_biryani.webp",
        "description": "Marinated cottage cheese cubes layered in aromatic dum rice.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Biryani"
      },
      {
        "id": "alamin-br-8",
        "name": "Mutton Biryani Full",
        "price": 280,
        "image": "/images/mutton-biryani.webp",
        "description": "Generous serving of slow-cooked tender mutton dum biryani.",
        "isVeg": false,
        "fires": 5,
        "isTopPick": true,
        "category": "Biryani"
      }
    ]
  },
  {
    "title": "Starters",
    "items": [
      {
        "id": "alamin-st-1",
        "name": "Chicken Crispy",
        "price": 220,
        "image": "/chicken_crispy.webp",
        "description": "Crisp fried shredded chicken tossed with mild sweet & spicy sauce.",
        "isVeg": false,
        "fires": 3,
        "isTopPick": true,
        "category": "Starters"
      },
      {
        "id": "alamin-st-2",
        "name": "Chicken 65",
        "price": 200,
        "image": "/chicken_65.webp",
        "description": "Spicy, deep-fried chicken starter infused with curry leaves & green chillies.",
        "isVeg": false,
        "fires": 2,
        "isTopPick": true,
        "category": "Starters"
      },
      {
        "id": "alamin-st-3",
        "name": "Chicken Kabab (12 Pcs)",
        "price": 180,
        "image": "/chicken_kabab.webp",
        "description": "12 pieces of traditional deep-fried chicken kabab marinated in spices.",
        "isVeg": false,
        "fires": 3,
        "isTopPick": true,
        "category": "Starters"
      },
      {
        "id": "alamin-st-4",
        "name": "Chicken Lollipop",
        "price": 209,
        "image": "/chicken_lollipop.webp",
        "description": "Frenched chicken winglets coated in spicy batter and fried crisp.",
        "isVeg": false,
        "fires": 2,
        "isTopPick": false,
        "category": "Starters"
      },
      {
        "id": "alamin-st-5",
        "name": "Chicken Tikka",
        "price": 220,
        "image": "/chicken_tikka.webp",
        "description": "Boneless chicken chunks marinated in yogurt and tandoori spices.",
        "isVeg": false,
        "fires": 1,
        "isTopPick": false,
        "category": "Starters"
      },
      {
        "id": "alamin-st-6",
        "name": "Chicken 65 Chinese",
        "price": 240,
        "image": "/chicken_65_chinese.webp",
        "description": "Indo-Chinese style Chicken 65 tossed in fiery wok sauces.",
        "isVeg": false,
        "fires": 1,
        "isTopPick": false,
        "category": "Starters"
      },
      {
        "id": "alamin-st-7",
        "name": "Chicken Kabab Half (6 Pcs)",
        "price": 119,
        "image": "/chicken_kabab_half.webp",
        "description": "6 pieces of golden spiced chicken kabab.",
        "isVeg": false,
        "fires": 1,
        "isTopPick": false,
        "category": "Starters"
      },
      {
        "id": "alamin-st-8",
        "name": "Fish Fry",
        "price": 199,
        "image": "/fish_fry.webp",
        "description": "Fresh fish marinated in coastal spices and rawa-fried crisp.",
        "isVeg": false,
        "fires": 2,
        "isTopPick": false,
        "category": "Starters"
      },
      {
        "id": "alamin-st-9",
        "name": "Chicken Manchurian",
        "price": 259,
        "image": "/images/chicken-manchurian.webp",
        "description": "Crispy fried chicken balls in rich tangy Indo-Chinese Manchurian sauce.",
        "isVeg": false,
        "fires": 1,
        "isTopPick": false,
        "category": "Starters"
      },
      {
        "id": "alamin-st-10",
        "name": "Chicken Chilli",
        "price": 259,
        "image": "/images/chicken-chilli.webp",
        "description": "Chicken tossed with green chillies, bell peppers, and soy sauce.",
        "isVeg": false,
        "fires": 1,
        "isTopPick": false,
        "category": "Starters"
      },
      {
        "id": "alamin-st-11",
        "name": "Paneer Manchurian",
        "price": 259,
        "image": "/images/paneer-manchurian.webp",
        "description": "Crisp paneer cubes coated in tangy Manchurian glaze.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Starters"
      },
      {
        "id": "alamin-st-12",
        "name": "Paneer Chilli",
        "price": 259,
        "image": "/images/paneer-chilli.webp",
        "description": "Cottage cheese cubes wok-tossed with capsicum, onion, and hot chillies.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Starters"
      },
      {
        "id": "alamin-st-13",
        "name": "Mushroom Manchurian",
        "price": 259,
        "image": "/images/mushroom-manchurian.webp",
        "description": "Fresh button mushrooms fried and tossed in Manchurian sauce.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Starters"
      },
      {
        "id": "alamin-st-14",
        "name": "Mushroom Chilli",
        "price": 259,
        "image": "/images/mushroom-chilli.webp",
        "description": "Batter-coated mushrooms sauteed with spicy green chilies and onions.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Starters"
      }
    ]
  },
  {
    "title": "Rice & Noodles",
    "items": [
      {
        "id": "alamin-rn-1",
        "name": "Veg Noodles",
        "price": 100,
        "image": "/veg_noodles_real.webp",
        "description": "Stir-fried noodles with fresh garden vegetables.",
        "isVeg": true,
        "fires": 2,
        "isTopPick": false,
        "category": "Rice & Noodles"
      },
      {
        "id": "alamin-rn-2",
        "name": "Veg Schezwan Rice",
        "price": 150,
        "image": "/veg_schezwan_rice.webp",
        "description": "Spicy and flavorful rice tossed in Schezwan sauce.",
        "isVeg": true,
        "fires": 3,
        "isTopPick": false,
        "category": "Rice & Noodles"
      },
      {
        "id": "alamin-rn-3",
        "name": "Gobi Manchurian",
        "price": 109,
        "image": "/gobi_manchurian.webp",
        "description": "Crispy cauliflower florets in tangy Manchurian sauce.",
        "isVeg": true,
        "fires": 2,
        "isTopPick": true,
        "category": "Rice & Noodles"
      },
      {
        "id": "alamin-rn-4",
        "name": "Veg Fried Rice",
        "price": 129,
        "image": "/veg_fried_rice.webp",
        "description": "Classic wok-tossed fried rice with chopped veggies.",
        "isVeg": true,
        "fires": 0,
        "isTopPick": false,
        "category": "Rice & Noodles"
      },
      {
        "id": "alamin-rn-5",
        "name": "Egg Fried Rice",
        "price": 129,
        "image": "/egg_fried_rice.webp",
        "description": "Wok-tossed basmati rice with fluffy scrambled eggs.",
        "isVeg": false,
        "fires": 0,
        "isTopPick": false,
        "category": "Rice & Noodles"
      },
      {
        "id": "alamin-rn-6",
        "name": "Chicken Noodles",
        "price": 149,
        "image": "/images/chicken-noodles.webp",
        "description": "Hakka style stir-fried noodles loaded with shredded chicken.",
        "isVeg": false,
        "fires": 1,
        "isTopPick": false,
        "category": "Rice & Noodles"
      },
      {
        "id": "alamin-rn-7",
        "name": "Chicken Fried Rice",
        "price": 149,
        "image": "/chicken_fried_rice.webp",
        "description": "Aromatic fried rice with tender chicken chunks and scallions.",
        "isVeg": false,
        "fires": 1,
        "isTopPick": false,
        "category": "Rice & Noodles"
      },
      {
        "id": "alamin-rn-8",
        "name": "Gobi Chilli",
        "price": 149,
        "image": "/gobi_chilli.webp",
        "description": "Crisp fried cauliflower sauteed with bell peppers and green chillies.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Rice & Noodles"
      },
      {
        "id": "alamin-rn-9",
        "name": "Veg Pulav",
        "price": 159,
        "image": "/veg_pulav.webp",
        "description": "Mildly spiced basmati rice simmered with garden vegetables and whole spices.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Rice & Noodles"
      },
      {
        "id": "alamin-rn-10",
        "name": "Schezwan Egg Rice",
        "price": 159,
        "image": "/schezwan_egg_rice.webp",
        "description": "Fiery Schezwan wok-tossed rice packed with scrambled egg.",
        "isVeg": false,
        "fires": 1,
        "isTopPick": false,
        "category": "Rice & Noodles"
      },
      {
        "id": "alamin-rn-11",
        "name": "Mutton Fried Rice",
        "price": 200,
        "image": "/mutton_fried_rice.webp",
        "description": "Fragrant basmati rice stir-fried with tender mutton chunks and spices.",
        "isVeg": false,
        "fires": 2,
        "isTopPick": true,
        "category": "Rice & Noodles"
      },
      {
        "id": "alamin-rn-12",
        "name": "Schezwan Mutton Rice",
        "price": 240,
        "image": "/schezwan_mutton_rice.webp",
        "description": "Bold Schezwan rice loaded with succulent mutton pieces.",
        "isVeg": false,
        "fires": 3,
        "isTopPick": true,
        "category": "Rice & Noodles"
      },
      {
        "id": "alamin-rn-13",
        "name": "Triple Schezwan Rice",
        "price": 199,
        "image": "/triple_schezwan_rice.webp",
        "description": "Combination of fried rice, crispy fried noodles, and rich spicy gravy.",
        "isVeg": true,
        "fires": 3,
        "isTopPick": false,
        "category": "Rice & Noodles"
      }
    ]
  },
  {
    "title": "Mutton",
    "items": [
      {
        "id": "alamin-mt-1",
        "name": "Mutton Sukka",
        "price": 220,
        "image": "/mutton_sukka.webp",
        "description": "Dry mutton roast coated in roasted coastal spices and grated coconut.",
        "isVeg": false,
        "fires": 3,
        "isTopPick": true,
        "category": "Mutton"
      }
    ]
  },
  {
    "title": "Veg/Gravy",
    "items": [
      {
        "id": "alamin-vg-1",
        "name": "Palak Paneer",
        "price": 200,
        "image": "/palak_paneer.webp",
        "description": "Soft paneer cubes simmered in a smooth, creamy spinach gravy.",
        "isVeg": true,
        "fires": 2,
        "isTopPick": true,
        "category": "Veg/Gravy"
      },
      {
        "id": "alamin-vg-2",
        "name": "Kaju Masala",
        "price": 250,
        "image": "/kaju_masala.webp",
        "description": "Roasted cashews simmered in a rich tomato and onion gravy.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Veg/Gravy"
      },
      {
        "id": "alamin-vg-3",
        "name": "Dal Tadka",
        "price": 150,
        "image": "/dal_tadka.webp",
        "description": "Yellow lentils tempered with ghee, cumin, garlic, and red chillies.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Veg/Gravy"
      }
    ]
  },
  {
    "title": "Roti",
    "items": [
      {
        "id": "alamin-rt-1",
        "name": "4 Chapati",
        "price": 49,
        "image": "/chapati.webp",
        "description": "Soft, homestyle whole wheat flatbreads (4 pcs).",
        "isVeg": true,
        "fires": 0,
        "isTopPick": true,
        "category": "Roti"
      },
      {
        "id": "alamin-rt-2",
        "name": "2 Parota",
        "price": 39,
        "image": "/parota.webp",
        "description": "Flaky, layered Malabar style flatbread (2 pcs).",
        "isVeg": true,
        "fires": 0,
        "isTopPick": true,
        "category": "Roti"
      },
      {
        "id": "alamin-rt-3",
        "name": "Butter Roti",
        "price": 29,
        "image": "/butter_roti.webp",
        "description": "Flaky parota topped with a generous dollop of melting butter.",
        "isVeg": true,
        "fires": 0,
        "isTopPick": true,
        "category": "Roti"
      },
      {
        "id": "alamin-rt-4",
        "name": "2 Tandoori Roti",
        "price": 49,
        "image": "/tandoor_roti_real.webp",
        "description": "Clay oven baked whole wheat tandoori rotis (2 pcs).",
        "isVeg": true,
        "fires": 0,
        "isTopPick": true,
        "category": "Roti"
      },
      {
        "id": "alamin-rt-5",
        "name": "2 Butter Roti",
        "price": 59,
        "image": "/butter_roti.webp",
        "description": "Fresh tandoori rotis brushed with butter (2 pcs).",
        "isVeg": true,
        "fires": 0,
        "isTopPick": false,
        "category": "Roti"
      },
      {
        "id": "alamin-rt-6",
        "name": "Butter Naan",
        "price": 60,
        "image": "/butter_naan.webp",
        "description": "Soft and pillowy tandoor naan brushed with melted butter.",
        "isVeg": true,
        "fires": 0,
        "isTopPick": false,
        "category": "Roti"
      },
      {
        "id": "alamin-rt-7",
        "name": "Garlic Naan",
        "price": 65,
        "image": "/images/garlic-naan.webp",
        "description": "Tandoori naan topped with roasted garlic and butter.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Roti"
      },
      {
        "id": "alamin-rt-8",
        "name": "Butter Kulcha",
        "price": 65,
        "image": "/butter_kulcha.webp",
        "description": "Soft leavened bread baked in the tandoor with butter.",
        "isVeg": true,
        "fires": 0,
        "isTopPick": false,
        "category": "Roti"
      }
    ]
  },
  {
    "title": "Soups",
    "items": [
      {
        "id": "alamin-sp-1",
        "name": "Veg Manchow Soup",
        "price": 130,
        "image": "/images/veg-manchow-soup.webp",
        "description": "Hearty spicy vegetable soup served with crispy noodles.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Soups"
      },
      {
        "id": "alamin-sp-2",
        "name": "Hot and Sour Soup",
        "price": 130,
        "image": "/images/hot-and-sour-soup.webp",
        "description": "Classic Indo-Chinese tangy and spicy vegetable broth.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Soups"
      },
      {
        "id": "alamin-sp-3",
        "name": "Mutton Soup",
        "price": 190,
        "image": "/images/mutton-soup.webp",
        "description": "Slow-simmered rich mutton bone broth with fragrant spices.",
        "isVeg": false,
        "fires": 2,
        "isTopPick": false,
        "category": "Soups"
      }
    ]
  },
  {
    "title": "Drinks",
    "items": [
      {
        "id": "alamin-dr-1",
        "name": "Butterscotch Milkshake",
        "price": 99,
        "image": "/butterscotch_shake_user.webp",
        "description": "Rich butterscotch milkshake with crunchy praline bits.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Drinks"
      },
      {
        "id": "alamin-dr-2",
        "name": "Vanilla Milkshake",
        "price": 99,
        "image": "/vanilla_shake_user.webp",
        "description": "Creamy classic vanilla milkshake made fresh.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Drinks"
      },
      {
        "id": "alamin-dr-3",
        "name": "Mango Milkshake",
        "price": 99,
        "image": "/images/mango-shake.webp",
        "description": "Sweet, tropical Alphonso mango milkshake.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Drinks"
      },
      {
        "id": "alamin-dr-4",
        "name": "Classic Mint Mojito",
        "price": 100,
        "image": "/images/classic-mojito.webp",
        "description": "Refreshing mint, lime, and sparkling soda cooler.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Drinks"
      },
      {
        "id": "alamin-dr-5",
        "name": "Strawberry Mojito",
        "price": 100,
        "image": "/images/strawberry-mojito.webp",
        "description": "Zesty crushed strawberry and mint sparkling drink.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Drinks"
      },
      {
        "id": "alamin-dr-6",
        "name": "Blue Curacao",
        "price": 100,
        "image": "/images/blue-curacao.webp",
        "description": "Vibrant citrus blue lagoon mocktail.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Drinks"
      },
      {
        "id": "alamin-dr-7",
        "name": "Cold Coffee",
        "price": 110,
        "image": "/images/cold-coffee.webp",
        "description": "Rich espresso blended cold with thick creamy milk.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Drinks"
      },
      {
        "id": "alamin-dr-8",
        "name": "Coke 500ml",
        "price": 50,
        "image": "/coke_range.webp",
        "description": "Chilled Coca-Cola 500ml bottle.",
        "isVeg": true,
        "fires": 2,
        "isTopPick": false,
        "category": "Drinks"
      },
      {
        "id": "alamin-dr-9",
        "name": "Sprite 500ml",
        "price": 50,
        "image": "/sprite_range.webp",
        "description": "Chilled refreshing Sprite 500ml bottle.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Drinks"
      }
    ]
  },
  {
    "title": "Ice Cakes",
    "items": [
      {
        "id": "alamin-ck-1",
        "name": "Butterscotch Cake",
        "price": 380,
        "image": "/images/butterscotch-cake.webp",
        "description": "Premium butterscotch crunch cake with rich caramel.",
        "isVeg": true,
        "fires": 2,
        "isTopPick": false,
        "category": "Ice Cakes"
      },
      {
        "id": "alamin-ck-2",
        "name": "Red Velvet Cake",
        "price": 380,
        "image": "/images/red-velvet-cake.webp",
        "description": "Classic red velvet sponge with smooth cream cheese frosting.",
        "isVeg": true,
        "fires": 2,
        "isTopPick": false,
        "category": "Ice Cakes"
      },
      {
        "id": "alamin-ck-3",
        "name": "Black Forest Cake",
        "price": 380,
        "image": "/images/black-forest-cake.webp",
        "description": "Rich chocolate sponge layered with fresh cream and cherries.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Ice Cakes"
      },
      {
        "id": "alamin-ck-4",
        "name": "Strawberry Cake",
        "price": 380,
        "image": "/images/strawberry-cake.webp",
        "description": "Light sponge cake infused with fresh strawberry compote.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Ice Cakes"
      },
      {
        "id": "alamin-ck-5",
        "name": "Kiwi Cake",
        "price": 380,
        "image": "/images/kiwi-cake.webp",
        "description": "Tangy and sweet kiwi glazed fresh cream cake.",
        "isVeg": true,
        "fires": 1,
        "isTopPick": false,
        "category": "Ice Cakes"
      }
    ]
  }
];

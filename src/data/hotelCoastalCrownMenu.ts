// Coastal Crown Hotel - Top 5 Items per Main Course Selection
// Extracted from official Coastal Crown physical menu photos.
// High-resolution photos matched to each authentic dish.

export interface CoastalCrownMenuItem {
  name: string;
  price: number;
  note?: string;
  image?: string;
  isVeg?: boolean;
}

export interface CoastalCrownMenuCategory {
  title: string;
  items: CoastalCrownMenuItem[];
}

function hd(photoId: string) {
  return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=3840`;
}

export const HOTEL_COASTAL_CROWN_MENU: CoastalCrownMenuCategory[] = [
  {
    title: "Coastal Special",
    items: [
      {
        name: "Kundapur Chicken",
        price: 210,
        image: "/menu/kundapur-chicken.webp",
        note: "Traditional coastal style rich chicken curry",
        isVeg: false
      },
      {
        name: "Neer Dosa Chicken Curry",
        price: 170,
        image: "/menu/neer-dosa-chicken-curry.webp",
        note: "Soft Mangalorean rice crepes served with spicy chicken curry",
        isVeg: false
      },
      {
        name: "Kori Roti Chicken Curry",
        price: 170,
        image: "/menu/kori-roti-chicken-curry.webp",
        note: "Crispy thin rice wafers drenched in fragrant chicken gravy",
        isVeg: false
      },
      {
        name: "Neer Dosa",
        price: 70,
        image: "/menu/neer-dosa.webp",
        note: "Delicate and lacy coastal steamed rice crepes",
        isVeg: true
      },
      {
        name: "Kori Roti",
        price: 50,
        image: "/menu/kori-roti.webp",
        note: "Authentic crispy Mangalorean rice wafers",
        isVeg: true
      }
    ]
  },
  {
    title: "Chicken Main Course",
    items: [
      {
        name: "Chicken Coastal Crown Spl",
        price: 330,
        image: "/menu/chicken-coastal-spl.webp",
        note: "Chef's signature coastal special spiced chicken curry",
        isVeg: false
      },
      {
        name: "Butter Chicken",
        price: 250,
        image: "/menu/butter-chicken.webp",
        note: "Tender chicken pieces in rich creamy tomato butter gravy",
        isVeg: false
      },
      {
        name: "Chicken Tikka Masala",
        price: 260,
        image: "/menu/chicken-tikka-masala.webp",
        note: "Smoky tandoor chicken pieces cooked in thick masala gravy",
        isVeg: false
      },
      {
        name: "Chicken Sukka",
        price: 220,
        image: "/menu/chicken-sukka.webp",
        note: "Mangalorean dry chicken roast with grated coconut & spices",
        isVeg: false
      },
      {
        name: "Chicken Kadai",
        price: 240,
        image: "/menu/chicken-kadai.webp",
        note: "Chicken cooked with bell peppers and freshly ground kadai spices",
        isVeg: false
      }
    ]
  },
  {
    title: "Mutton Main Course",
    items: [
      {
        name: "Mutton Sukka",
        price: 290,
        image: "/menu/mutton-sukka.webp",
        note: "Classic slow-roasted tender mutton with coastal spices and coconut",
        isVeg: false
      },
      {
        name: "Mutton Masala",
        price: 270,
        image: "/menu/mutton-masala.webp",
        note: "Rich and spicy mutton curry prepared with aromatic spices",
        isVeg: false
      },
      {
        name: "Mutton Kadai",
        price: 290,
        image: "/menu/mutton-kadai.webp",
        note: "Mutton pieces cooked in thick bell pepper onion gravy",
        isVeg: false
      },
      {
        name: "Mutton Handi",
        price: 290,
        image: "/menu/mutton-handi.webp",
        note: "Clay pot slow-cooked mutton in velvety spiced gravy",
        isVeg: false
      },
      {
        name: "Mutton Makhanwala",
        price: 290,
        image: "/menu/mutton-makhanwala.webp",
        note: "Mutton in rich buttery, creamy sauce",
        isVeg: false
      }
    ]
  },
  {
    title: "Veg Main Course",
    items: [
      {
        name: "Veg Coastal Crown Spl",
        price: 230,
        image: "/menu/veg-coastal-spl.webp",
        note: "House specialty mixed vegetables in luscious coastal gravy",
        isVeg: true
      },
      {
        name: "Paneer Butter Masala",
        price: 200,
        image: "/menu/paneer-butter-masala.webp",
        note: "Soft paneer cubes simmered in buttery makhani gravy",
        isVeg: true
      },
      {
        name: "Kaju Masala",
        price: 210,
        image: "/menu/kaju-masala.webp",
        note: "Roasted cashews cooked in rich and spicy onion-tomato gravy",
        isVeg: true
      },
      {
        name: "Palak Paneer",
        price: 190,
        image: "/menu/palak-paneer.webp",
        note: "Fresh cottage cheese in mildly spiced spinach purée",
        isVeg: true
      },
      {
        name: "Dal Tadka",
        price: 150,
        image: "/menu/dal-tadka.webp",
        note: "Yellow lentils tempered with ghee, cumin, garlic & red chillies",
        isVeg: true
      }
    ]
  },
  {
    title: "Egg Main Course",
    items: [
      {
        name: "Egg Maharaja",
        price: 190,
        image: "/menu/egg-maharaja.webp",
        note: "Royal style boiled eggs in rich royal gravy",
        isVeg: false
      },
      {
        name: "Egg Masala",
        price: 150,
        image: "/menu/egg-masala.webp",
        note: "Boiled eggs cooked in flavorful onion-tomato masala gravy",
        isVeg: false
      },
      {
        name: "Egg Kolhapuri",
        price: 170,
        image: "/menu/egg-kolhapuri.webp",
        note: "Fiery spicy Kolhapuri curry with boiled eggs",
        isVeg: false
      },
      {
        name: "Egg Hyderabadi",
        price: 170,
        image: "/menu/egg-hyderabadi.webp",
        note: "Hyderabadi style green herb egg curry",
        isVeg: false
      },
      {
        name: "Egg Makhanwala",
        price: 170,
        image: "/menu/egg-makhani.webp",
        note: "Eggs simmered in velvety smooth butter tomato gravy",
        isVeg: false
      }
    ]
  },
  {
    title: "Biryani Specials",
    items: [
      {
        name: "Chicken Dum Biriyani",
        price: 200,
        image: "/menu/chicken-dum-biryani.webp",
        note: "Dum cooked aromatic basmati rice layered with spiced chicken",
        isVeg: false
      },
      {
        name: "Chicken Biriyani (Mini)",
        price: 120,
        image: "/menu/chicken-biryani-mini.webp",
        note: "Single serving of flavorful coastal chicken biryani",
        isVeg: false
      },
      {
        name: "Mutton Biriyani",
        price: 260,
        image: "/menu/mutton-biryani.webp",
        note: "Succulent mutton pieces layered with fragrant long-grain rice",
        isVeg: false
      },
      {
        name: "Egg Biriyani",
        price: 170,
        image: "/menu/egg-biryani.webp",
        note: "Fragrant biryani rice served with golden spiced eggs",
        isVeg: false
      },
      {
        name: "Veg Biriyani",
        price: 160,
        image: "/menu/veg-biryani.webp",
        note: "Assorted vegetables cooked with whole spices and basmati rice",
        isVeg: true
      }
    ]
  }
];

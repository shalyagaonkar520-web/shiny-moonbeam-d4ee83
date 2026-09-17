// Kaka's Hotel Malabar - Top 5 Items per Main Course Selection
// Extracted from official Kaka's Hotel Malabar (Family Restaurant Veg & Non Veg, Yellapur) physical menu cards.

export interface MalabarMenuItem {
  name: string;
  price: number;
  note?: string;
  image?: string;
  isVeg?: boolean;
}

export interface MalabarMenuCategory {
  title: string;
  items: MalabarMenuItem[];
}

export const HOTEL_MALABAR_MENU: MalabarMenuCategory[] = [
  {
    title: "Fish Main Course",
    items: [
      {
        name: "Surumai Tawa Masala",
        price: 247,
        image: "/menu/surmai-tawa-masala.webp",
        note: "Fresh Kingfish (Seer) griddled on tawa in signature Malabar coastal spice marinade",
        isVeg: false
      },
      {
        name: "Bangada Tawa Masala",
        price: 245,
        image: "/menu/bangada-tawa-masala.webp",
        note: "Fresh Mackerel shallow-fried on flat tawa with spicy red chili coastal masala",
        isVeg: false
      },
      {
        name: "Prawns Masala",
        price: 147,
        image: "/menu/prawns-masala.webp",
        note: "Plump juicy coastal prawns cooked in rich thick onion-tomato and spice masala",
        isVeg: false
      },
      {
        name: "Paplet Tawa Masala",
        price: 250,
        image: "/menu/paplet-tawa-masala.webp",
        note: "Premium Silver Pomfret seasoned with special coastal tawa spice blend",
        isVeg: false
      },
      {
        name: "Bangada Kari",
        price: 124,
        image: "/menu/bangada-kari.webp",
        note: "Traditional tangy coastal fish curry prepared with kokum and coconut gravy",
        isVeg: false
      }
    ]
  },
  {
    title: "Chicken Main Course",
    items: [
      {
        name: "Malabar Special Chicken Masala",
        price: 420,
        image: "/menu/malabar-chicken-masala.webp",
        note: "Chef's signature dish: slow-cooked succulent chicken in rich royal spiced gravy",
        isVeg: false
      },
      {
        name: "Chicken Handi",
        price: 420,
        image: "/menu/chicken-handi.webp",
        note: "Tender bone-in chicken slow-cooked in a clay handi with rich aromatic gravy",
        isVeg: false
      },
      {
        name: "Chicken Tikka Masala",
        price: 300,
        image: "/menu/chicken-tikka-masala.webp",
        note: "Smoky tandoor-roasted chicken pieces cooked in thick flavorful gravy",
        isVeg: false
      },
      {
        name: "Chicken Kadai",
        price: 320,
        image: "/menu/chicken-kadai.webp",
        note: "Wok-tossed chicken with crunchy bell peppers and freshly ground kadai spices",
        isVeg: false
      },
      {
        name: "Chicken Butter Masala",
        price: 300,
        image: "/menu/chicken-butter-masala.webp",
        note: "Chicken pieces simmered in silky, mildly sweet tomato butter cream sauce",
        isVeg: false
      }
    ]
  },
  {
    title: "Mutton Main Course",
    items: [
      {
        name: "Malabar Special Mutton Masala",
        price: 550,
        image: "/menu/malabar-mutton-masala.webp",
        note: "Signature tender mutton slow-simmered in rich Malabar secret recipe spice gravy",
        isVeg: false
      },
      {
        name: "Mutton Handi",
        price: 550,
        image: "/menu/mutton-handi.webp",
        note: "Rich handi mutton curry prepared with aromatic whole spices and brown gravy",
        isVeg: false
      },
      {
        name: "Mutton Kadai",
        price: 420,
        image: "/menu/mutton-kadai.webp",
        note: "Juicy mutton pieces stir-fried with crushed spices and fresh coriander",
        isVeg: false
      },
      {
        name: "Mutton Kolhapuri",
        price: 360,
        image: "/menu/mutton-kolhapuri.webp",
        note: "Fiery Maharashtrian style mutton curry packed with roasted chili aroma",
        isVeg: false
      },
      {
        name: "Mutton Sukka",
        price: 240,
        image: "/menu/mutton-sukka.webp",
        note: "Semi-dry mutton roast with grated coconut, curry leaves, and coastal pepper",
        isVeg: false
      }
    ]
  },
  {
    title: "Egg Main Course",
    items: [
      {
        name: "Egg Butter Masala",
        price: 240,
        image: "/menu/egg-butter-masala.webp",
        note: "Boiled eggs cooked in buttery, luscious mild tomato cream gravy",
        isVeg: false
      },
      {
        name: "Egg Kolhapuri",
        price: 220,
        image: "/menu/egg-kolhapuri.webp",
        note: "Spicy and pungent boiled egg curry with Kolhapuri chili paste",
        isVeg: false
      },
      {
        name: "Egg Hydrabadi",
        price: 230,
        image: "/menu/egg-hyderabadi.webp",
        note: "Flavorsome egg curry with mint, coriander, and Hyderabadi masalas",
        isVeg: false
      },
      {
        name: "Egg Special Masala",
        price: 120,
        image: "/menu/egg-special-masala.webp",
        note: "House-special egg masala in thick savory onion-tomato gravy",
        isVeg: false
      },
      {
        name: "Egg Kurma",
        price: 130,
        image: "/menu/egg-kurma.webp",
        note: "Subtle and fragrant South Indian style kurma with boiled eggs",
        isVeg: false
      }
    ]
  },
  {
    title: "Veg & Paneer Main Course",
    items: [
      {
        name: "Paneer Kadai",
        price: 300,
        image: "/menu/paneer-kadai.webp",
        note: "Cottage cheese chunks cooked in iron wok with capsicum and roasted spices",
        isVeg: true
      },
      {
        name: "Paneer Tikka Masala",
        price: 280,
        image: "/menu/paneer-tikka-masala.webp",
        note: "Charred paneer cubes in spiced tikka gravy with cream drizzle",
        isVeg: true
      },
      {
        name: "Paneer Butter Masala",
        price: 250,
        image: "/menu/paneer-butter-masala.webp",
        note: "Soft paneer cubes in velvety smooth tomato and cashew butter sauce",
        isVeg: true
      },
      {
        name: "Veg Kadai",
        price: 270,
        image: "/menu/veg-kadai.webp",
        note: "Assorted fresh seasonal vegetables tossed with crushed whole coriander",
        isVeg: true
      },
      {
        name: "Dal Tadaka",
        price: 120,
        image: "/menu/dal-tadka.webp",
        note: "Slow-cooked yellow lentils tempered with hot ghee, cumin seeds, and garlic",
        isVeg: true
      }
    ]
  }
];

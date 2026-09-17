// Hotel Sankalpa - Pure Veg Heritage Feasts, full menu.
// 100 items across 10 categories. Every item is vegetarian.
// Item names and prices are taken from the restaurant's own menu and must not be altered.
// Dish photos are resolved through the centralized map in ./sankalpaMenuImages.

import { SANKALPA_MENU_IMAGES } from './sankalpaMenuImages';

export interface SankalpaMenuItem {
  name: string;
  price: number;
  image?: string;
  note?: string;
  isVeg?: boolean;
}

export interface SankalpaMenuCategory {
  title: string;
  icon: string;
  items: SankalpaMenuItem[];
}

export const HOTEL_SANKALPA_MENU: SankalpaMenuCategory[] = [

  {
    title: 'Veg Main Course',
    icon: '🥘',
    items: [
      {
        name: 'Paneer Handi',
        price: 200,
        image: SANKALPA_MENU_IMAGES['Paneer Handi'],
        isVeg: true
      },
      {
        name: 'Aloo Jeera',
        price: 130,
        image: SANKALPA_MENU_IMAGES['Aloo Jeera'],
        isVeg: true
      },
      {
        name: 'Capsicum Masala',
        price: 150,
        image: SANKALPA_MENU_IMAGES['Capsicum Masala'],
        isVeg: true
      },
      {
        name: 'Gobi Masala',
        price: 140,
        image: SANKALPA_MENU_IMAGES['Gobi Masala'],
        isVeg: true
      },
      {
        name: 'Veg Keema',
        price: 150,
        image: SANKALPA_MENU_IMAGES['Veg Keema'],
        isVeg: true
      },
      {
        name: 'Veg Makkanwala',
        price: 150,
        image: SANKALPA_MENU_IMAGES['Veg Makkanwala'],
        isVeg: true
      },
      {
        name: 'Kaju Kolhapuri',
        price: 220,
        image: SANKALPA_MENU_IMAGES['Kaju Kolhapuri'],
        isVeg: true
      },
      {
        name: 'Mix Veg',
        price: 150,
        image: SANKALPA_MENU_IMAGES['Mix Veg'],
        isVeg: true
      },
      {
        name: 'Veg Kolhapuri',
        price: 150,
        image: SANKALPA_MENU_IMAGES['Veg Kolhapuri'],
        isVeg: true
      },
      {
        name: 'Mushroom Butter Masala',
        price: 200,
        image: SANKALPA_MENU_IMAGES['Mushroom Butter Masala'],
        isVeg: true
      },
      {
        name: 'Tomato Masala',
        price: 130,
        image: SANKALPA_MENU_IMAGES['Tomato Masala'],
        isVeg: true
      },
      {
        name: 'Mushroom Masala',
        price: 200,
        image: SANKALPA_MENU_IMAGES['Mushroom Masala'],
        isVeg: true
      },
      {
        name: 'Veg Kurma',
        price: 150,
        image: SANKALPA_MENU_IMAGES['Veg Kurma'],
        isVeg: true
      },
      {
        name: 'Kaju Masala',
        price: 220,
        image: SANKALPA_MENU_IMAGES['Kaju Masala'],
        isVeg: true
      },
      {
        name: 'Paneer Masala',
        price: 180,
        image: SANKALPA_MENU_IMAGES['Paneer Masala'],
        isVeg: true
      },
      {
        name: 'Paneer Kadai',
        price: 220,
        image: SANKALPA_MENU_IMAGES['Paneer Kadai'],
        isVeg: true
      },
      {
        name: 'Paneer Burji',
        price: 220,
        image: SANKALPA_MENU_IMAGES['Paneer Burji'],
        isVeg: true
      },
      {
        name: 'Kaju Kurma',
        price: 220,
        image: SANKALPA_MENU_IMAGES['Kaju Kurma'],
        isVeg: true
      },
      {
        name: 'Paneer Tikka (Main Course)',
        price: 220,
        image: SANKALPA_MENU_IMAGES['Paneer Tikka (Main Course)'],
        isVeg: true
      },
      {
        name: 'Mushroom Tikka Masala',
        price: 220,
        image: SANKALPA_MENU_IMAGES['Mushroom Tikka Masala'],
        isVeg: true
      },
      {
        name: 'Kaju Paneer Masala',
        price: 220,
        image: SANKALPA_MENU_IMAGES['Kaju Paneer Masala'],
        isVeg: true
      },
      {
        name: 'Paneer Tawa',
        price: 200,
        image: SANKALPA_MENU_IMAGES['Paneer Tawa'],
        isVeg: true
      },
      {
        name: 'Veg Kadai',
        price: 150,
        image: SANKALPA_MENU_IMAGES['Veg Kadai'],
        isVeg: true
      },
      {
        name: 'Paneer Butter Masala',
        price: 200,
        image: SANKALPA_MENU_IMAGES['Paneer Butter Masala'],
        isVeg: true
      },
      {
        name: 'Aloo Gobi Masala',
        price: 140,
        image: SANKALPA_MENU_IMAGES['Aloo Gobi Masala'],
        isVeg: true
      }
    ]
  },
  {
    title: 'Veg Starter',
    icon: '🍢',
    items: [
      {
        name: 'Aloo Pakoda',
        price: 40,
        image: SANKALPA_MENU_IMAGES['Aloo Pakoda'],
        isVeg: true
      },
      {
        name: 'Onion Pakoda',
        price: 50,
        image: SANKALPA_MENU_IMAGES['Onion Pakoda'],
        isVeg: true
      },
      {
        name: 'Babycorn Manchurian',
        price: 130,
        image: SANKALPA_MENU_IMAGES['Babycorn Manchurian'],
        isVeg: true
      },
      {
        name: 'Mushroom Manchurian',
        price: 150,
        image: SANKALPA_MENU_IMAGES['Mushroom Manchurian'],
        isVeg: true
      },
      {
        name: 'Mirchi Bhaji',
        price: 40,
        image: SANKALPA_MENU_IMAGES['Mirchi Bhaji'],
        isVeg: true
      },
      {
        name: 'Roasted Papad',
        price: 25,
        image: SANKALPA_MENU_IMAGES['Roasted Papad'],
        isVeg: true
      },
      {
        name: 'Fried Papad',
        price: 25,
        image: SANKALPA_MENU_IMAGES['Fried Papad'],
        isVeg: true
      },
      {
        name: 'Gobi Manchurian',
        price: 80,
        image: SANKALPA_MENU_IMAGES['Gobi Manchurian'],
        isVeg: true
      },
      {
        name: 'Gobi Chilly',
        price: 100,
        image: SANKALPA_MENU_IMAGES['Gobi Chilly'],
        isVeg: true
      },
      {
        name: 'Paneer Crispy',
        price: 150,
        image: SANKALPA_MENU_IMAGES['Paneer Crispy'],
        isVeg: true
      },
      {
        name: 'Mushroom 65',
        price: 150,
        image: SANKALPA_MENU_IMAGES['Mushroom 65'],
        isVeg: true
      },
      {
        name: 'Masala Papad',
        price: 30,
        image: SANKALPA_MENU_IMAGES['Masala Papad'],
        isVeg: true
      },
      {
        name: 'Mushroom Chilly',
        price: 150,
        image: SANKALPA_MENU_IMAGES['Mushroom Chilly'],
        isVeg: true
      },
      {
        name: 'Paneer Chilly',
        price: 150,
        image: SANKALPA_MENU_IMAGES['Paneer Chilly'],
        isVeg: true
      },
      {
        name: 'Paneer 65',
        price: 150,
        image: SANKALPA_MENU_IMAGES['Paneer 65'],
        isVeg: true
      },
      {
        name: 'Babycorn 65',
        price: 150,
        image: SANKALPA_MENU_IMAGES['Babycorn 65'],
        isVeg: true
      },
      {
        name: 'Babycorn Chilly',
        price: 150,
        image: SANKALPA_MENU_IMAGES['Babycorn Chilly'],
        isVeg: true
      },
      {
        name: 'Finger Chips',
        price: 60,
        image: SANKALPA_MENU_IMAGES['Finger Chips'],
        isVeg: true
      }
    ]
  },
  {
    title: 'Rice Items',
    icon: '🍚',
    items: [
      {
        name: 'Tomato Rice',
        price: 100,
        image: SANKALPA_MENU_IMAGES['Tomato Rice'],
        isVeg: true
      },
      {
        name: 'Jeera Rice',
        price: 90,
        image: SANKALPA_MENU_IMAGES['Jeera Rice'],
        isVeg: true
      },
      {
        name: 'Ghee Rice',
        price: 100,
        image: SANKALPA_MENU_IMAGES['Ghee Rice'],
        isVeg: true
      },
      {
        name: 'Masala Rice',
        price: 100,
        image: SANKALPA_MENU_IMAGES['Masala Rice'],
        isVeg: true
      },
      {
        name: 'Curd Rice',
        price: 100,
        image: SANKALPA_MENU_IMAGES['Curd Rice'],
        isVeg: true
      },
      {
        name: 'Paneer Pulao',
        price: 150,
        image: SANKALPA_MENU_IMAGES['Paneer Pulao'],
        isVeg: true
      },
      {
        name: 'Peas Pulao',
        price: 130,
        image: SANKALPA_MENU_IMAGES['Peas Pulao'],
        isVeg: true
      },
      {
        name: 'Peas Panner Pulav',
        price: 150,
        image: SANKALPA_MENU_IMAGES['Peas Panner Pulav'],
        isVeg: true
      },
      {
        name: 'Veg Biryani',
        price: 110,
        image: SANKALPA_MENU_IMAGES['Veg Biryani'],
        isVeg: true
      },
      {
        name: 'Mushroom Biryani',
        price: 150,
        image: SANKALPA_MENU_IMAGES['Mushroom Biryani'],
        isVeg: true
      },
      {
        name: 'Lemon Rice',
        price: 110,
        image: SANKALPA_MENU_IMAGES['Lemon Rice'],
        isVeg: true
      },
      {
        name: 'Veg Fried Rice',
        price: 130,
        image: SANKALPA_MENU_IMAGES['Veg Fried Rice'],
        isVeg: true
      },
      {
        name: 'Paneer Fried Rice',
        price: 150,
        image: SANKALPA_MENU_IMAGES['Paneer Fried Rice'],
        isVeg: true
      },
      {
        name: 'Mushroom Fried Rice',
        price: 150,
        image: SANKALPA_MENU_IMAGES['Mushroom Fried Rice'],
        isVeg: true
      },
      {
        name: 'Onion Chilli Fried Rice',
        price: 150,
        image: SANKALPA_MENU_IMAGES['Onion Chilli Fried Rice'],
        isVeg: true
      },
      {
        name: 'Daal Khichdi',
        price: 110,
        image: SANKALPA_MENU_IMAGES['Daal Khichdi'],
        isVeg: true
      }
    ]
  },
  {
    title: 'Dosa',
    icon: '🥞',
    items: [
      {
        name: 'Butter Masala Dosa',
        price: 70,
        image: SANKALPA_MENU_IMAGES['Butter Masala Dosa'],
        isVeg: true
      },
      {
        name: 'Plain Dosa',
        price: 50,
        image: SANKALPA_MENU_IMAGES['Plain Dosa'],
        isVeg: true
      },
      {
        name: 'Set Dosa',
        price: 70,
        image: SANKALPA_MENU_IMAGES['Set Dosa'],
        isVeg: true
      },
      {
        name: 'Butter Plain Dosa',
        price: 70,
        image: SANKALPA_MENU_IMAGES['Butter Plain Dosa'],
        isVeg: true
      },
      {
        name: 'Paneer Dosa',
        price: 100,
        image: SANKALPA_MENU_IMAGES['Paneer Dosa'],
        isVeg: true
      },
      {
        name: 'Rava Dosa',
        price: 100,
        image: SANKALPA_MENU_IMAGES['Rava Dosa'],
        isVeg: true
      },
      {
        name: 'Khali Dosa',
        price: 70,
        image: SANKALPA_MENU_IMAGES['Khali Dosa'],
        isVeg: true
      },
      {
        name: 'Uttappa',
        price: 80,
        image: SANKALPA_MENU_IMAGES['Uttappa'],
        isVeg: true
      },
      {
        name: 'Masala Dosa',
        price: 70,
        image: SANKALPA_MENU_IMAGES['Masala Dosa'],
        isVeg: true
      }
    ]
  },
  {
    title: 'South Indian Breakfast',
    icon: '🍛',
    items: [
      {
        name: 'Idli Vada (2+1)',
        price: 70,
        image: SANKALPA_MENU_IMAGES['Idli Vada (2+1)'],
        isVeg: true
      },
      {
        name: 'Buns',
        price: 70,
        image: SANKALPA_MENU_IMAGES['Buns'],
        isVeg: true
      },
      {
        name: 'Shira',
        price: 40,
        image: SANKALPA_MENU_IMAGES['Shira'],
        isVeg: true
      },
      {
        name: 'Upma',
        price: 30,
        image: SANKALPA_MENU_IMAGES['Upma'],
        isVeg: true
      },
      {
        name: 'Idli (2 pcs)',
        price: 40,
        image: SANKALPA_MENU_IMAGES['Idli (2 pcs)'],
        isVeg: true
      },
      {
        name: 'Idli + Vada (1+1)',
        price: 50,
        image: SANKALPA_MENU_IMAGES['Idli + Vada (1+1)'],
        isVeg: true
      },
      {
        name: 'Buns (1 pc)',
        price: 35,
        image: SANKALPA_MENU_IMAGES['Buns (1 pc)'],
        isVeg: true
      },
      {
        name: 'Singal Puri',
        price: 50,
        image: SANKALPA_MENU_IMAGES['Singal Puri'],
        isVeg: true
      },
      {
        name: 'Vada (2 pcs)',
        price: 70,
        image: SANKALPA_MENU_IMAGES['Vada (2 pcs)'],
        isVeg: true
      }
    ]
  },
  {
    title: 'Tandoori',
    icon: '🫓',
    items: [
      {
        name: 'Roti',
        price: 25,
        image: SANKALPA_MENU_IMAGES['Roti'],
        isVeg: true
      },
      {
        name: 'Naan',
        price: 40,
        image: SANKALPA_MENU_IMAGES['Naan'],
        isVeg: true
      },
      {
        name: 'Butter Naan',
        price: 45,
        image: SANKALPA_MENU_IMAGES['Butter Naan'],
        isVeg: true
      },
      {
        name: 'Butter Garlic Naan',
        price: 70,
        image: SANKALPA_MENU_IMAGES['Butter Garlic Naan'],
        isVeg: true
      },
      {
        name: 'Garlic Naan',
        price: 60,
        image: SANKALPA_MENU_IMAGES['Garlic Naan'],
        isVeg: true
      },
      {
        name: 'Aloo Parota',
        price: 60,
        image: SANKALPA_MENU_IMAGES['Aloo Parota'],
        isVeg: true
      },
      {
        name: 'Butter Kulcha',
        price: 40,
        image: SANKALPA_MENU_IMAGES['Butter Kulcha'],
        isVeg: true
      },
      {
        name: 'Butter Parota',
        price: 60,
        image: SANKALPA_MENU_IMAGES['Butter Parota'],
        isVeg: true
      },
      {
        name: 'Masala Roti',
        price: 50,
        image: SANKALPA_MENU_IMAGES['Masala Roti'],
        isVeg: true
      },
      {
        name: 'Tandoori Parota',
        price: 50,
        image: SANKALPA_MENU_IMAGES['Tandoori Parota'],
        isVeg: true
      },
      {
        name: 'Butter Roti',
        price: 30,
        image: SANKALPA_MENU_IMAGES['Butter Roti'],
        isVeg: true
      },
      {
        name: 'Paneer Tikka (Tandoori Counter)',
        price: 220,
        image: SANKALPA_MENU_IMAGES['Paneer Tikka (Tandoori Counter)'],
        isVeg: true
      }
    ]
  },
  {
    title: 'Daal',
    icon: '🍲',
    items: [
      {
        name: 'Daal Butter Fry',
        price: 130,
        image: SANKALPA_MENU_IMAGES['Daal Butter Fry'],
        isVeg: true
      },
      {
        name: 'Daal Kolhapuri',
        price: 130,
        image: SANKALPA_MENU_IMAGES['Daal Kolhapuri'],
        isVeg: true
      },
      {
        name: 'Daal Fry',
        price: 110,
        image: SANKALPA_MENU_IMAGES['Daal Fry'],
        isVeg: true
      },
      {
        name: 'Daal Tadka',
        price: 130,
        image: SANKALPA_MENU_IMAGES['Daal Tadka'],
        isVeg: true
      },
      {
        name: 'Daal Paneer',
        price: 120,
        image: SANKALPA_MENU_IMAGES['Daal Paneer'],
        isVeg: true
      }
    ]
  },
  {
    title: 'Soup',
    icon: '🍜',
    items: [
      {
        name: 'Tomato Soup',
        price: 50,
        image: SANKALPA_MENU_IMAGES['Tomato Soup'],
        isVeg: true
      },
      {
        name: 'Veg Manchow Soup',
        price: 100,
        image: SANKALPA_MENU_IMAGES['Veg Manchow Soup'],
        isVeg: true
      }
    ]
  },
  {
    title: 'Thali',
    icon: '🍽️',
    items: [
      {
        name: 'Rice South Thali',
        price: 100,
        image: SANKALPA_MENU_IMAGES['Rice South Thali'],
        isVeg: true
      },
      {
        name: 'North Thali',
        price: 200,
        image: SANKALPA_MENU_IMAGES['North Thali'],
        isVeg: true
      },
      {
        name: 'South Thali',
        price: 120,
        image: SANKALPA_MENU_IMAGES['South Thali'],
        isVeg: true
      }
    ]
  },
  {
    title: 'Extra',
    icon: '➕',
    items: [
      {
        name: 'Roti + Bhaji',
        price: 60,
        image: SANKALPA_MENU_IMAGES['Roti + Bhaji'],
        isVeg: true
      }
    ]
  }
];

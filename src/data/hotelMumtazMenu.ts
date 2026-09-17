// Hotel Mumtaz - Top 5 Main Course Selection (from official menu PDF).
// 20 selected items across Egg, Chicken, Veg, and Mutton Main Course.
// Each dish uses a real, high-resolution (near-4K, served at 3840px wide) photo
// from Pexels (free-to-use, hotlink-verified) matched to the specific dish.

export interface MumtazMenuItem {
  name: string;
  price: number | null;
  note?: string;
  image?: string;
}

export interface MumtazMenuCategory {
  title: string;
  items: MumtazMenuItem[];
}

// Pexels CDN helper - requests the photo at a very high resolution for crisp,
// near-4K rendering (Pexels serves any width up to the source photo's size).
function hd(photoId: string) {
  return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=3840`;
}

export const HOTEL_MUMTAZ_MENU: MumtazMenuCategory[] = [
  {
    "title": "Egg Main Course",
    "items": [
      {
        "name": "Egg Mumtaz Spl",
        "price": 300,
        "image": "/menu/egg-mumtaz-spl.webp"
      },
      {
        "name": "Egg Kadai",
        "price": 260,
        "image": "/menu/egg-kadai.webp"
      },
      {
        "name": "Egg Handi",
        "price": 260,
        "image": "/menu/egg-handi.webp"
      },
      {
        "name": "Egg Makhani",
        "price": 240,
        "image": "/menu/egg-makhani.webp"
      },
      {
        "name": "Egg Pahadi",
        "price": 240,
        "image": "/menu/egg-pahadi.webp"
      }
    ]
  },
  {
    "title": "Chicken Main Course",
    "items": [
      {
        "name": "Chicken Sizzler",
        "price": 370,
        "image": "/menu/chicken-sizzler.webp"
      },
      {
        "name": "Chicken Mumtaz Spl",
        "price": 340,
        "image": "/menu/chicken-mumtaz-spl.webp"
      },
      {
        "name": "Chicken Kadai",
        "price": 320,
        "image": "/menu/chicken-kadai.webp"
      },
      {
        "name": "Chicken Handi",
        "price": 320,
        "image": "/menu/chicken-handi.webp"
      },
      {
        "name": "Chicken Tikka Masala",
        "price": 320,
        "image": "/menu/chicken-tikka-masala.webp"
      }
    ]
  },
  {
    "title": "Veg Main Course",
    "items": [
      {
        "name": "Veg Mumtaz Spl",
        "price": 300,
        "image": "/menu/veg-mumtaz-spl.webp"
      },
      {
        "name": "Paneer Tikka Masala",
        "price": 300,
        "image": "/menu/paneer-tikka-masala.webp"
      },
      {
        "name": "Paneer Handi",
        "price": 270,
        "image": "/menu/paneer-handi.webp"
      },
      {
        "name": "Paneer Tawa",
        "price": 270,
        "image": "/menu/paneer-tawa.webp"
      },
      {
        "name": "Mushroom Kadai",
        "price": 270,
        "image": "/menu/mushroom-kadai.webp"
      }
    ]
  },
  {
    "title": "Mutton Main Course",
    "items": [
      {
        "name": "Mutton Mumtaz Spl",
        "price": 400,
        "image": "/menu/mutton-mumtaz-spl.webp"
      },
      {
        "name": "Mutton Kadai",
        "price": 380,
        "image": "/menu/mutton-kadai.webp"
      },
      {
        "name": "Mutton Handi",
        "price": 380,
        "image": "/menu/mutton-handi.webp"
      },
      {
        "name": "Mutton Makkhani",
        "price": 380,
        "image": "/menu/mutton-makkhani.webp"
      },
      {
        "name": "Mutton Rogan Josh",
        "price": 370,
        "image": "/menu/mutton-rogan-josh.webp"
      }
    ]
  }
];

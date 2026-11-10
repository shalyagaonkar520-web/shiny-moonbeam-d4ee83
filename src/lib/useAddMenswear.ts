import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCartStore } from '../store/cartStore';
import { useLocationStore } from '../store/locationStore';
import { useMenswearStore, sizeDocId } from '../store/menswearStore';
import { isInYellapur } from './yellapur';
import { MENSWEAR_SHOP_ID, MENSWEAR_SHOP_NAME, MenswearProduct, menswearItemId } from '../data/mensWear';

/**
 * Puts one product in one size into the shared cart (the same cart as food).
 * Returns true when it was added. With `orderNow`, goes straight to checkout.
 */
export function useAddMenswear() {
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const deliveryLocation = useLocationStore((s) => s.deliveryLocation);
  const openLocationPicker = useLocationStore((s) => s.openLocationPicker);

  return (product: MenswearProduct, size: string | null, orderNow: boolean): boolean => {
    if (!isInYellapur(deliveryLocation)) {
      toast.error("Men's wear is delivered only in Yellapur. Change your location to order.");
      openLocationPicker();
      return false;
    }
    if (!size) {
      toast.error('Please select a size');
      return false;
    }
    if (useMenswearStore.getState().docs[sizeDocId(product.name, size)]?.soldOut === true) {
      toast.error(`Size ${size} is sold out`);
      return false;
    }
    addItem({
      id: menswearItemId(product.slug, size),
      hotelId: MENSWEAR_SHOP_ID,
      name: `${product.name} (Size ${size})`,
      price: product.price,
      image: product.images[0],
      category: product.category,
      type: 'fashion',
      description: `${MENSWEAR_SHOP_NAME} ${product.name}, size ${size}`,
    });
    if (orderNow) navigate('/checkout');
    else toast.success(`${product.name} (${size}) added to cart`);
    return true;
  };
}

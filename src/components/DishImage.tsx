import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';

interface DishImageProps {
  /** Path to the dish photo. May be undefined for items that have no image yet. */
  src?: string | null;
  /** Dish name. Used as the alt text, so it must be the real name, not a generic label. */
  alt: string;
  /** Classes for the <img> itself. Defaults to filling its parent without distortion. */
  className?: string;
  /** Load eagerly for anything above the fold (a hero, the first card). Off by default. */
  eager?: boolean;
  /** Natural size hints, so the browser reserves space and the card does not jump. */
  width?: number;
  height?: number;
}

/**
 * One dish photo, rendered the same way everywhere: menu cards, cart, checkout,
 * search results and the admin list.
 *
 * It exists because each of those places had its own bare <img>, so a missing file
 * produced a broken-image icon in some views and nothing in others, and only the
 * hotel menu pages lazy-loaded. Anything that fails to load now collapses to a
 * quiet placeholder instead, which cannot itself 404 because it is drawn in CSS.
 */
export default function DishImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  eager = false,
  width,
  height,
}: DishImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400"
      >
        <UtensilsCrossed className="w-1/3 h-1/3 max-w-8 max-h-8" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      width={width}
      height={height}
      onError={() => setFailed(true)}
    />
  );
}

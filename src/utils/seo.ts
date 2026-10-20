import { useEffect } from 'react';

export function useSEO(title: string, description?: string) {
  useEffect(() => {
    // Append the brand only when the page title does not already carry it.
    // An exact-match check was not enough: pages pass titles like
    // "Mintoo - Food Order", which came out as "Mintoo - Food Order | Mintoo".
    const BRAND = 'Mintoo';
    document.title = title.includes(BRAND) ? title : `${title} | ${BRAND}`;

    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', description);
    }
  }, [title, description]);
}

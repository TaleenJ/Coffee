"use client";

import { useState } from "react";

// Renders a shop photo from a free, open source (OSM `image` / Wikimedia Commons).
// Falls back to a coffee placeholder when there's no image or the fetch fails.
// Uses a plain <img> (not next/image) so arbitrary remote hosts are allowed.
export default function ShopImage({
  src,
  alt,
}: {
  src?: string;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div className="shop-thumb">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="shop-thumb-img"
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="shop-thumb-fallback" aria-hidden="true">
          ☕
        </div>
      )}
    </div>
  );
}

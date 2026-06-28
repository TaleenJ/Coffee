"use client";

import type { KeyboardEvent } from "react";
import { stockImageForId, type FavoriteShop } from "@/lib/coffeeShops";
import { promoTextForShop, shopHasPromo, shopHasVegan } from "@/lib/menu";
import FavoriteStar from "@/components/FavoriteStar";
import ShopImage from "@/components/ShopImage";
import { useShopDetail } from "@/components/ShopDetailProvider";

export default function CoffeeShopCard({ shop }: { shop: FavoriteShop }) {
    const { openShop } = useShopDetail();

    // Real OSM photo wins; otherwise a consistent ambient coffee photo.
    const imageSrc = shop.imageUrl ?? stockImageForId(shop.id);

    const metaParts: string[] = [];
    if (shop.distanceMiles !== undefined) {
        metaParts.push(`${shop.distanceMiles.toFixed(1)} mi`);
    }
    if (shop.rating !== undefined) {
        metaParts.push(`⭐ ${shop.rating.toFixed(1)}`);
    }

    const hasAddress =
        !!shop.address &&
        shop.address.trim() !== "" &&
        shop.address !== "Address unavailable";

    const vegan = shopHasVegan(shop.id);
    const promo = shopHasPromo(shop.id);
    const isChain = shop.isChain === true;

    function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openShop(shop);
        }
    }

    return (
        <article
            className="shop-card"
            role="button"
            tabIndex={0}
            aria-label={`View details for ${shop.name}`}
            onClick={() => openShop(shop)}
            onKeyDown={handleKeyDown}
        >
            <FavoriteStar shop={shop} />
            <div className="shop-card-body">
                <ShopImage src={imageSrc} alt={shop.name} />
                <div className="shop-card-main">
                    <h3 className="shop-name">{shop.name}</h3>
                    {metaParts.length > 0 && (
                        <p className="shop-meta">{metaParts.join(" · ")}</p>
                    )}
                    {hasAddress && <p className="shop-address">{shop.address}</p>}
                    {(vegan || promo || isChain) && (
                        <div className="shop-badges">
                            {isChain && (
                                <span className="shop-badge shop-badge-chain">
                                    🏢 Chain
                                </span>
                            )}
                            {vegan && (
                                <span className="shop-badge shop-badge-vegan">
                                    🌱 Vegan
                                </span>
                            )}
                            {promo && (
                                <span className="shop-badge shop-badge-promo">
                                    🏷 {promoTextForShop(shop.id)}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="shop-vibes">
                {shop.vibes.map((vibe) => (
                    <span key={vibe} className="vibe-tag">
                        {vibe}
                    </span>
                ))}
            </div>
        </article>
    );
}

import type { FavoriteShop } from "@/lib/coffeeShops";
import FavoriteStar from "@/components/FavoriteStar";

export default function CoffeeShopCard({ shop }: { shop: FavoriteShop }) {
    const metaParts: string[] = [];
    if (shop.distanceMiles !== undefined) {
        metaParts.push(`${shop.distanceMiles.toFixed(1)} mi`);
    }
    if (shop.rating !== undefined) {
        metaParts.push(`⭐ ${shop.rating.toFixed(1)}`);
    }

    return (
        <article className="shop-card">
            <FavoriteStar shop={shop} />
            <div className="shop-card-main">
                <h3 className="shop-name">{shop.name}</h3>
                {metaParts.length > 0 && (
                    <p className="shop-meta">{metaParts.join(" · ")}</p>
                )}
                <p className="shop-address">{shop.address}</p>
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

import { CoffeeShop } from "@/lib/coffeeShops";

export default function CoffeeShopCard({ shop }: { shop: CoffeeShop }) {
    return (
        <article className="shop-card">
            <div className="shop-card-main">
                <h3 className="shop-name">{shop.name}</h3>
                <p className="shop-meta">
                    {shop.distanceMiles.toFixed(1)} mi
                    {shop.rating !== undefined && ` · ⭐ ${shop.rating.toFixed(1)}`}
                </p>
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
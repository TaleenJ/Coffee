export type Vibe =
    | "Cozy"
    | "Quiet / Study"
    | "Lively"
    | "Aesthetic"
    | "Outdoor Seating"
    | "Pet Friendly"
    | "Late Night";

export type CoffeeShop = {
    id: string;
    name: string;
    distanceMiles: number;
    rating?: number;
    address: string;
    lat?: number;
    lng?: number;
    vibes: Vibe[];
    imageUrl?: string;
    phone?: string;
    openingHours?: string;
};

// A shop as stored/restored from favorites. Looser than CoffeeShop because
// favorites come from dynamic OSM data (no rating) and are persisted as a
// snapshot. CoffeeShop is structurally assignable to FavoriteShop.
export type FavoriteShop = {
    id: string;
    name: string;
    address: string;
    distanceMiles?: number;
    rating?: number;
    lat?: number;
    lng?: number;
    vibes: string[];
    imageUrl?: string;
    phone?: string;
    openingHours?: string;
};

// Free, ambient coffee photos (Unsplash CDN) used when a shop has no real OSM
// photo. These are NOT the actual shop — just attractive filler so cards look
// good. A shop's real `imageUrl` always takes priority over these.
export const STOCK_SHOP_IMAGES: string[] = [
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=200&q=60",
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=200&q=60",
    "https://images.unsplash.com/photo-1453614512568-c4024d13c247?auto=format&fit=crop&w=200&q=60",
    "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=200&q=60",
    "https://images.unsplash.com/photo-1559496417-e7f25cb247f3?auto=format&fit=crop&w=200&q=60",
    "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=200&q=60",
];

// Deterministic pick so a given shop always shows the same stock photo.
export function stockImageForId(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash * 31 + id.charCodeAt(i)) | 0;
    }
    return STOCK_SHOP_IMAGES[Math.abs(hash) % STOCK_SHOP_IMAGES.length];
}

export const ALL_VIBES: Vibe[] = [
    "Cozy",
    "Quiet / Study",
    "Lively",
    "Aesthetic",
    "Outdoor Seating",
    "Pet Friendly",
    "Late Night",
];

export const coffeeShops: CoffeeShop[] = [
    { id: "1", name: "The Daily Grind", distanceMiles: 0.3, rating: 4.6, address: "120 Maple St", vibes: ["Cozy", "Quiet / Study"] },
    { id: "2", name: "Bloom & Bean", distanceMiles: 0.5, rating: 4.4, address: "88 Garden Ave", vibes: ["Aesthetic", "Outdoor Seating"] },
    { id: "3", name: "Night Owl Coffee", distanceMiles: 0.8, rating: 4.2, address: "45 Pine Rd", vibes: ["Late Night", "Lively"] },
    { id: "4", name: "Roastery Row", distanceMiles: 1.1, rating: 4.7, address: "300 Elm Blvd", vibes: ["Cozy", "Pet Friendly"] },
    { id: "5", name: "Sunlit Cafe", distanceMiles: 1.4, rating: 4.3, address: "12 Birch Ln", vibes: ["Outdoor Seating", "Aesthetic"] },
    { id: "6", name: "The Study Spot", distanceMiles: 1.6, rating: 4.5, address: "77 Oak St", vibes: ["Quiet / Study"] },
    { id: "7", name: "Brew & Co.", distanceMiles: 2.0, rating: 4.1, address: "501 Cedar Ave", vibes: ["Lively", "Pet Friendly"] },
    { id: "8", name: "Hidden Cup", distanceMiles: 2.3, rating: 4.8, address: "9 Hollow Way", vibes: ["Cozy", "Aesthetic", "Quiet / Study"] },
];
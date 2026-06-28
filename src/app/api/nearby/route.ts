type OverpassElement = {
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
};

type OverpassResponse = {
    elements: OverpassElement[];
};

function imageUrlFromTags(tags: Record<string, string> = {}): string | undefined {
    // A direct image URL on the OSM object (upgrade http -> https to avoid
    // mixed-content blocking on our https site).
    const direct = tags.image;
    if (direct && /^https?:\/\//i.test(direct)) {
        return direct.replace(/^http:\/\//i, "https://");
    }

    // A Wikimedia Commons file, e.g. "File:Some Cafe.jpg". Special:FilePath
    // resolves the filename to the actual image and supports a width thumbnail.
    const commons = tags.wikimedia_commons;
    if (commons?.startsWith("File:")) {
        const filename = commons.slice("File:".length);
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
            filename,
        )}?width=600`;
    }

    return undefined;
}

// Known coffee chains (lowercase). We don't exclude these anymore — we just flag
// them so the client can offer a "hide chains" filter. The OSM `brand` tag is the
// strongest signal (chains are brand-tagged); the name list is a fallback.
const CHAIN_KEYWORDS = [
    "starbucks",
    "terria mia",
    "lees coffee",
    "lee's coffee",
    "dunkin",
    "peet's",
    "peets",
    "costa",
    "tim hortons",
    "caribou",
    "philz",
    "blue bottle",
    "the coffee bean",
    "gloria jean",
    "biggby",
];

function isChainShop(tags: Record<string, string> = {}): boolean {
    // A brand / chain reference on the OSM object is a reliable chain signal.
    if (tags.brand || tags["brand:wikidata"]) return true;

    const haystack = [tags.name, tags["brand:en"], tags.operator]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    return CHAIN_KEYWORDS.some((chain) => haystack.includes(chain));
}

// Assemble the best address we can from whatever addr:* tags OSM provides.
// Returns "" when the node has no usable address tags (handled downstream by an
// on-demand reverse-geocode in the detail sheet).
function buildAddress(tags: Record<string, string> = {}): string {
    if (tags["addr:full"]) return tags["addr:full"];

    const street = [tags["addr:housenumber"], tags["addr:street"]]
        .filter(Boolean)
        .join(" ");

    const locality =
        tags["addr:city"] ??
        tags["addr:town"] ??
        tags["addr:village"] ??
        tags["addr:suburb"] ??
        tags["addr:place"] ??
        "";

    const cityState = [locality, tags["addr:state"]].filter(Boolean).join(", ");

    return [street, cityState, tags["addr:postcode"]].filter(Boolean).join(", ");
}

function inferVibes(tags: Record<string, string> = {}): string[] {
    const vibes: string[] = [];

    if (tags.outdoor_seating === "yes") vibes.push("Outdoor Seating");
    if (tags.internet_access && tags.internet_access !== "no") vibes.push("Quiet / Study");
    if (tags.dog === "yes") vibes.push("Pet Friendly");
    if (tags.opening_hours?.includes("24/7")) vibes.push("Late Night");
    if (tags.amenity === "cafe" && !vibes.length) vibes.push("Cozy");

    return vibes.length ? vibes : ["Cozy"];
}

function haversineMiles(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
) {
    const R = 3958.8;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const radiusMiles = Number(searchParams.get("radius") ?? "5");
    const limit = Math.min(
        Math.max(Number(searchParams.get("limit") ?? "30"), 1),
        100,
    );

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
    ) {
        return Response.json({ error: "valid lat and lng are required" }, { status: 400 });
    }

    const radiusMeters = Math.round(radiusMiles * 1609.344);

    const query = `
    [out:json][timeout:25];
    (
      node["amenity"="cafe"](around:${radiusMeters},${lat},${lng});
      way["amenity"="cafe"](around:${radiusMeters},${lat},${lng});
    );
    out center tags;
  `;

    let response: Response;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        response = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            headers: {
                "Content-Type": "text/plain",
                "Accept": "*/*",
                "User-Agent": "MapAhead/1.0 (coffee map demo)",
            },
            body: query,
            next: { revalidate: 3600 },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
    } catch (err) {
        console.error("Overpass fetch threw an error:", err);
        return Response.json(
            { error: "Couldn't reach the Overpass API (network error). See server logs." },
            { status: 502 },
        );
    }

    if (!response.ok) {
        const bodyText = await response.text().catch(() => "<no body>");
        console.error(
            "Overpass API returned an error:",
            response.status,
            response.statusText,
            bodyText.slice(0, 500),
        );
        return Response.json(
            { error: `Overpass API unavailable (status ${response.status})` },
            { status: 502 },
        );
    }

    const data = (await response.json()) as OverpassResponse;

    const shops = data.elements
        .map((el) => {
            const shopLat = el.lat ?? el.center?.lat;
            const shopLng = el.lon ?? el.center?.lon;
            if (shopLat === undefined || shopLng === undefined) return null;

            const tags = el.tags ?? {};

            return {
                id: String(el.id),
                name: tags.name ?? "Unnamed Cafe",
                lat: shopLat,
                lng: shopLng,
                distanceMiles: haversineMiles(lat, lng, shopLat, shopLng),
                address: buildAddress(tags),
                vibes: inferVibes(tags),
                imageUrl: imageUrlFromTags(tags),
                phone: tags.phone ?? tags["contact:phone"] ?? undefined,
                openingHours: tags.opening_hours ?? undefined,
                isChain: isChainShop(tags),
            };
        })
        .filter((shop): shop is NonNullable<typeof shop> => shop !== null)
        .sort((a, b) => a.distanceMiles - b.distanceMiles)
        .slice(0, limit);

    return Response.json({ shops });
}
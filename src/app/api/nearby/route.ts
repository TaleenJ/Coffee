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

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return Response.json({ error: "lat and lng are required" }, { status: 400 });
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

    const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: query,
        next: { revalidate: 3600 },
    });

    if (!response.ok) {
        return Response.json({ error: "Overpass API unavailable" }, { status: 502 });
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
                address: [tags["addr:housenumber"], tags["addr:street"]]
                    .filter(Boolean)
                    .join(" ") || "Address unavailable",
                vibes: inferVibes(tags),
            };
        })
        .filter((shop): shop is NonNullable<typeof shop> => shop !== null)
        .sort((a, b) => a.distanceMiles - b.distanceMiles)
        .slice(0, 30);

    return Response.json({ shops });
}
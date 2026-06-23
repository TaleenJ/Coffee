export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();

  if (!q) {
    return Response.json(
      { error: "Enter a zip code or city name" },
      { status: 400 },
    );
  }

  const isZip = /^\d{5}$/.test(q);

  const url = new URL("https://nominatim.openstreetmap.org/search");
  if (isZip) {
    url.searchParams.set("postalcode", q);
    url.searchParams.set("country", "USA");
  } else {
    url.searchParams.set("q", q);
  }
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "MapAhead/1.0 (coffee map demo)",
      Accept: "application/json",
    },
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    return Response.json({ error: "Geocoding service unavailable" }, { status: 502 });
  }

  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: {
      city?: string;
      town?: string;
      village?: string;
      hamlet?: string;
      postcode?: string;
    };
  }>;

  if (!results.length) {
    return Response.json({ error: `No location found for "${q}"` }, { status: 404 });
  }

  const [place] = results;

  // A short, human label: the zip itself, or the city/town name.
  const locality =
    place.address?.city ??
    place.address?.town ??
    place.address?.village ??
    place.address?.hamlet;
  const label = isZip
    ? q
    : locality ?? place.display_name.split(",")[0]?.trim() ?? q;

  return Response.json({
    lat: Number(place.lat),
    lng: Number(place.lon),
    label,
    displayName: place.display_name,
  });
}

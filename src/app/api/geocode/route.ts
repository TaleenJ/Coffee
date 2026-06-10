export async function GET(request: Request) {
  const zip = new URL(request.url).searchParams.get("zip")?.trim();

  if (!zip || !/^\d{5}$/.test(zip)) {
    return Response.json(
      { error: "Enter a valid 5-digit US zip code" },
      { status: 400 },
    );
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("postalcode", zip);
  url.searchParams.set("country", "USA");
  url.searchParams.set("format", "json");
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
  }>;

  if (!results.length) {
    return Response.json({ error: `No location found for zip ${zip}` }, { status: 404 });
  }

  const [place] = results;

  return Response.json({
    lat: Number(place.lat),
    lng: Number(place.lon),
    displayName: place.display_name,
    zip,
  });
}

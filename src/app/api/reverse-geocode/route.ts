type NominatimAddress = {
  house_number?: string;
  road?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  suburb?: string;
  neighbourhood?: string;
  state?: string;
  postcode?: string;
};

function shortAddress(addr: NominatimAddress, fallback: string): string {
  const street = [addr.house_number, addr.road].filter(Boolean).join(" ");
  const locality =
    addr.city ?? addr.town ?? addr.village ?? addr.suburb ?? addr.hamlet ?? "";
  const cityState = [locality, addr.state].filter(Boolean).join(", ");
  const parts = [street, cityState, addr.postcode].filter(Boolean);
  return parts.join(", ") || fallback;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = params.get("lat");
  const lng = params.get("lng");

  if (!lat || !lng || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
    return Response.json({ error: "Valid lat and lng are required" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lng);
  url.searchParams.set("format", "json");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "MapAhead/1.0 (coffee map demo)",
      Accept: "application/json",
    },
    // Cache reverse lookups for a day; coordinates don't move.
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    return Response.json({ error: "Reverse geocoding unavailable" }, { status: 502 });
  }

  const data = (await response.json()) as {
    address?: NominatimAddress;
    display_name?: string;
  };

  const fallback = data.display_name ?? "";
  const address = data.address ? shortAddress(data.address, fallback) : fallback;

  return Response.json({ address });
}

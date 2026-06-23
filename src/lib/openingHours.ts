// Turns a raw OpenStreetMap `opening_hours` string into readable lines.
//
// OSM uses a compact 24h format, e.g.:
//   "Mo-Fr 08:00-18:00; Sa 09:00-17:00; Su off"
//   "24/7"
//   "Mo-Su 06:30-22:00"
//
// We convert times to am/pm, expand day codes, and split rules onto lines:
//   ["Mon–Fri 8 AM–6 PM", "Sat 9 AM–5 PM", "Sun Closed"]

const DAY_NAMES: Record<string, string> = {
  Mo: "Mon",
  Tu: "Tue",
  We: "Wed",
  Th: "Thu",
  Fr: "Fri",
  Sa: "Sat",
  Su: "Sun",
  PH: "Holidays",
};

function to12Hour(hh: string, mm: string): string {
  let hour = parseInt(hh, 10);
  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return mm === "00" ? `${hour} ${period}` : `${hour}:${mm} ${period}`;
}

export function formatOpeningHours(raw?: string | null): string[] {
  if (!raw) return [];
  let s = raw.trim();
  if (!s) return [];

  // Always-open shorthand.
  if (/^24\s*\/\s*7$/.test(s)) return ["Open 24/7"];

  // 24h time → 12h am/pm (e.g. "08:00" → "8 AM", "18:30" → "6:30 PM").
  s = s.replace(/(\d{1,2}):(\d{2})/g, (_match, hh: string, mm: string) =>
    to12Hour(hh, mm),
  );

  // Expand two-letter day codes ("Mo" → "Mon").
  s = s.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (code) => DAY_NAMES[code] ?? code);

  // "off" → "Closed".
  s = s.replace(/\boff\b/gi, "Closed");

  // Hyphen ranges (days or times) → en dash for readability.
  s = s.replace(/\s*-\s*/g, "–");

  // Space out comma-separated time blocks.
  s = s.replace(/,(?=\S)/g, ", ");

  // Each rule (separated by ";") becomes its own line.
  return s
    .split(";")
    .map((rule) => rule.trim())
    .filter(Boolean);
}

const RESET_HOUR = 6;
const TZ = "America/Montreal";

function montrealNow(): Date {
  const str = new Date().toLocaleString("en-US", { timeZone: TZ });
  return new Date(str);
}

export function getTodayStartUTC(): Date {
  const mtl = montrealNow();
  if (mtl.getHours() < RESET_HOUR) {
    mtl.setDate(mtl.getDate() - 1);
  }
  mtl.setHours(RESET_HOUR, 0, 0, 0);

  const offset = new Date().toLocaleString("en-US", { timeZone: TZ, timeZoneName: "shortOffset" });
  const match = offset.match(/GMT([+-]\d+)/);
  const utcOffset = match ? parseInt(match[1]) : -4;

  const utc = new Date(mtl.getTime() - utcOffset * 60 * 60 * 1000);
  return utc;
}

export function getTodayDateString(): string {
  const mtl = montrealNow();
  if (mtl.getHours() < RESET_HOUR) {
    mtl.setDate(mtl.getDate() - 1);
  }
  return `${mtl.getFullYear()}-${String(mtl.getMonth() + 1).padStart(2, "0")}-${String(mtl.getDate()).padStart(2, "0")}`;
}

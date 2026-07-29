const RESET_HOUR = 6;
const TZ = "America/Montreal";

function getMontrealOffsetMs(): number {
  const now = new Date();
  const utcStr = now.toLocaleString("en-US", { timeZone: "UTC" });
  const mtlStr = now.toLocaleString("en-US", { timeZone: TZ });
  return new Date(utcStr).getTime() - new Date(mtlStr).getTime();
}

export function getTodayStartUTC(): Date {
  const now = new Date();
  const offsetMs = getMontrealOffsetMs();

  const mtl = new Date(now.getTime() - offsetMs);
  const montrealHour = mtl.getUTCHours();

  mtl.setUTCHours(RESET_HOUR, 0, 0, 0);
  if (montrealHour < RESET_HOUR) {
    mtl.setUTCDate(mtl.getUTCDate() - 1);
  }

  return new Date(mtl.getTime() + offsetMs);
}

export function getTodayDateString(): string {
  const now = new Date();
  const offsetMs = getMontrealOffsetMs();

  const mtl = new Date(now.getTime() - offsetMs);
  if (mtl.getUTCHours() < RESET_HOUR) {
    mtl.setUTCDate(mtl.getUTCDate() - 1);
  }

  return `${mtl.getUTCFullYear()}-${String(mtl.getUTCMonth() + 1).padStart(2, "0")}-${String(mtl.getUTCDate()).padStart(2, "0")}`;
}

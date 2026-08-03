const TZ = "America/Montreal";

export interface OpenHours {
  open: number;
  close: number;
  totalHours: number;
}

function getMontrealDate(): { month: number; day: number; dayOfWeek: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const str = fmt.format(new Date());
  const [y, m, d] = str.split("-").map(Number);
  return { month: m, day: d, dayOfWeek: new Date(y, m - 1, d).getDay() };
}

function resolveHours(md: number, dayOfWeek: number): OpenHours | null {
  if (md >= 412 && md <= 518) {
    if (dayOfWeek === 5) return { open: 18, close: 22, totalHours: 4 };
    if (dayOfWeek === 6) return { open: 11, close: 22, totalHours: 11 };
    if (dayOfWeek === 0) return { open: 11, close: 21, totalHours: 10 };
    return null;
  }

  if (md >= 519 && md <= 623) {
    if (dayOfWeek >= 1 && dayOfWeek <= 5) return { open: 18, close: 22, totalHours: 4 };
    return { open: 11, close: 22, totalHours: 11 };
  }

  if (md >= 624 && md <= 828) {
    if (dayOfWeek >= 1 && dayOfWeek <= 5) return { open: 13, close: 22, totalHours: 9 };
    return { open: 11, close: 22, totalHours: 11 };
  }

  if (md >= 829 && md <= 1026) {
    if (dayOfWeek === 5) return { open: 18, close: 22, totalHours: 4 };
    if (dayOfWeek === 6) return { open: 11, close: 22, totalHours: 11 };
    if (dayOfWeek === 0) return { open: 11, close: 21, totalHours: 10 };
    return null;
  }

  return null;
}

export function getOpenHoursForDate(date: Date): OpenHours | null {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = date.getDay();
  return resolveHours(month * 100 + day, dayOfWeek);
}

export function getTodayOpenHours(): OpenHours | null {
  const { month, day, dayOfWeek } = getMontrealDate();
  return resolveHours(month * 100 + day, dayOfWeek);
}

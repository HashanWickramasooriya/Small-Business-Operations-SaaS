export type DatePreset =
  | "today"
  | "yesterday"
  | "last7days"
  | "last30days"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export function resolveDateRange(preset: DatePreset | undefined, from?: string, to?: string) {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (preset) {
    case "today":
      return { gte: startOfDay(now), lte: endOfDay(now) };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { gte: startOfDay(y), lte: endOfDay(y) };
    }
    case "last7days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { gte: startOfDay(start), lte: endOfDay(now) };
    }
    case "last30days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return { gte: startOfDay(start), lte: endOfDay(now) };
    }
    case "thisMonth":
      return { gte: new Date(now.getFullYear(), now.getMonth(), 1), lte: endOfDay(now) };
    case "lastMonth": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { gte: start, lte: end };
    }
    case "custom":
      return {
        gte: from ? startOfDay(new Date(from)) : undefined,
        lte: to ? endOfDay(new Date(to)) : undefined,
      };
    default:
      return { gte: startOfDay(now), lte: endOfDay(now) };
  }
}

export function assertTransition(direction: "in" | "out", hasOpen: boolean) {
  if (direction === "in" && hasOpen) throw new Error("ALREADY_CHECKED_IN");
  if (direction === "out" && !hasOpen) throw new Error("NOT_CHECKED_IN");
}
export function bakuDay(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baku",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

type Point = { latitude: number; longitude: number };
export function distanceMeters(a: Point, b: Point): number {
  const rad = (n: number) => (n * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude),
    dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function assertLocation(
  branch: Point & { radius_m: number },
  point: Point & { accuracy: number },
) {
  if (
    !Number.isFinite(point.latitude) ||
    !Number.isFinite(point.longitude) ||
    Math.abs(point.latitude) > 90 ||
    Math.abs(point.longitude) > 180
  )
    throw new Error("INVALID_LOCATION");
  if (
    !Number.isFinite(point.accuracy) ||
    point.accuracy <= 0 ||
    point.accuracy > Math.min(100, branch.radius_m)
  )
    throw new Error("LOCATION_ACCURACY");
  if (distanceMeters(branch, point) + point.accuracy > branch.radius_m)
    throw new Error("OUTSIDE_BRANCH");
}

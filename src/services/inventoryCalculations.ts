export function computePricePerSqFt(askingPrice: number | undefined, area: number): number | undefined {
  if (askingPrice === undefined || area <= 0) {
    return undefined;
  }
  return Math.round((askingPrice / area) * 100) / 100;
}

export function computeTargetSaleDate(timeframeDays: number, from: Date = new Date()): Date {
  const date = new Date(from);
  date.setUTCDate(date.getUTCDate() + timeframeDays);
  return date;
}

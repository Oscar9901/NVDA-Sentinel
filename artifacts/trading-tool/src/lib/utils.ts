import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number | undefined | null) {
  if (price === undefined || price === null) return "0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatNumber(num: number | undefined | null, decimals = 0) {
  if (num === undefined || num === null) return "0";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatPercent(num: number | undefined | null) {
  if (num === undefined || num === null) return "0.00%";
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(2)}%`;
}

export function formatVolume(volume: number | undefined | null) {
  if (volume === undefined || volume === null) return "0";
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
  return volume.toString();
}

export function getColorClass(val: number | undefined | null) {
  if (val === undefined || val === null) return "";
  if (val > 0) return "text-gain";
  if (val < 0) return "text-loss";
  return "text-muted-foreground";
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: string | number): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value).replace(/\u00A0/g, " ");
}

export function extractDigits(input: string): string {
  return (input ?? "").replace(/[^\d]/g, "");
}

export function digitsToNumber(digits: string): number {
  const normalized = extractDigits(digits);
  if (!normalized) return 0;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function formatDate(value: Date | string | number | null | undefined): string {
  if (value == null) return "-";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(d)
    .replace(/\u00A0/g, " ");
}

export function getImageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  
  const lower = path.toLowerCase();

  if (lower.startsWith("data:")) {
    return path;
  }
  
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("file://") ||
    lower.startsWith("app://") ||
    lower.startsWith("asset://")
  ) {
    return path;
  }

  if (/^[a-zA-Z]:[\\/]/.test(path)) {
    return `file:///${path.replace(/\\/g, "/")}`;
  }
  
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return cleanPath;
}

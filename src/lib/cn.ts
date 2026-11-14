import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Une clases resolviendo conflictos de Tailwind.
 * Solo para clases condicionales: una clase estática va directo en className.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

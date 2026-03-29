import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose class names from the given values and merge Tailwind CSS class conflicts.
 *
 * @param inputs - A variadic list of class values (strings, objects, arrays) to be combined.
 * @returns The resulting className string with Tailwind classes deduplicated and merged.
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Turn the user's business idea into a filename-safe slug.
 *
 * Strips accents, lowercases, collapses non-alphanumeric runs to "-", and
 * caps length at 80 so file managers (and Windows) don't choke. Falls back
 * to a generic name when the input is empty or yields nothing usable.
 */
export function slugifyIdea(idea: string, fallback = 'forge-business-plan'): string {
    const slug = idea
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
    return slug || fallback;
}

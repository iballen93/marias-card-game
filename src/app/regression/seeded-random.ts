/* tslint:disable:no-bitwise */
// Bit operations are the point of these two helpers, so the lint rule against them is off for this file

// A repeatable stand-in for Math.random: the same seed always gives the same numbers (mulberry32)
export function seededRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// A short fingerprint of a string (FNV-1a), so a whole game fits in 8 characters
export function fingerprint(text: string): string {
    let hash = 0x811C9DC5;
    for (let i = 0; i < text.length; i++) {
        hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

// An amount of money as players read it: cents under a dollar ("64¢"), dollars and cents from a dollar up ("$12.80").
// The sign is left to the caller, which knows whether it's a gain or a loss.
export function formatCents(cents: number): string {
    const amount = Math.abs(cents);
    return amount < 100 ? amount + '¢' : '$' + (amount / 100).toFixed(2);
}

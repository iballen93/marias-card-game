import { formatCents } from './money';

describe('formatCents', () => {
  it('should show cents under a dollar, and dollars and cents from a dollar up, leaving the sign to the caller', () => {
    expect(formatCents(64)).toBe('64¢');
    expect(formatCents(-8)).toBe('8¢');
    expect(formatCents(100)).toBe('$1.00');
    expect(formatCents(-1280)).toBe('$12.80');
  });
});

import { describe, expect, it } from 'vitest';
import { linkShareText, newLinkToken, statusPath, statusUrl } from './statusLink';

describe('status links', () => {
  it('makes a 22-character URL-safe token from 16 random bytes', () => {
    expect(newLinkToken((bytes) => bytes.fill(255))).toBe(`${'_'.repeat(21)}w`);
    const a = newLinkToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(newLinkToken()).not.toBe(a);
  });

  it('builds the public address', () => {
    expect(statusPath('abc')).toBe('/s/abc');
    expect(statusUrl('https://darzikhata.example', 'abc')).toBe('https://darzikhata.example/s/abc');
  });

  it('writes the message sent to the customer', () => {
    expect(linkShareText('রহমান টেইলার্স', 'A-0040', 'https://x/s/abc', 'bn')).toBe(
      'রহমান টেইলার্স: অর্ডার A-0040 এর অবস্থা দেখুন: https://x/s/abc',
    );
    expect(linkShareText('Rahman Tailors', 'A-0040', 'https://x/s/abc', 'en')).toBe(
      'Rahman Tailors: see the progress of order A-0040: https://x/s/abc',
    );
  });
});

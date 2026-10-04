import { tokenFromBytes, type Language } from '@darzikhata/domain';
import { translate } from '../../i18n/format';

const TOKEN_BYTES = 16;

/** A new unguessable link token: 16 random bytes, URL-safe. */
export function newLinkToken(fill: (bytes: Uint8Array<ArrayBuffer>) => Uint8Array = (bytes) => crypto.getRandomValues(bytes)): string {
  return tokenFromBytes(fill(new Uint8Array(TOKEN_BYTES)));
}

/** Includes the deploy base path, because the link is also used as a plain `href`. */
export function statusPath(token: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/s/${token}`;
}

export function statusUrl(origin: string, token: string): string {
  return `${origin}${statusPath(token)}`;
}

/** The message the customer receives with the link. */
export function linkShareText(shopName: string, orderNumber: string, url: string, language: Language): string {
  return translate(language, 'link.shareText', { shop: shopName, number: orderNumber, url });
}

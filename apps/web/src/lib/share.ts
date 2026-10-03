export type ShareResult = 'shared' | 'copied' | 'failed';

/** Opens the share sheet when the browser has one, otherwise copies the text. */
export async function shareOrCopy(title: string, text: string): Promise<ShareResult> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text });
    } catch {
      // Closing the share sheet is not a problem.
    }
    return 'shared';
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    // Copying can be blocked by the browser.
    return 'failed';
  }
}

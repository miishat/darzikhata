const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

export type DigitScript = 'bn' | 'en';

/** Replaces Bangla digits (০-৯) with ASCII digits. Everything else is unchanged. */
export function toEnglishDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

/** Replaces ASCII digits with Bangla digits. Everything else is unchanged. */
export function toBanglaDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]!);
}

export function toScript(input: string, script: DigitScript): string {
  return script === 'bn' ? toBanglaDigits(input) : toEnglishDigits(input);
}

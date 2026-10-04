import { toBanglaDigits, toEnglishDigits, toScript, type DigitScript } from './digits';
import type { Label } from './label';

export type Unit = 'inch' | 'cm';
export type MeasurementSource = 'body' | 'sample';

export interface MeasurementField {
  key: string;
  label: Label;
  unit: Unit;
  /** Display group, e.g. "body", "sleeve", "salwar". */
  group: string;
  required: boolean;
}

/** Each saved value carries its own unit, so changing a template unit never reinterprets it. */
export interface MeasurementValue {
  value: number;
  unit: Unit;
}

export interface MeasurementVersion {
  id: string;
  takenAt: string;
  takenBy: string;
  source: MeasurementSource;
  notes: string;
  values: Record<string, MeasurementValue>;
}

export interface MeasurementProfile {
  customerId: string;
  templateId: string;
  versions: MeasurementVersion[];
}

/** A frozen copy of a measurement version stored on an order item. */
export interface MeasurementSnapshot {
  versionId: string;
  takenAt: string;
  source: MeasurementSource;
  values: Record<string, MeasurementValue>;
}

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

const EIGHTHS_TO_UNICODE: Record<number, string> = {
  1: '⅛',
  2: '¼',
  3: '⅜',
  4: '½',
  5: '⅝',
  6: '¾',
  7: '⅞',
};

/**
 * Parses a typed measurement. Accepts Bangla or English digits, decimals ("38.5"),
 * unicode fractions ("৩৮½") and plain fractions ("38 1/2", "38-1/2", "1/2").
 * Returns null for anything else, including zero or negative values.
 */
export function parseMeasurement(input: string): number | null {
  let text = toEnglishDigits(input).trim().replace(/\s+/g, ' ');
  if (!text) return null;

  let value: number | null = null;
  const last = text.slice(-1);
  const unicodeFraction = UNICODE_FRACTIONS[last];
  if (unicodeFraction !== undefined) {
    text = text.slice(0, -1).trim();
    if (text === '') value = unicodeFraction;
    else if (/^\d+$/.test(text)) value = Number(text) + unicodeFraction;
  } else {
    const fraction = /^(?:(\d+)[ -])?(\d+)\/(\d+)$/.exec(text);
    if (fraction) {
      const whole = Number(fraction[1] ?? '0');
      const numerator = Number(fraction[2]);
      const denominator = Number(fraction[3]);
      if (denominator !== 0) value = whole + numerator / denominator;
    } else if (/^\d+(\.\d+)?$/.test(text)) {
      value = Number(text);
    }
  }

  return value !== null && value > 0 ? value : null;
}

/**
 * Formats a measurement. Bangla has no fraction glyphs in its fonts, so Bangla is written as a
 * decimal (38.5 -> "৩৮.৫"); English uses unicode fractions for eighths (38.5 -> "38½").
 */
export function formatMeasurement(value: number, script: DigitScript = 'bn'): string {
  const eighths = Math.round(value * 8);
  const isEighth = Math.abs(value * 8 - eighths) < 1e-9;
  if (script === 'bn') return toBanglaDigits(String(isEighth ? eighths / 8 : Math.round(value * 100) / 100));
  let text: string;
  if (isEighth) {
    const whole = Math.floor(eighths / 8);
    const remainder = eighths % 8;
    const fraction = remainder ? EIGHTHS_TO_UNICODE[remainder]! : '';
    text = whole === 0 && fraction ? fraction : `${whole}${fraction}`;
  } else {
    text = String(Math.round(value * 100) / 100);
  }
  return toScript(text, script);
}

export function profileKey(customerId: string, templateId: string): string {
  return `${customerId}:${templateId}`;
}

/** The most recently recorded version, or null when none exist. */
export function currentVersion(profile: MeasurementProfile): MeasurementVersion | null {
  return profile.versions[profile.versions.length - 1] ?? null;
}

/** Keys of required fields that have no value. */
export function missingRequiredFields(
  fields: MeasurementField[],
  values: Record<string, MeasurementValue>,
): string[] {
  return fields.filter((f) => f.required && values[f.key] === undefined).map((f) => f.key);
}

export function snapshotOf(version: MeasurementVersion): MeasurementSnapshot {
  const values: Record<string, MeasurementValue> = {};
  for (const [key, v] of Object.entries(version.values)) {
    values[key] = { value: v.value, unit: v.unit };
  }
  return { versionId: version.id, takenAt: version.takenAt, source: version.source, values };
}

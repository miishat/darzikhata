import { formatMeasurement, parseMeasurement, parseTaka, toScript, type Language, type Poisha } from '@darzikhata/domain';
import { useState, type ReactNode } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { TextField } from './TextField';

export interface NumberFieldProps {
  label: string;
  /** 'measurement' accepts fractions like ৩৮½; 'money' takes taka and reports poisha. */
  kind: 'measurement' | 'money';
  initialValue?: number | null;
  /** Called with the parsed number, or null when the field is emptied. Not called for unreadable text. */
  onValueChange(value: number | null): void;
  suffix?: ReactNode;
  id?: string;
}

function display(kind: NumberFieldProps['kind'], value: number | null, language: Language): string {
  if (value === null) return '';
  if (kind === 'measurement') return formatMeasurement(value, language);
  const poisha: Poisha = value;
  return toScript(poisha % 100 === 0 ? String(poisha / 100) : (poisha / 100).toFixed(2), language);
}

/** A number input that understands Bangla digits and tailor-style fractions. */
export function NumberField({ label, kind, initialValue = null, onValueChange, suffix, id }: NumberFieldProps) {
  const { language, t } = useI18n();
  const [text, setText] = useState(() => display(kind, initialValue, language));
  const [value, setValue] = useState<number | null>(initialValue);
  const [invalid, setInvalid] = useState(false);
  const parse = kind === 'measurement' ? parseMeasurement : parseTaka;

  const change = (raw: string) => {
    setText(raw);
    if (raw.trim() === '') {
      setInvalid(false);
      setValue(null);
      onValueChange(null);
      return;
    }
    const parsed = parse(raw);
    setInvalid(parsed === null);
    if (parsed !== null) {
      setValue(parsed);
      onValueChange(parsed);
    }
  };

  return (
    <TextField
      id={id}
      label={label}
      inputMode="decimal"
      autoComplete="off"
      value={text}
      suffix={suffix}
      error={invalid ? t(kind === 'measurement' ? 'input.invalidMeasurement' : 'input.invalidMoney') : undefined}
      onChange={(e) => change(e.target.value)}
      onBlur={() => {
        if (!invalid) setText(display(kind, value, language));
      }}
    />
  );
}

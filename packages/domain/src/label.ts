export type Language = 'bn' | 'en';

/** Text that is shown in both supported languages. */
export interface Label {
  bn: string;
  en: string;
}

export function labelIn(label: Label, language: Language): string {
  return label[language] || label.bn || label.en;
}

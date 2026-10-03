import { describe, expect, it } from 'vitest';
import { configProblemText } from './configProblems';

describe('configProblemText', () => {
  it('explains the problems people can cause, once each', () => {
    expect(configProblemText(['no-owner', 'self-inactive'], 'bn')).toBe(
      'স্টাফ সামলাতে পারেন এমন অন্তত একজন সক্রিয় ব্যক্তি লাগবে। নিজেকে নিষ্ক্রিয় করা যাবে না।',
    );
    expect(configProblemText(['invalid-pin:a', 'invalid-pin:b'], 'en')).toBe('A PIN must be 4 digits.');
  });

  it('falls back to a plain could-not-save message', () => {
    expect(configProblemText(['duplicate-series:A'], 'bn')).toBe('সেভ করা যায়নি (duplicate-series:A)');
  });
});

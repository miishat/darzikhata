import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/** Picks an option from a dropdown: the browser's own on a phone, the app's menu on a desktop. */
export async function chooseOption(control: HTMLElement, option: string) {
  if (control instanceof HTMLSelectElement) {
    await userEvent.selectOptions(control, option);
    return;
  }
  await userEvent.click(control);
  await userEvent.click(await screen.findByRole('option', { name: option }));
}

/** The labels of a dropdown's options, opening and closing the app's menu on a desktop. */
export async function optionLabels(control: HTMLElement): Promise<string[]> {
  if (control instanceof HTMLSelectElement) return Array.from(control.options, (o) => o.textContent ?? '');
  await userEvent.click(control);
  const labels = screen.getAllByRole('option').map((o) => o.textContent ?? '');
  await userEvent.click(control);
  return labels;
}

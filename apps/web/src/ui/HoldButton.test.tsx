import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HOLD_MS, HoldButton } from './HoldButton';

describe('HoldButton', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = () => {
    const onConfirm = vi.fn();
    render(<HoldButton label="চেপে ধরে বাদ" holdingLabel="ধরে রাখুন…" accessibleLabel="চেপে ধরে শার্ট ১ বাদ দিন" onConfirm={onConfirm} />);
    return { onConfirm, button: screen.getByRole('button', { name: 'চেপে ধরে শার্ট ১ বাদ দিন' }) };
  };

  it('acts once the press is held for the full time', () => {
    const { onConfirm, button } = setup();
    fireEvent.pointerDown(button);
    act(() => vi.advanceTimersByTime(HOLD_MS - 1));
    expect(onConfirm).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does nothing when let go early, or when only tapped', () => {
    const { onConfirm, button } = setup();
    fireEvent.pointerDown(button);
    act(() => vi.advanceTimersByTime(HOLD_MS / 2));
    fireEvent.pointerUp(button);
    act(() => vi.advanceTimersByTime(HOLD_MS * 2));
    fireEvent.click(button);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cancels when the finger slides off', () => {
    const { onConfirm, button } = setup();
    fireEvent.pointerDown(button);
    fireEvent.pointerLeave(button);
    act(() => vi.advanceTimersByTime(HOLD_MS * 2));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('says to keep holding while pressed', () => {
    const { button } = setup();
    expect(button.textContent).toContain('চেপে ধরে বাদ');
    fireEvent.pointerDown(button);
    expect(button.textContent).toContain('ধরে রাখুন…');
    fireEvent.pointerUp(button);
    expect(button.textContent).toContain('চেপে ধরে বাদ');
  });

  it('can be held with Space or Enter from a keyboard', () => {
    const { onConfirm, button } = setup();
    fireEvent.keyDown(button, { key: ' ' });
    fireEvent.keyUp(button, { key: ' ' });
    act(() => vi.advanceTimersByTime(HOLD_MS * 2));
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.keyDown(button, { key: 'Enter', repeat: true });
    act(() => vi.advanceTimersByTime(HOLD_MS));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

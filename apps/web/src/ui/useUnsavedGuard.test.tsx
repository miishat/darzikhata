import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { createMemoryRouter, Link, Route, RouterProvider, Routes, useNavigate } from 'react-router';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n/I18nProvider';
import { useUnsavedGuard } from './useUnsavedGuard';

function Form() {
  const [text, setText] = useState('');
  const { dialog, allowNextNavigation } = useUnsavedGuard(text !== '');
  const navigate = useNavigate();
  return (
    <>
      <input aria-label="নাম" value={text} onChange={(e) => setText(e.target.value)} />
      <Link to="/elsewhere">অন্য পাতা</Link>
      <button
        type="button"
        onClick={() => {
          allowNextNavigation();
          navigate('/elsewhere');
        }}
      >
        সেভ
      </button>
      {dialog}
    </>
  );
}

function setup() {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <I18nProvider>
            <Routes>
              <Route path="/form" element={<Form />} />
              <Route path="/elsewhere" element={<h1>অন্য পাতা</h1>} />
            </Routes>
          </I18nProvider>
        ),
      },
    ],
    { initialEntries: ['/form'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('useUnsavedGuard', () => {
  it('lets people leave freely when nothing was typed', async () => {
    const router = setup();
    await userEvent.click(screen.getByRole('link', { name: 'অন্য পাতা' }));
    expect(router.state.location.pathname).toBe('/elsewhere');
  });

  it('asks before leaving unsaved changes, and can stay or leave', async () => {
    const router = setup();
    await userEvent.type(screen.getByLabelText('নাম'), 'ক');
    await userEvent.click(screen.getByRole('link', { name: 'অন্য পাতা' }));
    expect(await screen.findByRole('dialog', { name: 'না সেভ করে চলে যাবেন?' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'এখানেই থাকুন' }));
    expect(router.state.location.pathname).toBe('/form');
    expect((screen.getByLabelText('নাম') as HTMLInputElement).value).toBe('ক');

    await userEvent.click(screen.getByRole('link', { name: 'অন্য পাতা' }));
    await userEvent.click(await screen.findByRole('button', { name: 'সেভ না করে যান' }));
    expect(router.state.location.pathname).toBe('/elsewhere');
  });

  it('does not ask when leaving right after a save', async () => {
    const router = setup();
    await userEvent.type(screen.getByLabelText('নাম'), 'ক');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ' }));
    expect(router.state.location.pathname).toBe('/elsewhere');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

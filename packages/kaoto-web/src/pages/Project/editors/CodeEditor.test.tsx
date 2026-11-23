import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockSystemColorScheme } from '../../../test/system-color-scheme';
import { setThemeSetting } from '../../../utils/theme';
import { CodeEditor } from './CodeEditor';

describe('CodeEditor', () => {
  beforeEach(() => {
    mockSystemColorScheme(false);
    document.documentElement.dataset.themeSetting = 'light';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete document.documentElement.dataset.themeSetting;
  });

  it.each([
    ['integrations/orders.camel.yaml', 'yaml'],
    ['integrations/legacy-route.xml', 'xml'],
    ['notes.txt', 'plaintext'],
  ])('opens %s as %s', (path, language) => {
    render(<CodeEditor path={path} initialContent="" onChange={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: 'Code' })).toHaveAttribute('data-language', language);
  });

  it('shows the initial content', () => {
    render(<CodeEditor path="a.json" initialContent='{ "a": 1 }' onChange={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: 'Code' })).toHaveValue('{ "a": 1 }');
  });

  it('reports the edited content', async () => {
    const onChange = vi.fn();
    render(<CodeEditor path="a.txt" initialContent="ab" onChange={onChange} />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Code' }), 'c');

    expect(onChange).toHaveBeenLastCalledWith('abc');
  });

  it.each([
    { themeSetting: 'light', theme: 'vs' },
    { themeSetting: 'dark', theme: 'vs-dark' },
  ])('uses the $theme theme for the $themeSetting setting', ({ themeSetting, theme }) => {
    document.documentElement.dataset.themeSetting = themeSetting;

    render(<CodeEditor path="a.txt" initialContent="" onChange={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: 'Code' })).toHaveAttribute('data-theme', theme);
  });

  it('follows a change of the theme while it is open', () => {
    render(<CodeEditor path="a.txt" initialContent="" onChange={vi.fn()} />);

    act(() => {
      setThemeSetting('dark');
    });

    expect(screen.getByRole('textbox', { name: 'Code' })).toHaveAttribute('data-theme', 'vs-dark');
  });
});

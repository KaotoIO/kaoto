import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TextFileEditor } from './TextFileEditor';

const FILE = { key: 'schema', path: 'resources/schema.json', content: '{}' };

const typeInEditor = (content: string) => {
  fireEvent.change(screen.getByRole('textbox', { name: 'Code' }), { target: { value: content } });
};

describe('TextFileEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the content of the file', () => {
    render(<TextFileEditor file={FILE} onSave={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: 'Code' })).toHaveValue('{}');
  });

  it('saves the edited content once typing pauses', () => {
    const onSave = vi.fn();
    render(<TextFileEditor file={FILE} onSave={onSave} />);

    typeInEditor('{ "a"');
    typeInEditor('{ "a": 1 }');
    vi.advanceTimersByTime(299);
    expect(onSave).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(onSave).toHaveBeenCalledExactlyOnceWith('schema', '{ "a": 1 }');
  });

  it('saves a pending edit right away when it closes', () => {
    const onSave = vi.fn();
    const { unmount } = render(<TextFileEditor file={FILE} onSave={onSave} />);
    typeInEditor('{ "a": 1 }');

    unmount();

    expect(onSave).toHaveBeenCalledExactlyOnceWith('schema', '{ "a": 1 }');
  });
});

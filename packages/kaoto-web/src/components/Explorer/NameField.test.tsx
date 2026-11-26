import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { NameField, NameResult } from './NameField';

describe('NameField', () => {
  const onDone = vi.fn();
  const commit = vi.fn<(path: string) => Promise<void>>();

  /** Accepts any name except an empty one and "taken", and treats the opened name as unchanged */
  const validate = (name: string): NameResult => {
    if (name === 'orders.camel.yaml') return 'unchanged';
    if (!name) return { error: 'Enter a name' };
    if (name === 'taken') return { error: 'That name is taken' };
    return { path: `folder/${name}` };
  };

  beforeEach(() => {
    onDone.mockReset();
    commit.mockReset().mockResolvedValue(undefined);
  });

  const renderField = (initialName = 'orders.camel.yaml') => {
    const result = render(
      <NameField
        id="name-field"
        label="Name"
        initialName={initialName}
        data-testid="name-input"
        validate={validate}
        commit={commit}
        onDone={onDone}
      />,
    );
    return { ...result, input: screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement };
  };

  it('focuses the input and selects the name before its first dot', () => {
    const { input } = renderField();

    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('orders'.length);
  });

  it('selects the whole name when it has no dot after its first character', () => {
    const { input } = renderField('.hidden');

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('.hidden'.length);
  });

  it('commits the path on Enter and reports it by keyboard', async () => {
    const user = userEvent.setup();
    const { input } = renderField();

    await user.clear(input);
    await user.keyboard('invoices{Enter}');

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledWith(true);
    });
    expect(commit).toHaveBeenCalledWith('folder/invoices');
  });

  it('commits the path when the input loses the focus and reports it as not by keyboard', async () => {
    const user = userEvent.setup();
    const { input } = renderField();

    await user.clear(input);
    await user.keyboard('invoices');
    act(() => {
      input.blur();
    });

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledWith(false);
    });
    expect(commit).toHaveBeenCalledWith('folder/invoices');
  });

  it('closes without committing when the name is unchanged', async () => {
    const user = userEvent.setup();
    renderField();

    await user.keyboard('{Enter}');

    expect(onDone).toHaveBeenCalledWith(true);
    expect(commit).not.toHaveBeenCalled();
  });

  it('cancels on Escape without committing', async () => {
    const user = userEvent.setup();
    renderField();

    await user.keyboard('invoices{Escape}');

    expect(onDone).toHaveBeenCalledWith(true);
    expect(commit).not.toHaveBeenCalled();
  });

  it('does not show the error of an empty name until Enter is pressed', async () => {
    const user = userEvent.setup();
    renderField('');

    expect(screen.queryByText('Enter a name')).not.toBeInTheDocument();

    await user.keyboard('{Enter}');

    expect(screen.getByText('Enter a name')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('shows the error once the name was changed', async () => {
    const user = userEvent.setup();
    const { input } = renderField();

    await user.clear(input);
    await user.keyboard('taken');

    expect(screen.getByText('That name is taken')).toBeInTheDocument();
  });

  it('keeps the input open with the error on Enter, and gives up when the input loses the focus', async () => {
    const user = userEvent.setup();
    const { input } = renderField();

    await user.clear(input);
    await user.keyboard('taken{Enter}');

    expect(screen.getByText('That name is taken')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();

    act(() => {
      input.blur();
    });

    expect(onDone).toHaveBeenCalledWith(false);
    expect(commit).not.toHaveBeenCalled();
  });

  it('shows a failed commit and stays open, so the name can be changed', async () => {
    commit.mockRejectedValueOnce(new Error('The storage is blocked'));
    const user = userEvent.setup();
    const { input } = renderField();

    await user.clear(input);
    await user.keyboard('invoices{Enter}');

    expect(await screen.findByText('The storage is blocked')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    expect(input).not.toHaveAttribute('readonly');
  });

  it('clears a failed commit once the name changes', async () => {
    commit.mockRejectedValueOnce(new Error('The storage is blocked'));
    const user = userEvent.setup();
    const { input } = renderField();

    await user.clear(input);
    await user.keyboard('invoices{Enter}');
    await screen.findByText('The storage is blocked');
    await user.keyboard('2');

    expect(screen.queryByText('The storage is blocked')).not.toBeInTheDocument();
  });

  it('is read-only and ignores Escape while it commits', async () => {
    let release: () => void = () => undefined;
    commit.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const user = userEvent.setup();
    const { input } = renderField();

    await user.clear(input);
    await user.keyboard('invoices{Enter}');
    expect(input).toHaveAttribute('readonly');

    await user.keyboard('{Escape}');
    expect(onDone).not.toHaveBeenCalled();

    await act(async () => {
      release();
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith(true);
  });

  it('commits once when the input loses the focus right after Enter', async () => {
    const user = userEvent.setup();
    const { input } = renderField();

    await user.clear(input);
    await user.keyboard('invoices{Enter}');
    act(() => {
      input.blur();
    });

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledTimes(1);
    });
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('reports a commit that finishes after the field was unmounted, e.g. when its row left the rendered rows', async () => {
    let release: () => void = () => undefined;
    commit.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const user = userEvent.setup();
    const { input, unmount } = renderField();

    await user.clear(input);
    await user.keyboard('invoices{Enter}');
    unmount();
    await act(async () => {
      release();
    });

    expect(onDone).toHaveBeenCalledWith(true);
  });

  it('leaves Enter and Escape to an IME composition', () => {
    const { input } = renderField();

    fireEvent.change(input, { target: { value: 'invoices' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(input, { key: 'Escape', isComposing: true });

    expect(onDone).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it('keeps clicks and keys from reaching the tree item around it', () => {
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div onClick={onClick} onKeyDown={onKeyDown}>
        <NameField id="name-field" label="Name" initialName="" validate={validate} commit={commit} onDone={onDone} />
      </div>,
    );
    const input = screen.getByRole('textbox', { name: 'Name' });

    fireEvent.click(input);
    fireEvent.keyDown(input, { key: 'a' });

    expect(onClick).not.toHaveBeenCalled();
    expect(onKeyDown).not.toHaveBeenCalled();
  });
});

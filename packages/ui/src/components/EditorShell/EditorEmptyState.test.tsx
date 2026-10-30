import { fireEvent, render, screen } from '@testing-library/react';

import { EditorEmptyState } from './EditorEmptyState';

describe('EditorEmptyState', () => {
  it('tells that nothing is defined and invites to create items when the list is empty', () => {
    render(<EditorEmptyState hasItems={false} singular="bean" plural="beans" />);

    const emptyState = screen.getByTestId('editor-empty-state');
    expect(emptyState).toHaveTextContent('There are no beans defined');
    expect(emptyState).toHaveTextContent('Start creating some beans here');
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'not found');
  });

  it('tells that nothing is selected and asks to select an item when the list has items', () => {
    render(<EditorEmptyState hasItems singular="bean" plural="beans" />);

    const emptyState = screen.getByTestId('editor-empty-state');
    expect(emptyState).toHaveTextContent('There are no beans selected');
    expect(emptyState).toHaveTextContent('Select a bean to show its properties');
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'no data');
  });

  it('uses "an" for nouns starting with a vowel', () => {
    render(<EditorEmptyState hasItems singular="entity" plural="entities" />);

    expect(screen.getByTestId('editor-empty-state')).toHaveTextContent('Select an entity to show its properties');
  });

  it('uses the provided names and test id', () => {
    render(<EditorEmptyState hasItems={false} singular="entity" plural="entities" data-testid="custom" />);

    expect(screen.getByTestId('custom')).toHaveTextContent('There are no entities defined');
  });

  it('renders a button to show the first item only when the list has items and a handler is provided', () => {
    const onSelectFirst = vi.fn();
    const { rerender } = render(
      <EditorEmptyState hasItems singular="bean" plural="beans" onSelectFirst={onSelectFirst} />,
    );

    fireEvent.click(screen.getByTestId('editor-empty-state-select-first-btn'));
    expect(screen.getByRole('button', { name: 'Show first bean' })).toBeInTheDocument();
    expect(onSelectFirst).toHaveBeenCalledOnce();

    rerender(<EditorEmptyState hasItems={false} singular="bean" plural="beans" onSelectFirst={onSelectFirst} />);
    expect(screen.queryByTestId('editor-empty-state-select-first-btn')).not.toBeInTheDocument();

    rerender(<EditorEmptyState hasItems singular="bean" plural="beans" />);
    expect(screen.queryByTestId('editor-empty-state-select-first-btn')).not.toBeInTheDocument();
  });

  it('renders the actions only when the list is empty', () => {
    const { rerender } = render(
      <EditorEmptyState hasItems={false} singular="bean" plural="beans">
        <button>Add</button>
      </EditorEmptyState>,
    );
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();

    rerender(
      <EditorEmptyState hasItems singular="bean" plural="beans">
        <button>Add</button>
      </EditorEmptyState>,
    );
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument();
  });
});

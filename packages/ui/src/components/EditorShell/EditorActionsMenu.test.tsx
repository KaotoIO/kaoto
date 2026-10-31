import { MenuItem } from '@carbon/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';

import { EditorActionsMenu } from './EditorActionsMenu';

describe('EditorActionsMenu', () => {
  it('renders an "Actions" button that opens a menu with the given items', () => {
    const onClick = vi.fn();
    render(
      <EditorActionsMenu>
        <MenuItem label="Do something" onClick={onClick} />
      </EditorActionsMenu>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    fireEvent.click(screen.getByText('Do something'));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies the data-testid to the menu button container', () => {
    render(
      <EditorActionsMenu data-testid="my-toolbar-menu">
        <MenuItem label="Do something" />
      </EditorActionsMenu>,
    );

    const container = screen.getByTestId('my-toolbar-menu');
    expect(container.querySelector('button')).toHaveTextContent('Actions');
  });

  it('forwards the ref to the menu button container', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <EditorActionsMenu ref={ref}>
        <MenuItem label="Do something" />
      </EditorActionsMenu>,
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.querySelector('button')).toHaveTextContent('Actions');
  });
});

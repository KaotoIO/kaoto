import { TrashCan } from '@carbon/icons-react';
import { fireEvent, render, screen } from '@testing-library/react';

import { EntryActionButton } from './EntryActionButton';

describe('EntryActionButton', () => {
  const renderButton = (onClick = vi.fn(), onParentClick = vi.fn()) => {
    render(
      // The row around the button, which would select the file or toggle the folder
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div onClick={onParentClick}>
        <EntryActionButton label="Delete file" testId="explorer-delete-a" icon={TrashCan} onClick={onClick} />
      </div>,
    );
    return { button: screen.getByTestId('explorer-delete-a'), onClick, onParentClick };
  };

  it('shows its label as a Carbon tooltip on hover and stays out of the tab order', async () => {
    const { button } = renderButton();

    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('tabindex', '-1');
    expect(button.querySelector('svg')).toBeInTheDocument();

    fireEvent.mouseEnter(button);

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Delete file');
    expect(button).toHaveAttribute('aria-labelledby', screen.getByRole('tooltip').id);
  });

  it('runs its action on click without selecting or toggling the entry around it', () => {
    const { button, onClick, onParentClick } = renderButton();

    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onParentClick).not.toHaveBeenCalled();
  });
});

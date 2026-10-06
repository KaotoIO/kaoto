import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { OverlayInteraction } from './OverlayInteraction';

vi.unmock('@patternfly/react-icons');

it('closes a menu when another isolated overlay is clicked', async () => {
  const user = userEvent.setup();
  const interaction = { accessibleLabel: 'First', contextMenu: [{ id: 'inspect', label: 'Inspect', enabled: true }] };
  render(
    <>
      <OverlayInteraction interaction={interaction} className="" onAction={vi.fn()}>
        One
      </OverlayInteraction>
      <OverlayInteraction interaction={{ ...interaction, accessibleLabel: 'Second' }} className="" onAction={vi.fn()}>
        Two
      </OverlayInteraction>
    </>,
  );
  await user.click(screen.getByRole('button', { name: 'First' }));
  await user.click(screen.getByRole('button', { name: 'Second' }));
  await waitFor(() => {
    expect(screen.getAllByRole('menu')).toHaveLength(1);
  });
  expect(screen.getByRole('button', { name: 'First' })).toHaveAttribute('aria-expanded', 'false');
});

it('dismisses a focused tooltip with Escape without moving focus', async () => {
  const user = userEvent.setup();
  render(
    <OverlayInteraction interaction={{ accessibleLabel: 'Detail', tooltip: 'Supplementary information' }} className="">
      Info
    </OverlayInteraction>,
  );
  await user.tab();
  expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  expect(screen.getByLabelText('Detail')).toHaveFocus();
});

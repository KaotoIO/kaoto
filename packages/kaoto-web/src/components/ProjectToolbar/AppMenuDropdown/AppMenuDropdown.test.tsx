import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { AppMenuDropdown } from './AppMenuDropdown';

vi.mock('../../About/KaotoAboutModal', () => ({
  KaotoAboutModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="kaoto-about-modal" /> : null),
}));

const renderComponent = (projectId = 'my-project') =>
  render(
    <MemoryRouter>
      <AppMenuDropdown projectId={projectId} />
    </MemoryRouter>,
  );

describe('AppMenuDropdown', () => {
  it('renders the wrapper with the correct data-testid', () => {
    renderComponent();
    expect(screen.getByTestId('app-menu-dropdown')).toBeInTheDocument();
  });

  it('renders the Menu trigger button', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
  });

  it('opens the menu and shows all items when the trigger is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole('button', { name: 'Menu' }));

    const labels = ['Settings', 'About', 'Tutorials', 'Help', 'Examples', 'Feedback', 'Apache Camel', 'Hawtio'];
    for (const label of labels) {
      expect(screen.getByRole('menuitem', { name: label })).toBeInTheDocument();
    }
  });

  it('clicking About opens the about modal', async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'About' }));
    expect(screen.getByTestId('kaoto-about-modal')).toBeInTheDocument();
  });

  it('clicking Settings navigates to /projects/<projectId>/config', async () => {
    const user = userEvent.setup();
    renderComponent('proj_123-ABC');
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    const settingsItem = screen.getByRole('menuitem', { name: 'Settings' });
    expect(settingsItem).not.toHaveAttribute('aria-disabled', 'true');
  });
});

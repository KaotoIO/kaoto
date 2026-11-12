import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { AppMenuDropdown } from './AppMenuDropdown';

const LocationDisplay = () => <div data-testid="location">{useLocation().pathname}</div>;

const renderComponent = (projectId = 'my-project') =>
  render(
    <MemoryRouter>
      <AppMenuDropdown projectId={projectId} />
      <LocationDisplay />
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

  it('closes the about modal when it is dismissed', async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'About' }));
    expect(screen.getByTestId('kaoto-about-modal')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(screen.queryByTestId('kaoto-about-modal')).not.toBeInTheDocument();
  });

  it('clicking Settings navigates to /projects/<projectId>/config', async () => {
    const user = userEvent.setup();
    renderComponent('proj_123-ABC');
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    const settingsItem = screen.getByRole('menuitem', { name: 'Settings' });
    expect(settingsItem).not.toHaveAttribute('aria-disabled', 'true');

    await user.click(settingsItem);
    expect(screen.getByTestId('location')).toHaveTextContent('/projects/proj_123-ABC/config');
  });

  it.each([
    ['Tutorials', 'https://kaoto.io/workshop/'],
    ['Help', 'https://kaoto.io/docs/'],
    ['Examples', 'https://github.com/KaotoIO/kaoto-examples'],
    ['Feedback', 'https://github.com/KaotoIO/kaoto/issues/new/choose'],
    ['Apache Camel', 'https://camel.apache.org/camel-core/getting-started/index.html'],
    ['Hawtio', 'https://hawt.io/docs/get-started.html'],
  ])('clicking %s opens %s in a new tab', async (label, url) => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(screen.getByRole('menuitem', { name: label }));

    expect(openSpy).toHaveBeenCalledWith(url, '_blank', 'noopener,noreferrer');
  });
});

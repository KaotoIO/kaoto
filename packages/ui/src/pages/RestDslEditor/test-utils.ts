import { fireEvent, screen } from '@testing-library/react';

/**
 * Opens the Actions menu and clicks a specific action item.
 * Useful for testing RestTreeToolbar and RestDslEditorPage.
 *
 * @param actionName - The visible text of the action (e.g., 'Add Configuration', 'Add Service', 'Add Operation', 'Delete')
 * @example
 * ```typescript
 * await clickToolbarActionUtil('Add Configuration');
 * await clickToolbarActionUtil('Add Service');
 * await clickToolbarActionUtil('Delete');
 * ```
 */
export const clickToolbarActionUtil = async (actionName: string): Promise<void> => {
  const [menuButton] = screen.queryAllByRole('button', { name: 'Actions' });
  if (!menuButton) {
    throw new Error('Actions menu button not found');
  }
  fireEvent.click(menuButton);

  // Carbon renders the menu item during the click; a findBy query waits for an unnecessary timer here.
  const actionLi = screen.queryByText(actionName)?.closest('li');
  if (!actionLi) {
    throw new Error(`Action "${actionName}" not found in the Actions menu`);
  }
  fireEvent.click(actionLi as HTMLElement);
};

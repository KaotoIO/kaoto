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
  const menuButton = screen.getAllByRole('button', { name: 'Actions' })[0];
  fireEvent.click(menuButton);

  const actionButton = await screen.findByText(actionName);
  const actionLi = actionButton.closest('li');
  if (!actionLi) {
    throw new Error(`Action "${actionName}" not found in the Actions menu`);
  }
  fireEvent.click(actionLi as HTMLElement);
};

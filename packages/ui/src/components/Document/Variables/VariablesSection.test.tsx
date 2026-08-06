import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { MappingLinksProvider } from '../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { ExpansionPanels } from '../../ExpansionPanels/ExpansionPanels';
import { VariablesSection } from './VariablesSection';

describe('VariablesSection', () => {
  const renderVariablesSection = (isReadOnly = false) => {
    return render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <ExpansionPanels>
            <VariablesSection isReadOnly={isReadOnly} />
          </ExpansionPanels>
        </MappingLinksProvider>
      </DataMapperProvider>,
    );
  };

  describe('Add global variable', () => {
    it('should show variable input when add button is clicked', async () => {
      renderVariablesSection();

      const addButton = await screen.findByTestId('add-variable-button');
      fireEvent.click(addButton);

      expect(screen.getByTestId('new-variable-name-input')).toBeInTheDocument();
    });

    it('should add a variable and hide input on submit', async () => {
      renderVariablesSection();

      const addButton = await screen.findByTestId('add-variable-button');
      fireEvent.click(addButton);

      const input = screen.getByTestId('new-variable-name-input');
      fireEvent.change(input, { target: { value: 'myVar' } });

      const submitButton = screen.getByTestId('new-variable-submit-btn');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByTestId('new-variable-name-input')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('variable-row-myVar')).toBeInTheDocument();
    });

    it('should hide input on cancel', async () => {
      renderVariablesSection();

      const addButton = await screen.findByTestId('add-variable-button');
      fireEvent.click(addButton);

      expect(screen.getByTestId('new-variable-name-input')).toBeInTheDocument();

      const cancelButton = screen.getByTestId('new-variable-cancel-btn');
      fireEvent.click(cancelButton);

      expect(screen.queryByTestId('new-variable-name-input')).not.toBeInTheDocument();
    });

    it('should not show add button in read-only mode', () => {
      renderVariablesSection(true);

      expect(screen.queryByTestId('add-variable-button')).not.toBeInTheDocument();
    });
  });

  describe('Toggle hide/show all variables', () => {
    it('should hide variables when toggle button is clicked', async () => {
      renderVariablesSection();

      // Add a variable first
      const addButton = await screen.findByTestId('add-variable-button');
      fireEvent.click(addButton);

      const input = screen.getByTestId('new-variable-name-input');
      fireEvent.change(input, { target: { value: 'testVar' } });
      fireEvent.click(screen.getByTestId('new-variable-submit-btn'));

      await screen.findByTestId('variable-row-testVar');

      // Hide variables
      const toggleButton = screen.getByTestId('toggle-variables-button');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.queryByTestId('variable-row-testVar')).not.toBeInTheDocument();
      });
    });

    it('should show variables again when toggle is clicked twice', async () => {
      renderVariablesSection();

      // Add a variable
      const addButton = await screen.findByTestId('add-variable-button');
      fireEvent.click(addButton);

      const input = screen.getByTestId('new-variable-name-input');
      fireEvent.change(input, { target: { value: 'testVar' } });
      fireEvent.click(screen.getByTestId('new-variable-submit-btn'));

      await screen.findByTestId('variable-row-testVar');

      // Hide then show
      const toggleButton = screen.getByTestId('toggle-variables-button');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.queryByTestId('variable-row-testVar')).not.toBeInTheDocument();
      });

      fireEvent.click(toggleButton);

      await screen.findByTestId('variable-row-testVar');
    });

    it('should change toggle button title when hiding/showing', async () => {
      renderVariablesSection();

      const toggleButton = await screen.findByTestId('toggle-variables-button');

      expect(toggleButton).toHaveAttribute('title', 'Hide all variables');
      expect(toggleButton).toHaveAttribute('aria-label', 'Hide all variables');

      fireEvent.click(toggleButton);

      expect(toggleButton).toHaveAttribute('title', 'Show all variables');
      expect(toggleButton).toHaveAttribute('aria-label', 'Show all variables');

      fireEvent.click(toggleButton);

      expect(toggleButton).toHaveAttribute('title', 'Hide all variables');
      expect(toggleButton).toHaveAttribute('aria-label', 'Hide all variables');
    });

    it('should auto-show variables when add button is clicked while hidden', async () => {
      renderVariablesSection();

      // Hide variables first
      const toggleButton = await screen.findByTestId('toggle-variables-button');
      fireEvent.click(toggleButton);

      // Click add
      const addButton = screen.getByTestId('add-variable-button');
      fireEvent.click(addButton);

      // Input should be visible (auto-shown)
      expect(screen.getByTestId('new-variable-name-input')).toBeInTheDocument();
    });

    it('should not show toggle button in read-only mode', () => {
      renderVariablesSection(true);

      expect(screen.queryByTestId('toggle-variables-button')).not.toBeInTheDocument();
    });
  });
});

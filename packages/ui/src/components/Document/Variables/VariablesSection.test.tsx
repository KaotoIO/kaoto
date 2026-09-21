import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { VARIABLES_SECTION_ANCHOR } from '../../../models/datamapper/connection-port';
import { MappingLinksProvider } from '../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { useDocumentTreeStore } from '../../../store/document-tree.store';
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

    it('should render connection port on VariablesHeader', async () => {
      renderVariablesSection();

      const port = await screen.findByTestId('connection-port-variables-header');
      expect(port).toBeInTheDocument();
      expect(port).toHaveAttribute('data-connection-port', 'true');
      expect(port).toHaveAttribute('data-node-path', 'Var:_variables://');
      expect(port).toHaveAttribute('data-document-node-id', VARIABLES_SECTION_ANCHOR.documentNodeId);
    });

    it('should keep header connection port in DOM when variables are hidden', async () => {
      renderVariablesSection();

      // Add a variable so there is something to hide
      const addButton = await screen.findByTestId('add-variable-button');
      fireEvent.click(addButton);
      fireEvent.change(screen.getByTestId('new-variable-name-input'), { target: { value: 'v1' } });
      fireEvent.click(screen.getByTestId('new-variable-submit-btn'));
      await screen.findByTestId('variable-row-v1');

      // Hide all variables
      fireEvent.click(screen.getByTestId('toggle-variables-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('variable-row-v1')).not.toBeInTheDocument();
      });

      // Header port must still be in the DOM so syncConnectionPorts can measure it
      expect(screen.getByTestId('connection-port-variables-header')).toBeInTheDocument();
    });

    it('should register the header port under the section anchor key on mount', async () => {
      renderVariablesSection();

      // Header port exists in DOM from mount
      const port = await screen.findByTestId('connection-port-variables-header');
      expect(port).toBeInTheDocument();
      expect(port).toHaveAttribute('data-connection-port', 'true');
      expect(port).toHaveAttribute('data-node-path', 'Var:_variables://');
      expect(port).toHaveAttribute('data-document-node-id', VARIABLES_SECTION_ANCHOR.documentNodeId);

      // Asserted against the store rather than the screen: a port registered under the wrong
      // key renders identically, so only the store shows which bucket it landed in. jsdom
      // reports zero-size rects, so the coordinates themselves carry no information here.
      await waitFor(() => {
        const state = useDocumentTreeStore.getState();
        const headerPorts = state.nodesConnectionPorts[VARIABLES_SECTION_ANCHOR.documentNodeId];
        expect(headerPorts).toBeDefined();
        expect(headerPorts[VARIABLES_SECTION_ANCHOR.nodePath]).toBeDefined();
        expect(Array.isArray(headerPorts[VARIABLES_SECTION_ANCHOR.nodePath])).toBe(true);
      });
    });

    it('should keep header port in store after hide/show cycle', async () => {
      renderVariablesSection();

      // Add a variable
      const addButton = await screen.findByTestId('add-variable-button');
      fireEvent.click(addButton);
      fireEvent.change(screen.getByTestId('new-variable-name-input'), { target: { value: 'v1' } });
      fireEvent.click(screen.getByTestId('new-variable-submit-btn'));
      await screen.findByTestId('variable-row-v1');

      // Existence checks throughout: they show the anchor is never dropped from the store
      // across the cycle, not that a re-sync ran at each step.
      await waitFor(() => {
        const state = useDocumentTreeStore.getState();
        const headerPorts = state.nodesConnectionPorts[VARIABLES_SECTION_ANCHOR.documentNodeId];
        expect(headerPorts).toBeDefined();
        expect(headerPorts[VARIABLES_SECTION_ANCHOR.nodePath]).toBeDefined();
      });

      // Hide variables
      fireEvent.click(screen.getByTestId('toggle-variables-button'));
      await waitFor(() => {
        expect(screen.queryByTestId('variable-row-v1')).not.toBeInTheDocument();
      });

      // Anchor survives hiding all variables
      await waitFor(() => {
        const state = useDocumentTreeStore.getState();
        const headerPorts = state.nodesConnectionPorts[VARIABLES_SECTION_ANCHOR.documentNodeId];
        expect(headerPorts).toBeDefined();
        expect(headerPorts[VARIABLES_SECTION_ANCHOR.nodePath]).toBeDefined();
      });

      // Show variables again
      fireEvent.click(screen.getByTestId('toggle-variables-button'));
      await screen.findByTestId('variable-row-v1');

      // Anchor survives showing them again
      await waitFor(() => {
        const state = useDocumentTreeStore.getState();
        const headerPorts = state.nodesConnectionPorts[VARIABLES_SECTION_ANCHOR.documentNodeId];
        expect(headerPorts).toBeDefined();
        expect(headerPorts[VARIABLES_SECTION_ANCHOR.nodePath]).toBeDefined();
      });
    });
  });
});

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { VirtuosoMockContext } from 'react-virtuoso';

import { useDataMapper } from '../../hooks/useDataMapper';
import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
  DocumentType,
} from '../../models/datamapper/document';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { IfItem } from '../../models/datamapper/mapping';
import { DocumentNodeData, FieldItemNodeData } from '../../models/datamapper/visualization';
import { MappingLinksProvider } from '../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { MappingService } from '../../services/mapping/mapping.service';
import { TreeUIService } from '../../services/visualization/tree-ui.service';
import { useDocumentTreeStore } from '../../store/document-tree.store';
import {
  getShipOrderJsonSchema,
  getShipOrderToShipOrderConditionalNoteXslt,
  getShipOrderToShipOrderOptionalNoteXslt,
  getShipOrderXsd,
} from '../../stubs/datamapper/data-mapper';
import { TargetPanel } from './TargetPanel';

// Mock ResizeObserver for ExpansionPanels (already mocked globally in vitest-setup.ts)
// Mock RAF (already mocked globally in vitest-setup.ts)

describe('TargetPanel', () => {
  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <DataMapperProvider>
      <MappingLinksProvider>{children}</MappingLinksProvider>
    </DataMapperProvider>
  );

  const schemaWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => {
    const sourceDocDef = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, 'Body', {});
    const targetDocDef = new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.JSON_SCHEMA, 'Body', {
      ShipOrder: getShipOrderJsonSchema(),
    });
    const documentInitializationModel = new DocumentInitializationModel({}, sourceDocDef, targetDocDef);

    return (
      <DataMapperProvider documentInitializationModel={documentInitializationModel}>
        <MappingLinksProvider>{children}</MappingLinksProvider>
      </DataMapperProvider>
    );
  };

  it('should render the Target panel with Body header', () => {
    render(<TargetPanel />, { wrapper });
    expect(screen.getByTestId('document-doc-targetBody-Body')).toBeInTheDocument();
  });

  it('should render the panel with correct id', () => {
    const { container } = render(<TargetPanel />, { wrapper });
    expect(container.querySelector('#panel-target')).toBeInTheDocument();
  });

  it('should hide the grab icon when the target body has a schema attached', async () => {
    render(<TargetPanel />, { wrapper: schemaWrapper });

    const header = await screen.findByTestId('document-doc-targetBody-Body');
    expect(header).toBeInTheDocument();
    expect(header?.querySelector('[data-drag-handler]')).not.toBeInTheDocument();
  });

  it('should render using ExpansionPanels', () => {
    const { container } = render(<TargetPanel />, { wrapper });
    expect(container.querySelector('.expansion-panels')).toBeInTheDocument();
    expect(container.querySelector('.expansion-panel')).toBeInTheDocument();
  });

  it('should render the target body panel as collapsed when primitive (no schema)', () => {
    const { container } = render(<TargetPanel />, { wrapper });
    const panel = container.querySelector('.expansion-panel');
    // Target body starts as primitive (no schema), so it should be collapsed
    expect(panel).toHaveAttribute('data-expanded', 'false');
  });

  it('should render DataMapper settings button', async () => {
    render(<TargetPanel />, { wrapper });

    // The settings button should be present
    const settingsButton = await screen.findByRole('button', { name: /settings/i });
    expect(settingsButton).toBeInTheDocument();
  });

  it('should render DataMapper settings button with schema', async () => {
    render(<TargetPanel />, { wrapper: schemaWrapper });

    // Wait for the panel to render with schema
    await screen.findByTestId('document-doc-targetBody-Body');

    // The settings button should be present even with schema
    const settingsButton = await screen.findByRole('button', { name: /settings/i });
    expect(settingsButton).toBeInTheDocument();
  });

  it('should include settings button in document actions', () => {
    const { container } = render(<TargetPanel />, { wrapper });

    // The settings button is wrapped in an ActionListItem
    const actionListItem = container.querySelector('[data-testid="document-doc-targetBody-Body"]');
    expect(actionListItem).toBeInTheDocument();

    // Settings button should be within the document header actions
    const settingsButton = container.querySelector('button[aria-label*="Settings"]');
    expect(settingsButton).toBeInTheDocument();
  });

  describe('tree rebuild decoupling', () => {
    /**
     * Helper component that renders TargetPanel and exposes context actions
     * as imperative handles, all inside a single shared DataMapperProvider instance.
     */
    const TargetPanelWithActions: FunctionComponent<{
      onReady: (ctx: ReturnType<typeof useDataMapper>) => void;
    }> = ({ onReady }) => {
      const ctx = useDataMapper();
      onReady(ctx);
      return <TargetPanel />;
    };

    it('should not call TreeUIService.createTree on value-only refreshMappingTree', async () => {
      const createTreeSpy = vi.spyOn(TreeUIService, 'createTree');

      let ctx: ReturnType<typeof useDataMapper> | null = null;

      render(
        <DataMapperProvider>
          <MappingLinksProvider>
            <TargetPanelWithActions onReady={(c) => (ctx = c)} />
          </MappingLinksProvider>
        </DataMapperProvider>,
      );
      await screen.findByTestId('document-doc-targetBody-Body');

      const callCountAfterMount = createTreeSpy.mock.calls.length;

      // Simulate a value-only update (no structural option)
      act(() => {
        ctx!.refreshMappingTree();
      });

      // createTree should NOT have been called again
      expect(createTreeSpy.mock.calls).toHaveLength(callCountAfterMount);

      createTreeSpy.mockRestore();
    });

    it('should call TreeUIService.createTree on structural refreshMappingTree', async () => {
      const createTreeSpy = vi.spyOn(TreeUIService, 'createTree');

      let ctx: ReturnType<typeof useDataMapper> | null = null;

      render(
        <DataMapperProvider>
          <MappingLinksProvider>
            <TargetPanelWithActions onReady={(c) => (ctx = c)} />
          </MappingLinksProvider>
        </DataMapperProvider>,
      );
      await screen.findByTestId('document-doc-targetBody-Body');

      const callCountAfterMount = createTreeSpy.mock.calls.length;

      // Simulate a structural update
      act(() => {
        ctx!.refreshMappingTree({ structural: true });
      });

      // createTree should have been called at least once more
      expect(createTreeSpy.mock.calls.length).toBeGreaterThan(callCountAfterMount);

      createTreeSpy.mockRestore();
    });
  });

  describe('rows a commit moves under an if row or out of it', () => {
    const TARGET_DOCUMENT_NODE_ID = DocumentNodeData.formatNodeId(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
    const VIRTUOSO_MOCK_SIZES = { viewportHeight: 1200, itemHeight: 40 };

    const renderShipOrder = (xslt: string) => {
      const createShipOrderDefinition = (documentType: DocumentType) =>
        new DocumentDefinition(documentType, DocumentDefinitionType.XML_SCHEMA, BODY_DOCUMENT_ID, {
          'ShipOrder.xsd': getShipOrderXsd(),
        });
      const documentInitializationModel = new DocumentInitializationModel(
        {},
        createShipOrderDefinition(DocumentType.SOURCE_BODY),
        createShipOrderDefinition(DocumentType.TARGET_BODY),
      );
      render(
        <VirtuosoMockContext.Provider value={VIRTUOSO_MOCK_SIZES}>
          <DataMapperProvider documentInitializationModel={documentInitializationModel} initialXsltFile={xslt}>
            <MappingLinksProvider>
              <TargetPanel />
            </MappingLinksProvider>
          </DataMapperProvider>
        </VirtuosoMockContext.Provider>,
      );
    };

    const getGuardedNote = () => {
      const visit = (node: DocumentTreeNode): FieldItemNodeData | undefined => {
        if (node.nodeData instanceof FieldItemNodeData && node.nodeData.field.name === 'Note') return node.nodeData;
        for (const child of node.children) {
          const noteData = visit(child);
          if (noteData) return noteData;
        }
        return undefined;
      };
      const tree = TreeUIService.getTree(TARGET_DOCUMENT_NODE_ID);
      const noteData = tree && visit(tree.root);
      if (!noteData) throw new Error('No row renders the mapped Note field');
      const noteItem = noteData.mapping;
      const guard = noteItem.parent;
      if (!(guard instanceof IfItem)) throw new Error('The Note field is not under an if');
      return { noteItem, guard };
    };

    const getXPathInput = (row: HTMLElement) => within(row).getByTestId('transformation-xpath-input');

    const editVisibleIf = async (test: string) => {
      renderShipOrder(getShipOrderToShipOrderConditionalNoteXslt());
      const { noteItem, guard } = getGuardedNote();
      const ifRow = await screen.findByTestId(`node-target-${guard.id}`);
      const ifInput = getXPathInput(ifRow);
      const noteRow = screen.getByTestId(`node-target-${noteItem.id}`);
      const noteInput = getXPathInput(noteRow);
      vi.spyOn(document, 'hasFocus').mockReturnValue(true);
      act(() => {
        ifInput.focus();
      });
      fireEvent.change(ifInput, { target: { value: test } });
      return { guard, ifRow, ifInput, noteRow, noteInput };
    };

    beforeEach(() => {
      TreeUIService.clear();
      useDocumentTreeStore.setState({
        expansionState: {},
        expansionStateArray: {},
        selectedNodePath: null,
        selectedNodeIsSource: false,
        targetXPathInputForFocus: null,
        xPathInputFocusRestoreAfter: null,
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should keep the field row XPath input when a blur commit shows its guard as an if row', async () => {
      renderShipOrder(getShipOrderToShipOrderOptionalNoteXslt());
      const { noteItem, guard } = getGuardedNote();
      const noteInput = getXPathInput(await screen.findByTestId(`node-target-${noteItem.id}`));

      expect(screen.queryByTestId(`node-target-${guard.id}`)).not.toBeInTheDocument();

      fireEvent.change(noteInput, { target: { value: 'upper-case(Note)' } });
      fireEvent.blur(noteInput);

      const ifRow = await screen.findByTestId(`node-target-${guard.id}`);
      expect(getXPathInput(ifRow)).toHaveValue('Note');
      expect(getXPathInput(screen.getByTestId(`node-target-${noteItem.id}`))).toBe(noteInput);
      expect(noteInput).toHaveValue('upper-case(Note)');
    });

    it('should move focus to the field row XPath input when Enter makes the edited if row see-through', async () => {
      const { guard, ifInput, noteRow, noteInput } = await editVisibleIf('Note');

      fireEvent.keyDown(ifInput, { key: 'Enter' });

      await waitFor(() => {
        expect(noteInput).toHaveFocus();
      });
      expect(screen.queryByTestId(`node-target-${guard.id}`)).not.toBeInTheDocument();
      expect(getXPathInput(noteRow)).toBe(noteInput);
      expect(useDocumentTreeStore.getState().targetXPathInputForFocus).toBeNull();
    });

    it('should move focus to the field row XPath input when Tab to a control of the edited if row makes it see-through', async () => {
      const { ifRow, ifInput, noteInput } = await editVisibleIf('Note');

      fireEvent.blur(ifInput, { relatedTarget: within(ifRow).getByTestId(/^edit-xpath-button-/) });

      await waitFor(() => {
        expect(noteInput).toHaveFocus();
      });
      expect(ifRow).not.toBeInTheDocument();
    });

    it('should move focus to the field row XPath input when closing the XPath editor makes the edited if row see-through', async () => {
      renderShipOrder(getShipOrderToShipOrderConditionalNoteXslt());
      const { noteItem, guard } = getGuardedNote();
      const ifRow = await screen.findByTestId(`node-target-${guard.id}`);
      const noteInput = getXPathInput(screen.getByTestId(`node-target-${noteItem.id}`));
      vi.spyOn(document, 'hasFocus').mockReturnValue(true);

      fireEvent.click(within(ifRow).getByTestId(/^edit-xpath-button-/));
      const closeButton = await screen.findByTestId('close-xpath-editor-btn');
      act(() => {
        MappingService.updateExpression(guard, 'Note');
      });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(noteInput).toHaveFocus();
      });
      expect(ifRow).not.toBeInTheDocument();
    });

    it('should not pull focus into the field row when the edited if row loses focus to another row and becomes see-through', async () => {
      const { ifRow, ifInput, noteRow, noteInput } = await editVisibleIf('Note');
      const otherRowInput = screen
        .getAllByTestId('transformation-xpath-input')
        .find((input) => !ifRow.contains(input) && !noteRow.contains(input));
      if (!otherRowInput) throw new Error('No XPath input outside the if and Note rows');

      fireEvent.blur(ifInput, { relatedTarget: otherRowInput });

      await waitFor(() => {
        expect(ifRow).not.toBeInTheDocument();
      });
      expect(noteInput).not.toHaveFocus();
      expect(useDocumentTreeStore.getState().targetXPathInputForFocus).toBeNull();
    });
  });
});

import { act, render, screen } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { useDataMapper } from '../../hooks/useDataMapper';
import {
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
  DocumentType,
} from '../../models/datamapper/document';
import { MappingLinksProvider } from '../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { TreeUIService } from '../../services/visualization/tree-ui.service';
import { getShipOrderJsonSchema } from '../../stubs/datamapper/data-mapper';
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
});

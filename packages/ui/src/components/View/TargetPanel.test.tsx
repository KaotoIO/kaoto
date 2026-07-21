import { render, screen } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import {
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
  DocumentType,
} from '../../models/datamapper/document';
import { MappingLinksProvider } from '../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../providers/datamapper.provider';
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
    expect(screen.getByText('Target Body')).toBeInTheDocument();
  });

  it('should render the panel with correct id', () => {
    const { container } = render(<TargetPanel />, { wrapper });
    expect(container.querySelector('#panel-target')).toBeInTheDocument();
  });

  it('should hide the grab icon when the target body has a schema attached', async () => {
    const { container } = render(<TargetPanel />, { wrapper: schemaWrapper });

    expect(await screen.findByText('Target Body')).toBeInTheDocument();

    const header = container.querySelector('[data-testid="document-doc-targetBody-Body"]');
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
    expect(await screen.findByText('Target Body')).toBeInTheDocument();

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
});

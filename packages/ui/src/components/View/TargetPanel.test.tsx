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

// Mock ResizeObserver for ExpansionPanels
beforeAll(() => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {
      // intentional noop for test mock
    }
    unobserve() {
      // intentional noop for test mock
    }
    disconnect() {
      // intentional noop for test mock
    }
  };
});

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
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('should render the panel with correct id', () => {
    const { container } = render(<TargetPanel />, { wrapper });
    expect(container.querySelector('#panel-target')).toBeInTheDocument();
  });

  it('should hide the grab icon when the target body has a schema attached', async () => {
    const { container } = render(<TargetPanel />, { wrapper: schemaWrapper });

    expect(await screen.findByText('Body')).toBeInTheDocument();

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
});

/// <reference types="vite/client" />

import { SuggestionRegistryProvider } from '@kaoto/forms';
import {
  CatalogLoaderProvider,
  CatalogSchemaLoader,
  CatalogTilesProvider,
  ControllerService,
  DesignPage,
  EntitiesProvider,
  EventNotifier,
  FileTypes,
  FileTypesResponse,
  KaotoResourceProvider,
  RuntimeProvider,
  SchemasLoaderProvider,
  SourceCodeSync,
  VisibleFlowsProvider,
} from '@kaoto/kaoto/testing';
import { Button, TextArea } from '@patternfly/react-core';
import { VisualizationProvider } from '@patternfly/react-topology';
import { Meta, StoryFn, StoryObj } from '@storybook/react';
import { useEffect, useMemo, useState } from 'react';

import initialSourceCode from '../../../../examples/citrus-templates/order.citrus.test.yaml?raw';
import templateSourceCode from '../../../../examples/citrus-templates/prepare-order.citrus.yaml?raw';

const getResourcesContentByType = async (fileType: FileTypes): Promise<FileTypesResponse[]> =>
  fileType === FileTypes.CitrusTemplates
    ? [{ filename: 'prepare-order.citrus.yaml', content: templateSourceCode }]
    : [];

const ContextDecorator = (Story: StoryFn) => {
  const controller = useMemo(() => ControllerService.createController(), []);

  return (
    <SourceCodeSync initialSourceCode={initialSourceCode}>
      <KaotoResourceProvider fileExtension="citrus.test.yaml">
        <RuntimeProvider
          catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}
          runtimeCatalogName=""
          testingCatalogName=""
        >
          <SchemasLoaderProvider>
            <CatalogLoaderProvider getResourcesContentByType={getResourcesContentByType}>
              <EntitiesProvider>
                <CatalogTilesProvider>
                  <VisibleFlowsProvider>
                    <SuggestionRegistryProvider>
                      <VisualizationProvider controller={controller}>
                        <Story />
                      </VisualizationProvider>
                    </SuggestionRegistryProvider>
                  </VisibleFlowsProvider>
                </CatalogTilesProvider>
              </EntitiesProvider>
            </CatalogLoaderProvider>
          </SchemasLoaderProvider>
        </RuntimeProvider>
      </KaotoResourceProvider>
    </SourceCodeSync>
  );
};

const CitrusTemplateEditor = () => {
  const [sourceCode, setSourceCode] = useState(initialSourceCode);
  const eventNotifier = EventNotifier.getInstance();

  useEffect(() => eventNotifier.subscribe('entities:updated', setSourceCode), [eventNotifier]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <div style={{ flex: 1, minHeight: 300 }}>
        <DesignPage />
      </div>
      <section style={{ padding: '0 1rem 1rem' }}>
        <label htmlFor="generated-citrus-yaml">Generated YAML</label>
        <TextArea id="generated-citrus-yaml" value={sourceCode} readOnly rows={8} />
        <Button
          variant="secondary"
          onClick={() => {
            eventNotifier.next('code:updated', { code: sourceCode, path: 'order.citrus.test.yaml' });
          }}
        >
          Reopen YAML
        </Button>
      </section>
    </div>
  );
};

export default {
  title: 'Canvas/Citrus templates',
  component: CitrusTemplateEditor,
  decorators: [ContextDecorator],
  parameters: { layout: 'fullscreen' },
} as Meta<typeof CitrusTemplateEditor>;

export const HostProvided: StoryObj<typeof CitrusTemplateEditor> = {};

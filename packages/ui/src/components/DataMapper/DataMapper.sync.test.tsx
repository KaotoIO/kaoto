/*
    Copyright (C) 2024 Red Hat, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VirtuosoMockContext } from 'react-virtuoso';

import { IVisualizationNode } from '../../models';
import { DocumentDefinitionType } from '../../models/datamapper/document';
import { IDataMapperMetadata } from '../../models/datamapper/metadata';
import { EntitiesContext, EntitiesContextResult, IMetadataApi, MetadataProvider } from '../../providers';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DataMapperValidationStepService } from '../../services/datamapper-validation-step.service';
import { EMPTY_XSL } from '../../services/mapping/mapping-serializer.service';
import { getCartXsd, getShipOrderJsonSchema, getShipOrderXsd } from '../../stubs/datamapper/data-mapper';
import { DataMapper } from './DataMapper';

// Output validation auto-sync: skipped until feature is complete
describe.skip('DataMapper sync — onUpdateDocument validation step synchronization', () => {
  const mockEntitiesContext = {
    updateSourceCodeFromEntities: vi.fn(),
    updateEntitiesFromCamelResource: vi.fn(),
    entities: [],
    currentSchemaType: 'Route',
    visualEntities: [],
    camelResource: {},
  } as unknown as EntitiesContextResult;

  /** vizNode with both XSLT and validator steps already present */
  const createVizNodeWithValidator = (...stepUris: string[]) =>
    ({
      getId: () => 'route-1234',
      data: {
        definition: {
          id: 'kaoto-datamapper-1234',
          steps: stepUris.map((uri) => ({ to: { id: `id-${uri}`, uri } })),
        },
      },
      updateModel: vi.fn(),
    }) as unknown as IVisualizationNode;

  const vizNodeWithValidator = createVizNodeWithValidator(
    'xslt-saxon:kaoto-datamapper-1234.xsl',
    'validator:ShipOrder.xsd',
  );

  const vizNodeWithoutValidator = createVizNodeWithValidator('xslt-saxon:kaoto-datamapper-1234.xsl');

  let metadata: IDataMapperMetadata;
  let fileContents: Record<string, string>;
  /** The files the user picks in the attach schema modal */
  let selectedFiles: string[];

  const api = {
    getMetadata: (_key: string) => Promise.resolve(metadata),
    setMetadata: (_key: string, meta: IDataMapperMetadata) => {
      Object.assign(metadata, meta);
      return Promise.resolve();
    },
    getResourceContent: (path: string) => Promise.resolve(fileContents[path]),
    isResourceExist: (path: string) => Promise.resolve(fileContents[path] !== undefined),
    saveResourceContent: (path: string, content: string) => {
      fileContents[path] = content;
      return Promise.resolve();
    },
    deleteResource: () => Promise.resolve(true),
    askUserForFileSelection: () => Promise.resolve(selectedFiles),
    getSuggestions: () => Promise.resolve([]),
    shouldSaveSchema: false,
    onStepUpdated: () => Promise.resolve(),
  } as IMetadataApi;

  beforeEach(() => {
    vi.restoreAllMocks();

    metadata = {
      sourceBody: { type: DocumentDefinitionType.Primitive, filePath: [] },
      sourceParameters: {},
      targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['ShipOrder.xsd'] },
      xsltPath: 'kaoto-datamapper-1234.xsl',
    };
    fileContents = {
      'kaoto-datamapper-1234.xsl': EMPTY_XSL,
      'ShipOrder.xsd': getShipOrderXsd(),
      'NewOrder.xsd': getShipOrderXsd(),
      'CustomTypes.xsd': getCartXsd(),
      'schema.json': getShipOrderJsonSchema(),
    };
    selectedFiles = [];

    // Simulate the in-place mutation that the real updateTargetBodyMetadata performs
    vi.spyOn(DataMapperMetadataService, 'updateTargetBodyMetadata').mockImplementation(
      async (_api, _metadataId, meta, definition) => {
        meta.targetBody = {
          type: definition.definitionType,
          filePath: definition.definitionFiles ? Object.keys(definition.definitionFiles) : [],
        };
      },
    );
  });

  const renderDataMapper = (vizNode: IVisualizationNode) => {
    render(
      <EntitiesContext.Provider value={mockEntitiesContext}>
        <MetadataProvider api={api}>
          <DataMapper vizNode={vizNode} />
        </MetadataProvider>
      </EntitiesContext.Provider>,
      {
        wrapper: ({ children }) => (
          <VirtuosoMockContext.Provider value={{ viewportHeight: 600, itemHeight: 40 }}>
            {children}
          </VirtuosoMockContext.Provider>
        ),
      },
    );
  };

  /** Attaches (or updates) the target body schema through the attach schema modal, picking the given files */
  const attachTargetSchema = async (files: string[]) => {
    selectedFiles = files;
    fireEvent.click(screen.getByTestId('attach-schema-targetBody-Body-button'));
    const updateWarningContinue = screen.queryByTestId('update-schema-warning-modal-btn-continue');
    if (updateWarningContinue) fireEvent.click(updateWarningContinue);

    fireEvent.click(await screen.findByTestId('attach-schema-modal-btn-file'));
    for (const file of files) {
      await screen.findByTestId(`attach-schema-file-item-${file}`);
    }
    const attachButton = screen.getByTestId('attach-schema-modal-btn-attach');
    await waitFor(() => expect(attachButton).toBeEnabled());
    fireEvent.click(attachButton);
  };

  /** Detaches the target body schema, turning it back into a primitive document */
  const detachTargetSchema = async () => {
    fireEvent.click(await screen.findByTestId('detach-schema-targetBody-Body-button'));
    fireEvent.click(screen.getByTestId('detach-schema-modal-confirm-btn'));
  };

  it('1. schema file changed, validation enabled → updateValidationStep called', async () => {
    const updateSpy = vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {});
    const addSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});
    vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(true);

    renderDataMapper(vizNodeWithValidator);
    await screen.findByTestId('source-parameters-header');

    await attachTargetSchema(['NewOrder.xsd']);

    await waitFor(() => {
      expect(DataMapperMetadataService.updateTargetBodyMetadata).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        vizNodeWithValidator,
        expect.objectContaining({ type: DocumentDefinitionType.XML_SCHEMA, filePath: ['NewOrder.xsd'] }),
        mockEntitiesContext,
      );
    });
    expect(addSpy).not.toHaveBeenCalled();
  });

  it('2. schema changed, validation NOT enabled → auto-add via addValidationStep', async () => {
    metadata.targetBody = { type: DocumentDefinitionType.Primitive, filePath: [] };

    const addSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});
    const updateSpy = vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {});
    vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(false);

    renderDataMapper(vizNodeWithoutValidator);
    await screen.findByTestId('source-parameters-header');

    await attachTargetSchema(['ShipOrder.xsd']);

    await waitFor(() => {
      expect(DataMapperMetadataService.updateTargetBodyMetadata).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith(
        vizNodeWithoutValidator,
        expect.objectContaining({ type: DocumentDefinitionType.XML_SCHEMA, filePath: ['ShipOrder.xsd'] }),
        mockEntitiesContext,
      );
    });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('3. type changed from XML to JSON, validation enabled → updateValidationStep with JSON metadata', async () => {
    const updateSpy = vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {});
    vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(true);

    renderDataMapper(vizNodeWithValidator);
    await screen.findByTestId('source-parameters-header');

    await attachTargetSchema(['schema.json']);

    await waitFor(() => {
      expect(DataMapperMetadataService.updateTargetBodyMetadata).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        vizNodeWithValidator,
        expect.objectContaining({ type: DocumentDefinitionType.JSON_SCHEMA, filePath: ['schema.json'] }),
        mockEntitiesContext,
      );
    });
  });

  it('4. schema removed (→Primitive), validation enabled → updateValidationStep with Primitive metadata', async () => {
    const updateSpy = vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {});
    vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(true);

    renderDataMapper(vizNodeWithValidator);
    await screen.findByTestId('source-parameters-header');

    await detachTargetSchema();

    await waitFor(() => {
      expect(DataMapperMetadataService.updateTargetBodyMetadata).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        vizNodeWithValidator,
        expect.objectContaining({ type: DocumentDefinitionType.Primitive, filePath: [] }),
        mockEntitiesContext,
      );
    });
  });

  it('5. schema removed (→Primitive), validation NOT enabled → no service calls', async () => {
    const updateSpy = vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {});
    const addSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});
    const removeSpy = vi.spyOn(DataMapperValidationStepService, 'removeValidationStep').mockImplementation(() => {});
    vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(false);

    renderDataMapper(vizNodeWithoutValidator);
    await screen.findByTestId('source-parameters-header');

    await detachTargetSchema();

    await waitFor(() => {
      expect(DataMapperMetadataService.updateTargetBodyMetadata).toHaveBeenCalled();
    });
    expect(updateSpy).not.toHaveBeenCalled();
    expect(addSpy).not.toHaveBeenCalled();
    expect(removeSpy).not.toHaveBeenCalled();
  });

  it('6. type override adds additional schema files, validation enabled → updateValidationStep with multi-file metadata', async () => {
    const updateSpy = vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {});
    vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(true);

    renderDataMapper(vizNodeWithValidator);
    await screen.findByTestId('source-parameters-header');

    await attachTargetSchema(['ShipOrder.xsd', 'CustomTypes.xsd']);

    await waitFor(() => {
      expect(DataMapperMetadataService.updateTargetBodyMetadata).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        vizNodeWithValidator,
        expect.objectContaining({
          type: DocumentDefinitionType.XML_SCHEMA,
          filePath: expect.arrayContaining(['ShipOrder.xsd', 'CustomTypes.xsd']),
        }),
        mockEntitiesContext,
      );
    });
  });

  it('7. isOutputValidationEnabled state refreshed after sync', async () => {
    const isValidationEnabledSpy = vi
      .spyOn(DataMapperValidationStepService, 'isValidationEnabled')
      .mockReturnValue(true);
    vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {});

    renderDataMapper(vizNodeWithValidator);
    await screen.findByTestId('source-parameters-header');

    const callCountBefore = isValidationEnabledSpy.mock.calls.length;

    await attachTargetSchema(['NewOrder.xsd']);

    await waitFor(() => {
      expect(DataMapperMetadataService.updateTargetBodyMetadata).toHaveBeenCalled();
    });
    await waitFor(() => {
      // isValidationEnabled should be called again after sync to refresh state
      expect(isValidationEnabledSpy.mock.calls.length).toBeGreaterThan(callCountBefore);
    });
  });
});

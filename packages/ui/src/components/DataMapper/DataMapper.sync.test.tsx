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
import { DataMapperOutputValidationService } from '../../services/datamapper-output-validation.service';
import { DataMapperStepSettingsService } from '../../services/datamapper-step-settings.service';
import { DataMapperValidationStepService } from '../../services/datamapper-validation-step.service';
import { GENERATED_WRAPPER_MARKER } from '../../services/document/xml-schema/xml-schema-wrapper-generator.service';
import { EMPTY_XSL } from '../../services/mapping/mapping-serializer.service';
import { getCartXsd, getShipOrderJsonSchema, getShipOrderXsd } from '../../stubs/datamapper/data-mapper';
import { DataMapper } from './DataMapper';

describe('DataMapper sync — onUpdateDocument validation step synchronization', () => {
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
        'NewOrder.xsd',
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
        'ShipOrder.xsd',
      );
    });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('2a. schema target replaced with another, validation NOT enabled → stays off', async () => {
    // metadata.targetBody is already XML_SCHEMA (see beforeEach): this is not a "newly attached" transition, so
    // it must not be treated like test 2 (Primitive -> schema) even though validation is off in both.
    const addSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});
    const isValidationEnabledSpy = vi
      .spyOn(DataMapperValidationStepService, 'isValidationEnabled')
      .mockReturnValue(false);

    renderDataMapper(vizNodeWithoutValidator);
    await screen.findByTestId('source-parameters-header');

    const callCountBefore = isValidationEnabledSpy.mock.calls.length;

    await attachTargetSchema(['NewOrder.xsd']);

    await waitFor(() => {
      expect(DataMapperMetadataService.updateTargetBodyMetadata).toHaveBeenCalled();
    });
    // Positive anchor: confirms the sync actually ran, not just that it never got a chance to.
    await waitFor(() => {
      expect(isValidationEnabledSpy.mock.calls.length).toBeGreaterThan(callCountBefore);
    });
    expect(addSpy).not.toHaveBeenCalled();
  });

  it('2b. a validator the user turned off is not re-added by a later target edit', async () => {
    // Same code path as 2a (a schema target was already attached), named for the specific guarantee it protects:
    // disabling the toggle must stick across later edits to an already-attached target.
    const addSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});
    const isValidationEnabledSpy = vi
      .spyOn(DataMapperValidationStepService, 'isValidationEnabled')
      .mockReturnValue(false);

    renderDataMapper(vizNodeWithoutValidator);
    await screen.findByTestId('source-parameters-header');

    const callCountBefore = isValidationEnabledSpy.mock.calls.length;

    await attachTargetSchema(['ShipOrder.xsd', 'CustomTypes.xsd']);

    await waitFor(() => {
      expect(DataMapperMetadataService.updateTargetBodyMetadata).toHaveBeenCalled();
    });
    // Positive anchor: confirms the sync actually ran, not just that it never got a chance to.
    await waitFor(() => {
      expect(isValidationEnabledSpy.mock.calls.length).toBeGreaterThan(callCountBefore);
    });
    expect(addSpy).not.toHaveBeenCalled();
  });

  it('3. type changed from XML to JSON, validation enabled → removed (JSON is gated until #3612)', async () => {
    const updateSpy = vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {});
    const removeSpy = vi.spyOn(DataMapperValidationStepService, 'removeValidationStep').mockImplementation(() => {});
    vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(true);

    renderDataMapper(vizNodeWithValidator);
    await screen.findByTestId('source-parameters-header');

    await attachTargetSchema(['schema.json']);

    await waitFor(() => {
      expect(DataMapperMetadataService.updateTargetBodyMetadata).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith(vizNodeWithValidator, mockEntitiesContext);
    });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('4. schema removed (→Primitive), validation enabled → removed through removeValidationStep', async () => {
    const updateSpy = vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {});
    const removeSpy = vi.spyOn(DataMapperValidationStepService, 'removeValidationStep').mockImplementation(() => {});
    vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(true);

    renderDataMapper(vizNodeWithValidator);
    await screen.findByTestId('source-parameters-header');

    await detachTargetSchema();

    await waitFor(() => {
      expect(DataMapperMetadataService.updateTargetBodyMetadata).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith(vizNodeWithValidator, mockEntitiesContext);
    });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('5. schema removed (→Primitive), validation NOT enabled → no service calls', async () => {
    const updateSpy = vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {});
    const addSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});
    const removeSpy = vi.spyOn(DataMapperValidationStepService, 'removeValidationStep').mockImplementation(() => {});
    const isValidationEnabledSpy = vi
      .spyOn(DataMapperValidationStepService, 'isValidationEnabled')
      .mockReturnValue(false);

    renderDataMapper(vizNodeWithoutValidator);
    await screen.findByTestId('source-parameters-header');

    const callCountBefore = isValidationEnabledSpy.mock.calls.length;

    await detachTargetSchema();

    await waitFor(() => {
      expect(DataMapperMetadataService.updateTargetBodyMetadata).toHaveBeenCalled();
    });
    // Positive anchor: confirms the sync actually ran (isValidationEnabled is read both to decide the branch and
    // to return the final state), not just that it never got a chance to do anything.
    await waitFor(() => {
      expect(isValidationEnabledSpy.mock.calls.length).toBeGreaterThan(callCountBefore);
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
        'kaoto-datamapper-1234-validation-wrapper.xsd',
      );
    });
    expect(fileContents['kaoto-datamapper-1234-validation-wrapper.xsd']).toContain(GENERATED_WRAPPER_MARKER);
  });

  it('7. the validation state is read again after sync', async () => {
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

  it('8. the host passes the target change to the step settings service and shows what it reports', async () => {
    const settingsSyncSpy = vi.spyOn(DataMapperStepSettingsService, 'syncOnTargetChange').mockResolvedValue({
      settings: { isOutputValidationEnabled: true },
      warnings: ['Schema file(s) missing or empty, not included in validation: Missing.xsd'],
    });
    const validationSyncSpy = vi.spyOn(DataMapperOutputValidationService, 'syncOnTargetChange');
    const setValidationSpy = vi.spyOn(DataMapperOutputValidationService, 'setOutputValidation');

    renderDataMapper(vizNodeWithValidator);
    await screen.findByTestId('source-parameters-header');

    await attachTargetSchema(['NewOrder.xsd']);

    await waitFor(() => {
      expect(settingsSyncSpy).toHaveBeenCalledWith(
        expect.anything(),
        vizNodeWithValidator,
        mockEntitiesContext,
        expect.objectContaining({ xsltPath: 'kaoto-datamapper-1234.xsl' }),
        expect.objectContaining({ definitionType: DocumentDefinitionType.XML_SCHEMA }),
        DocumentDefinitionType.XML_SCHEMA,
      );
    });
    expect(
      await screen.findByText('Schema file(s) missing or empty, not included in validation: Missing.xsd'),
    ).toBeInTheDocument();
    // The host knows the step settings service only, not the validation
    expect(validationSyncSpy).not.toHaveBeenCalled();
    expect(setValidationSpy).not.toHaveBeenCalled();
  });
});

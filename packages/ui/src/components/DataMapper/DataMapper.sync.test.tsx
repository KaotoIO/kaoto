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
import { act, render, screen, waitFor } from '@testing-library/react';

import { useDataMapper } from '../../hooks/useDataMapper';
import { IVisualizationNode } from '../../models';
import {
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  PrimitiveDocument,
} from '../../models/datamapper/document';
import { IDataMapperMetadata } from '../../models/datamapper/metadata';
import { EntitiesContext, EntitiesContextResult, IMetadataApi, MetadataProvider } from '../../providers';
import { IDataMapperContext } from '../../providers/datamapper.provider';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DataMapperValidationStepService } from '../../services/datamapper-validation-step.service';
import { EMPTY_XSL } from '../../services/mapping/mapping-serializer.service';
import { DataMapper } from './DataMapper';

vi.mock('monaco-editor', () => ({
  languages: {
    CompletionItemKind: { Keyword: 17, Function: 1 },
    CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
  },
}));

let capturedContext: IDataMapperContext;

vi.mock('../../components/DataMapper/DataMapperControl', () => ({
  DataMapperControl: () => {
    capturedContext = useDataMapper();
    return <div data-testid="source-parameters-header" />;
  },
}));

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
      getNodeDefinition: () => ({
        id: 'kaoto-datamapper-1234',
        steps: stepUris.map((uri) => ({ to: { id: `id-${uri}`, uri } })),
      }),
      updateModel: vi.fn(),
    }) as unknown as IVisualizationNode;

  const vizNodeWithValidator = createVizNodeWithValidator(
    'xslt-saxon:kaoto-datamapper-1234.xsl',
    'validator:ShipOrder.xsd',
  );

  const vizNodeWithoutValidator = createVizNodeWithValidator('xslt-saxon:kaoto-datamapper-1234.xsl');

  const createTargetDefinition = (
    definitionType: DocumentDefinitionType,
    definitionFiles: Record<string, string> = {},
  ) => new DocumentDefinition(DocumentType.TARGET_BODY, definitionType, 'Body', definitionFiles);

  const primitiveDoc = new PrimitiveDocument(
    new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, 'Body'),
  );

  let metadata: IDataMapperMetadata;
  let fileContents: Record<string, string>;

  const api: IMetadataApi = {
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
  };

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
    };

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
    );
  };

  it('1. schema file changed, validation enabled → updateValidationStep called', async () => {
    const updateSpy = vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {});
    const addSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});
    vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(true);

    renderDataMapper(vizNodeWithValidator);
    await screen.findByTestId('source-parameters-header');

    const definition = createTargetDefinition(DocumentDefinitionType.XML_SCHEMA, { 'NewOrder.xsd': '<schema/>' });
    await act(async () => {
      capturedContext.updateDocument(primitiveDoc, definition, '');
    });

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

    const definition = createTargetDefinition(DocumentDefinitionType.XML_SCHEMA, { 'ShipOrder.xsd': '<schema/>' });
    await act(async () => {
      capturedContext.updateDocument(primitiveDoc, definition, '');
    });

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

    const definition = createTargetDefinition(DocumentDefinitionType.JSON_SCHEMA, { 'schema.json': '{}' });
    await act(async () => {
      capturedContext.updateDocument(primitiveDoc, definition, '');
    });

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

    const definition = createTargetDefinition(DocumentDefinitionType.Primitive, {});
    await act(async () => {
      capturedContext.updateDocument(primitiveDoc, definition, '');
    });

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
    metadata.targetBody = { type: DocumentDefinitionType.Primitive, filePath: [] };

    const updateSpy = vi.spyOn(DataMapperValidationStepService, 'updateValidationStep').mockImplementation(() => {});
    const addSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});
    const removeSpy = vi.spyOn(DataMapperValidationStepService, 'removeValidationStep').mockImplementation(() => {});
    vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(false);

    renderDataMapper(vizNodeWithoutValidator);
    await screen.findByTestId('source-parameters-header');

    const definition = createTargetDefinition(DocumentDefinitionType.Primitive, {});
    await act(async () => {
      capturedContext.updateDocument(primitiveDoc, definition, '');
    });

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

    const definition = createTargetDefinition(DocumentDefinitionType.XML_SCHEMA, {
      'ShipOrder.xsd': '<schema/>',
      'CustomTypes.xsd': '<additional/>',
    });
    await act(async () => {
      capturedContext.updateDocument(primitiveDoc, definition, '');
    });

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

    const definition = createTargetDefinition(DocumentDefinitionType.XML_SCHEMA, { 'NewOrder.xsd': '<schema/>' });
    await act(async () => {
      capturedContext.updateDocument(primitiveDoc, definition, '');
    });

    await waitFor(() => {
      expect(DataMapperMetadataService.updateTargetBodyMetadata).toHaveBeenCalled();
    });
    await waitFor(() => {
      // isValidationEnabled should be called again after sync to refresh state
      expect(isValidationEnabledSpy.mock.calls.length).toBeGreaterThan(callCountBefore);
    });
  });
});

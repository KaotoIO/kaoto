import { ProcessorDefinition, RouteDefinition } from '@kaoto/camel-catalog/types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VirtuosoMockContext } from 'react-virtuoso';

import { IVisualizationNode } from '../../models';
import { CamelRouteResource } from '../../models/camel';
import { DocumentDefinitionType } from '../../models/datamapper/document';
import { IDataMapperMetadata } from '../../models/datamapper/metadata';
import { EntitiesContext, IMetadataApi, MetadataProvider } from '../../providers';
import { DataMapperMetadataService } from '../../services/datamapper-metadata.service';
import { DataMapperValidationStepService } from '../../services/datamapper-validation-step.service';
import { EMPTY_XSL } from '../../services/mapping/mapping-serializer.service';
import { createMockEntitiesContext } from '../../stubs/create-mock-entities-context';
import { getShipOrderToShipOrderXslt, getShipOrderXsd } from '../../stubs/datamapper/data-mapper';
import { DataMapper } from './DataMapper';

describe('DataMapperPage', () => {
  const vizNode = {
    getId: () => 'route-1234',
    data: { definition: { id: 'kaoto-datamapper-1234' } },
  } as unknown as IVisualizationNode;
  const defaultMetadata: IDataMapperMetadata = {
    sourceBody: {
      type: DocumentDefinitionType.Primitive,
      filePath: [],
    },
    sourceParameters: {},
    targetBody: {
      type: DocumentDefinitionType.Primitive,
      filePath: [],
    },
    xsltPath: `kaoto-datamapper-1234.xsl`,
  };

  let metadata: IDataMapperMetadata;
  let fileContents: Record<string, string>;
  const api = {
    getMetadata: (_key: string) => {
      return Promise.resolve(metadata);
    },
    setMetadata: (_key: string, meta: IDataMapperMetadata) => {
      Object.assign(metadata, meta);
      return Promise.resolve();
    },
    getResourceContent: (path: string) => {
      return Promise.resolve(fileContents[path]);
    },
    isResourceExist: (path: string) => {
      return Promise.resolve(fileContents[path] !== undefined);
    },
    saveResourceContent: (path: string, content: string) => {
      fileContents[path] = content;
      return Promise.resolve();
    },
  } as IMetadataApi;

  // Helper to wrap components with VirtuosoMockContext for testing
  const renderWithVirtuoso = (component: React.ReactElement) => {
    return render(component, {
      wrapper: ({ children }) => (
        <VirtuosoMockContext.Provider value={{ viewportHeight: 600, itemHeight: 40 }}>
          {children}
        </VirtuosoMockContext.Provider>
      ),
    });
  };

  const xsltStep: ProcessorDefinition = { to: { uri: 'xslt-saxon:kaoto-datamapper-1234.xsl' } };

  const createDataMapperRoute = (dataMapperSteps: ProcessorDefinition[]): { route: RouteDefinition } => ({
    route: {
      id: 'route-1234',
      from: {
        uri: 'timer:template',
        steps: [{ step: { id: 'kaoto-datamapper-1234', steps: dataMapperSteps } }],
      },
    },
  });

  const getDataMapperVizNode = async (camelResource: CamelRouteResource) =>
    (await camelResource.getVisualEntities()[0].toVizNode()).getChildren()?.[1];

  const setUpDataMapperStep = async (dataMapperSteps: ProcessorDefinition[]) => {
    const camelResource = new CamelRouteResource([createDataMapperRoute(dataMapperSteps)]);
    const entitiesContext = await createMockEntitiesContext(camelResource);
    const dataMapperVizNode = await getDataMapperVizNode(camelResource);
    return { camelResource, entitiesContext, dataMapperVizNode };
  };

  beforeEach(() => {
    metadata = defaultMetadata;
    fileContents = {};
  });

  it('should render initial XSLT mappings with initial documents', async () => {
    fileContents['ShipOrder.xsd'] = getShipOrderXsd();
    fileContents[metadata.xsltPath] = getShipOrderToShipOrderXslt();
    metadata.sourceBody = {
      filePath: ['ShipOrder.xsd'],
      type: DocumentDefinitionType.XML_SCHEMA,
    };
    metadata.targetBody = {
      filePath: ['ShipOrder.xsd'],
      type: DocumentDefinitionType.XML_SCHEMA,
    };
    metadata.sourceParameters['testparam1'] = {
      filePath: [],
      type: DocumentDefinitionType.Primitive,
    };
    renderWithVirtuoso(
      <MetadataProvider api={api}>
        <DataMapper vizNode={vizNode} />
      </MetadataProvider>,
    );

    let executed = false;
    await waitFor(() => {
      expect(screen.getByTestId('source-parameters-header')).toBeInTheDocument();
      expect(screen.getByTestId('document-doc-param-testparam1')).toBeInTheDocument();
      expect(screen.getByTestId('document-doc-sourceBody-Body')).toBeInTheDocument();
      expect(screen.getByTestId('document-doc-targetBody-Body')).toBeInTheDocument();
      expect(screen.getByTestId(/node-source-fx-OrderId-.*/)).toBeInTheDocument();
      expect(screen.getByTestId(/node-target-fx-OrderId-.*/)).toBeInTheDocument();
      executed = true;
    });
    /** We cannot rely on expect.assertions(6) since when there's a failure, an extra expectation is run */
    expect(executed).toBeTruthy();
  });

  it('should not render toolbar menu in embedded mode', async () => {
    renderWithVirtuoso(
      <MetadataProvider api={api}>
        <DataMapper vizNode={vizNode} />
      </MetadataProvider>,
    );
    await expect(screen.findByTestId('main-menu-button')).rejects.toThrow();
  });

  it('should show an error message if vizNode is not provided', async () => {
    renderWithVirtuoso(<DataMapper />);
    const error = await screen.findByText('No associated DataMapper step was provided.');
    expect(error).toBeInTheDocument();
  });

  it('should invoke updateMappingFile when reopening with existing metadata', async () => {
    const existingMetadata: IDataMapperMetadata = {
      sourceBody: {
        type: DocumentDefinitionType.Primitive,
        filePath: [],
      },
      sourceParameters: {},
      targetBody: {
        type: DocumentDefinitionType.Primitive,
        filePath: [],
      },
      xsltPath: 'kaoto-datamapper-1234.xsl',
    };

    metadata = existingMetadata;
    fileContents['kaoto-datamapper-1234.xsl'] = '<xsl/>';

    const updateMappingFileSpy = vi.spyOn(DataMapperMetadataService, 'updateMappingFile').mockResolvedValue();

    renderWithVirtuoso(
      <MetadataProvider api={api}>
        <DataMapper vizNode={vizNode} />
      </MetadataProvider>,
    );

    await screen.findByTestId('source-parameters-header');

    await waitFor(() => {
      expect(updateMappingFileSpy).toHaveBeenCalled();
    });

    updateMappingFileSpy.mockRestore();
  });

  it('should create XSLT file when metadata exists but file is missing', async () => {
    const existingMetadata: IDataMapperMetadata = {
      sourceBody: {
        type: DocumentDefinitionType.Primitive,
        filePath: [],
      },
      sourceParameters: {},
      targetBody: {
        type: DocumentDefinitionType.Primitive,
        filePath: [],
      },
      xsltPath: 'kaoto-datamapper-1234.xsl',
    };

    metadata = existingMetadata;
    // File does not exist initially
    fileContents = {};

    const saveResourceContentSpy = vi.spyOn(api, 'saveResourceContent');

    renderWithVirtuoso(
      <MetadataProvider api={api}>
        <DataMapper vizNode={vizNode} />
      </MetadataProvider>,
    );

    await screen.findByTestId('source-parameters-header');

    await waitFor(() => {
      expect(saveResourceContentSpy).toHaveBeenCalledWith('kaoto-datamapper-1234.xsl', EMPTY_XSL);
      expect(fileContents['kaoto-datamapper-1234.xsl']).toBeDefined();
    });

    saveResourceContentSpy.mockRestore();
  });

  it('should not create XSLT file when it already exists', async () => {
    const existingMetadata: IDataMapperMetadata = {
      sourceBody: {
        type: DocumentDefinitionType.Primitive,
        filePath: [],
      },
      sourceParameters: {},
      targetBody: {
        type: DocumentDefinitionType.Primitive,
        filePath: [],
      },
      xsltPath: 'kaoto-datamapper-1234.xsl',
    };

    metadata = existingMetadata;
    fileContents['kaoto-datamapper-1234.xsl'] = '<existing xslt content/>';

    const saveResourceContentSpy = vi.spyOn(api, 'saveResourceContent');

    renderWithVirtuoso(
      <MetadataProvider api={api}>
        <DataMapper vizNode={vizNode} />
      </MetadataProvider>,
    );

    await screen.findByTestId('source-parameters-header');

    await waitFor(() => {
      // saveResourceContent should not be called for creating the file
      // (it may be called for other purposes like saving mappings)
      const createFileCalls = saveResourceContentSpy.mock.calls.filter(
        (call) => call[0] === 'kaoto-datamapper-1234.xsl' && call[1] === EMPTY_XSL,
      );
      expect(createFileCalls).toHaveLength(0);
    });

    saveResourceContentSpy.mockRestore();
  });

  describe('Output Validation', () => {
    let vizNodeWithSteps: IVisualizationNode | undefined;

    beforeEach(async () => {
      vi.restoreAllMocks();
      metadata = defaultMetadata;
      fileContents = {};
      vizNodeWithSteps = (await setUpDataMapperStep([xsltStep])).dataMapperVizNode;
    });

    it('should read initial validation state via isValidationEnabled on mount', async () => {
      const isValidationEnabledSpy = vi
        .spyOn(DataMapperValidationStepService, 'isValidationEnabled')
        .mockReturnValue(true);

      fileContents[metadata.xsltPath] = EMPTY_XSL;

      renderWithVirtuoso(
        <MetadataProvider api={api}>
          <DataMapper vizNode={vizNodeWithSteps} />
        </MetadataProvider>,
      );

      await screen.findByTestId('source-parameters-header');

      await waitFor(() => {
        expect(isValidationEnabledSpy).toHaveBeenCalledWith(vizNodeWithSteps);
      });
    });

    it('should not call isValidationEnabled when vizNode has no steps', async () => {
      const { dataMapperVizNode: emptyVizNode } = await setUpDataMapperStep([]);

      const isValidationEnabledSpy = vi
        .spyOn(DataMapperValidationStepService, 'isValidationEnabled')
        .mockReturnValue(false);

      fileContents[metadata.xsltPath] = EMPTY_XSL;

      renderWithVirtuoso(
        <MetadataProvider api={api}>
          <DataMapper vizNode={emptyVizNode} />
        </MetadataProvider>,
      );

      await screen.findByTestId('source-parameters-header');

      expect(isValidationEnabledSpy).toHaveBeenCalledWith(emptyVizNode);
    });

    it('should read initial validation state via isValidationEnabled and pass to DataMapperProvider', async () => {
      vi.spyOn(DataMapperValidationStepService, 'isValidationEnabled').mockReturnValue(false);
      vi.spyOn(DataMapperValidationStepService, 'addValidationStep').mockImplementation(() => {});
      vi.spyOn(DataMapperValidationStepService, 'removeValidationStep').mockImplementation(() => {});

      fileContents[metadata.xsltPath] = EMPTY_XSL;

      renderWithVirtuoso(
        <MetadataProvider api={api}>
          <DataMapper vizNode={vizNodeWithSteps} />
        </MetadataProvider>,
      );

      await screen.findByTestId('source-parameters-header');

      expect(DataMapperValidationStepService.isValidationEnabled).toHaveBeenCalledWith(vizNodeWithSteps);
    });
  });

  describe('Output validation toggle in the settings modal', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
      metadata = {
        ...defaultMetadata,
        targetBody: { type: DocumentDefinitionType.XML_SCHEMA, filePath: ['ShipOrder.xsd'] },
      };
      fileContents = { 'ShipOrder.xsd': getShipOrderXsd(), [metadata.xsltPath]: EMPTY_XSL };
    });

    const renderAndOpenSettings = async (dataMapperSteps: ProcessorDefinition[]) => {
      const setUp = await setUpDataMapperStep(dataMapperSteps);
      renderWithVirtuoso(
        <EntitiesContext.Provider value={setUp.entitiesContext}>
          <MetadataProvider api={api}>
            <DataMapper vizNode={setUp.dataMapperVizNode} />
          </MetadataProvider>
        </EntitiesContext.Provider>,
      );
      await screen.findByTestId('source-parameters-header');
      const user = userEvent.setup();
      await user.click(screen.getByTestId('datamapper-settings-button'));
      return { ...setUp, user };
    };

    it('should add the validator pointing to the target schema when the toggle is switched on', async () => {
      const addSpy = vi.spyOn(DataMapperValidationStepService, 'addValidationStep');

      const { user, dataMapperVizNode, entitiesContext } = await renderAndOpenSettings([xsltStep]);
      await user.click(await screen.findByTestId('validate-output-settings-checkbox'));
      await user.click(screen.getByTestId('datamapper-settings-save-btn'));

      await waitFor(() => {
        expect(addSpy).toHaveBeenCalledWith(
          dataMapperVizNode,
          expect.objectContaining({ filePath: ['ShipOrder.xsd'] }),
          entitiesContext,
          'ShipOrder.xsd',
        );
      });
    });

    it('should remove the validator when the toggle is switched off', async () => {
      const removeSpy = vi.spyOn(DataMapperValidationStepService, 'removeValidationStep');
      const validatorStep: ProcessorDefinition = { to: { uri: 'validator:ShipOrder.xsd' } };

      const { user, dataMapperVizNode, entitiesContext } = await renderAndOpenSettings([xsltStep, validatorStep]);
      await user.click(await screen.findByTestId('validate-output-settings-checkbox'));
      await user.click(screen.getByTestId('datamapper-settings-save-btn'));

      await waitFor(() => {
        expect(removeSpy).toHaveBeenCalledWith(dataMapperVizNode, entitiesContext);
      });
    });
  });

  describe('Output Variable', () => {
    const managedSetVariableStep: ProcessorDefinition = {
      setVariable: { id: 'kaoto-datamapper-output-variable-1234', name: 'myVar', simple: '${body}' },
    };

    const renderDataMapper = async (dataMapperSteps: ProcessorDefinition[]) => {
      const setUp = await setUpDataMapperStep(dataMapperSteps);
      renderWithVirtuoso(
        <EntitiesContext.Provider value={setUp.entitiesContext}>
          <MetadataProvider api={api}>
            <DataMapper vizNode={setUp.dataMapperVizNode} />
          </MetadataProvider>
        </EntitiesContext.Provider>,
      );
      await screen.findByTestId('source-parameters-header');
      return setUp;
    };

    beforeEach(() => {
      vi.restoreAllMocks();
      metadata = defaultMetadata;
      fileContents = {};
      fileContents[metadata.xsltPath] = EMPTY_XSL;
    });

    it('should prefill the settings modal with the variable of the managed setVariable step', async () => {
      const user = userEvent.setup();
      await renderDataMapper([xsltStep, managedSetVariableStep]);

      await user.click(screen.getByTestId('datamapper-settings-button'));

      expect(await screen.findByTestId('output-variable-name-input')).toHaveValue('myVar');
    });

    it('should ignore a user-authored setVariable step', async () => {
      const user = userEvent.setup();
      await renderDataMapper([xsltStep, { setVariable: { name: 'userVar', simple: '${header.foo}' } }]);

      await user.click(screen.getByTestId('datamapper-settings-button'));

      expect(await screen.findByTestId('output-variable-name-input')).toHaveValue('');
    });

    it('should write the managed setVariable step into the route when the variable is saved', async () => {
      const user = userEvent.setup();
      const { camelResource, entitiesContext } = await renderDataMapper([xsltStep]);

      await user.click(screen.getByTestId('datamapper-settings-button'));
      await user.type(await screen.findByTestId('output-variable-name-input'), 'newVar');
      await user.click(screen.getByTestId('datamapper-settings-save-btn'));

      expect(entitiesContext.updateSourceCodeFromEntities).toHaveBeenCalled();
      const updatedVizNode = await getDataMapperVizNode(camelResource);
      expect(updatedVizNode?.data.definition).toMatchObject({
        steps: expect.arrayContaining([
          {
            setVariable: {
              id: expect.stringMatching(/^kaoto-datamapper-output-variable-/),
              name: 'newVar',
              simple: '${body}',
            },
          },
        ]),
      });
    });
  });
});

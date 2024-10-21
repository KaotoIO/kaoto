import {
  ActionList,
  ActionListItem,
  Alert,
  Bullseye,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateVariant,
  Radio,
  SearchInput,
  Text,
  TextContent,
  TextInput,
  TextVariants,
  Wizard,
  WizardFooterWrapper,
  WizardStep,
  useWizardContext
} from '@patternfly/react-core';
import SearchIcon from '@patternfly/react-icons/dist/esm/icons/search-icon';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { OpenApi, OpenApiOperation, OpenApiPath } from 'openapi-v3';
import { FunctionComponent, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parse } from 'yaml';
import { BaseVisualCamelEntity, CamelRouteVisualEntity, IVisualizationNode } from '../../../models';
import { EntityType } from '../../../models/camel/entities';
import { EntitiesContext } from '../../../providers/entities.provider';
import { isDefined } from '../../../utils';
import PaginationTop from '../../Visualization/Pagination/PaginationTop';
import { OpenApiSpecification } from './OpenApiSpecification';

interface Props {
  openApiConfigureToggle: () => void;
  restOpenApiId: string;
  specificationUri: string;
  operationId: string;
  host: string;
}

interface SpecificationFooterProps {
  hasSpecification: boolean;
}

interface FooterProps {
  footerCallback: () => void;
}

type OpenApiPathMethods = {
  [K in keyof Required<OpenApiPath>]: Required<OpenApiPath>[K] extends OpenApiOperation ? K : never;
}[keyof OpenApiPath];

const VALID_METHODS: OpenApiPathMethods[] = ['get', 'post', 'put', 'delete', 'head', 'patch'];

interface Operation {
  selected: boolean;
  operationId: string;
  httpMethod: string;
  path: string;
}

function SubmitSpecificationFooter(props: SpecificationFooterProps) {
  const { goToNextStep, close } = useWizardContext();

  async function onNext() {
    goToNextStep();
  }

  return (
    <WizardFooterWrapper>
      <Button variant="secondary" onClick={close}>
        Cancel
      </Button>
      <Button variant="primary" onClick={onNext} isDisabled={!props.hasSpecification}>
        Next
      </Button>
    </WizardFooterWrapper>
  );
}

function ConfigureOperationFooter(props: FooterProps) {
  const { goToNextStep, goToPrevStep, close } = useWizardContext();

  async function onNext() {
    goToNextStep();
  }

  return (
    <WizardFooterWrapper>
      <Button variant="secondary" onClick={goToPrevStep}>
        Back
      </Button>
      <Button variant="secondary" onClick={close}>
        Cancel
      </Button>
      <Button variant="primary" onClick={onNext}>
        Next
      </Button>
    </WizardFooterWrapper>
  );
}

function ConfigureHostFooter(props: FooterProps) {
  const { goToNextStep, goToPrevStep, close } = useWizardContext();

  async function onNext() {
    goToNextStep();
    props.footerCallback();
  }

  return (
    <WizardFooterWrapper>
      <Button variant="secondary" onClick={goToPrevStep}>
        Back
      </Button>
      <Button variant="secondary" onClick={close}>
        Cancel
      </Button>
      <Button variant="primary" onClick={onNext}>
        Configure
      </Button>
    </WizardFooterWrapper>
  );
}

export const OpenApiConfigure: FunctionComponent<Props> = (props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [openApiError, setOpenApiError] = useState('');
  const [specUrl, setSpecUrl] = useState(props.specificationUri);
  const [hasSpecification, setHasSpecification] = useState(false);
  const [openApi, setOpenApi] = useState<OpenApi>();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [operationId, setOperationId] = useState(props.operationId);
  const [hostName, setHostName] = useState(props.host);
  const [filtered, setFiltered] = useState<Operation[]>([]);
  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const entitiesContext = useContext(EntitiesContext);
  const navigate = useNavigate();

  const handlePageChange = (newPageNumber: number) => {
    setPageNumber(newPageNumber);
  };

  const handleSearch = useCallback(() => {
    const filtered = operations.filter((operation) => operation.operationId.includes(search));
    setFiltered(filtered);
  }, [search, operations]);

  const updateSpecification = useCallback((value: string, url: string) => {
    //console.log("Updating specification: " + value);
    if (value !== '') {
      if (value.startsWith('openapi:')) {
        const spec: OpenApi = parse(value);
        populateOperations(spec);
        setOpenApi(spec);
        setOpenApiError('');
      } else if (value.match('.*"openapi":.*')) {
        const spec: OpenApi = JSON.parse(value);
        populateOperations(spec);
        setOpenApi(spec);
        setOpenApiError('');
      } else {
        setOpenApiError('Invalid specification provided');
      }

      setSpecUrl(url);
      setHasSpecification(true);
    }
  }, []);

  const populateOperations = (spec: OpenApi) => {
    const specOperations: Array<Operation> = [];

    Object.values(spec.paths ?? {}).forEach((path, index) => {
      VALID_METHODS.forEach((method) => {
        if (!isDefined(path[method])) {
          return;
        }

        const currentOperationId = path[method].operationId;

        const operation: Operation = {
          selected: currentOperationId! == operationId,
          operationId: currentOperationId!,
          httpMethod: method,
          path: Object.keys(spec.paths)[index],
        };

        specOperations.push(operation);
      });
    });

    setOperations(specOperations);
  };

  const selectOperation = (selectedOperationId: string) => {
    const newOperations = operations.filter((operation) => {
      if (operation.operationId == selectedOperationId) {
        operation.selected = true;
      } else {
        operation.selected = false;
      }

      return operation;
    });

    setOperationId(selectedOperationId);
    setOperations(newOperations);
  };

  const updateHostName = (value: string) => {
    setHostName(value);
  };

  const configureRestOpenApiClientRecurse = (contextNode: IVisualizationNode) => {
    if (contextNode.getTitle() == 'rest-openapi' && contextNode.getId() == props.restOpenApiId) {
      console.log('Found rest-api, updating');

      let currentDefinition = { parameters: {} };
      if (isDefined(contextNode.getComponentSchema())) {
        currentDefinition = contextNode.getComponentSchema()!.definition;
      }

      const newDefinition = {
        ...currentDefinition,
        parameters: {
          ...currentDefinition.parameters,
          host: hostName,
          operationId: operationId,
          specificationUri: specUrl,
        },
      };
      contextNode.updateModel(newDefinition);

      entitiesContext?.updateSourceCodeFromEntities();
      entitiesContext?.updateEntitiesFromCamelResource();
    } else {
      contextNode.getChildren()?.forEach((child) => {
        configureRestOpenApiClientRecurse(child);
      });
    }
  };

  const configureRestOpenApiClient = () => {
    entitiesContext?.camelResource.getVisualEntities().filter((entity: BaseVisualCamelEntity) => {
      if (entity.type === EntityType.Route) {
        const route: CamelRouteVisualEntity = entity as CamelRouteVisualEntity;

        route
          .toVizNode()
          .getChildren()
          ?.forEach((child) => {
            configureRestOpenApiClientRecurse(child);
          });
      }
    });
  };

  const onConfigure = () => {
    configureRestOpenApiClient();
    props.openApiConfigureToggle();
  };

  const onCancel = useCallback(() => {
    props.openApiConfigureToggle();
  }, [props]);

  const onClose = useCallback(() => {
    props.openApiConfigureToggle();
  }, [props]);

  useEffect(() => {
    if (search === '') {
      setFiltered(operations);
    } else {
      handleSearch();
    }
  }, [search, openApiError, hasSpecification, operations, operationId]);

  return (
    <>
      <TextContent>
        <Text component={TextVariants.h1}>Configure Open API Consumer</Text>
      </TextContent>
      <Table title="Configure Open API Consumer">
        <Tbody>
          <Tr>
            <Td>
              <Wizard onClose={onClose} isVisitRequired>
                <WizardStep
                  name={`Specification`}
                  key={'specification'}
                  id={'specification'}
                  footer={<SubmitSpecificationFooter hasSpecification={hasSpecification} />}
                >
                  <OpenApiSpecification
                    updateSpecification={updateSpecification}
                    specificationUri={props.specificationUri}
                  />
                  {hasSpecification && (
                    <Alert variant="success" title="Specification provided">
                      <p>Specification provided, now proceed by clicking &quot;Next&quot;</p>
                    </Alert>
                  )}
                </WizardStep>
                <WizardStep
                  name="Operation"
                  key="operation"
                  id="operation"
                  footer={<ConfigureOperationFooter footerCallback={onConfigure} />}
                >
                  <Text>The following operations are included in the Open API specification and can be used:</Text>
                  <Table borders={false} variant="compact">
                    <Thead>
                      <Tr>
                        <Th colSpan={2}>
                          <ActionList>
                            <ActionListItem>
                              <SearchInput
                                aria-label="Search Open API input"
                                placeholder="Find Open API by specification"
                                onChange={(event, value) => setSearch(value)}
                              />
                            </ActionListItem>
                          </ActionList>
                        </Th>
                        <Th colSpan={2}>
                          <PaginationTop
                            itemCount={operations.length}
                            perPage={10}
                            pageChangeCallback={handlePageChange}
                          />
                        </Th>
                      </Tr>
                      <Tr>
                        <Th width={10}>Select</Th>
                        <Th width={20}>Operation ID</Th>
                        <Th width={10}>Method</Th>
                        <Th width={60}>Path</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filtered.map((operation, index) => {
                        if (index >= (pageNumber - 1) * 10 && index <= pageNumber * 10 - 1) {
                          return (
                            <Tr key={operation.operationId}>
                              <Td width={10}>
                                <Radio
                                  id={operation.operationId}
                                  isChecked={operation.selected || operations.length === 0}
                                  onChange={(_event, checked) => selectOperation(operation.operationId)}
                                  aria-label={operation.operationId}
                                />
                              </Td>
                              <Td width={20}>{operation.operationId}</Td>
                              <Td width={10}>{operation.httpMethod}</Td>
                              <Td withd={60}>{operation.path}</Td>
                            </Tr>
                          );
                        } else {
                          return;
                        }
                      })}
                      {filtered.length === 0 && search !== '' && (
                        <Tr>
                          <Td colSpan={4}>
                            <Bullseye>
                              <EmptyState variant={EmptyStateVariant.sm}>
                                <EmptyStateHeader
                                  icon={<EmptyStateIcon icon={SearchIcon} />}
                                  titleText="No results found"
                                  headingLevel="h2"
                                />
                                <EmptyStateBody>Clear all filters and try again.</EmptyStateBody>
                                <EmptyStateFooter>
                                  <EmptyStateActions>
                                    <Button variant="link">Clear all filters</Button>
                                  </EmptyStateActions>
                                </EmptyStateFooter>
                              </EmptyState>
                            </Bullseye>
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </WizardStep>
                <WizardStep
                  name="Host"
                  key="host"
                  id="host"
                  footer={<ConfigureHostFooter footerCallback={onConfigure} />}
                >
                  <Text>The hostname, where the Open API is exposed</Text>
                  <TextInput id="hostName" value={hostName} onChange={(e, value) => updateHostName(value)} />
                </WizardStep>
              </Wizard>
            </Td>
          </Tr>
        </Tbody>
      </Table>
    </>
  );
};

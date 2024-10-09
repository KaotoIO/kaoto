import { Rest, RouteDefinition } from '@kaoto/camel-catalog/types';
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
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Checkbox,
  DropEvent,
  FileUpload,
  Form,
  FormGroup,
  HelperText,
  HelperTextItem,
  InputGroup,
  Popover,
  SearchInput,
  Text,
  TextContent,
  TextVariants,
  TextInput,
  Wizard,
  WizardHeader,
  WizardStep,
  WizardFooterWrapper,
  useWizardContext,
  Title
} from '@patternfly/react-core';
import { Table, Thead, Th, Tbody, Td, Tr } from '@patternfly/react-table';
import SearchIcon from '@patternfly/react-icons/dist/esm/icons/search-icon';
import { OpenApi, OpenApiOperation, OpenApiPath } from 'openapi-v3';
import { FunctionComponent, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parse } from 'yaml';
import { BaseVisualCamelEntity, CamelRouteVisualEntity } from '../../../models';
import { EntityType } from '../../../models/camel/entities';
import { SourceSchemaType } from '../../../models/camel/source-schema-type';
import { CamelRestVisualEntity } from '../../../models/visualization/flows/camel-rest-visual-entity';
import { FlowTemplateService } from '../../../models/visualization/flows/support/flow-templates-service';
import { EntitiesContext } from '../../../providers/entities.provider';
import { isDefined } from '../../../utils';
import { OpenApiSpecification } from "./OpenApiSpecification";
import PaginationTop from '../../Visualization/Pagination/PaginationTop';

interface Props {
    openApiCreateToggle: () => void;
}

interface SpecificationFooterProps {
    hasSpecification: boolean;
}

interface FooterProps {
    footerCallback: any;
}

type OpenApiPathMethods = {
  [K in keyof Required<OpenApiPath>]: Required<OpenApiPath>[K] extends OpenApiOperation ? K : never;
}[keyof OpenApiPath];

const VALID_METHODS: OpenApiPathMethods[] = ['get', 'post', 'put', 'delete', 'head', 'patch'];

interface Operation {
    selected: boolean;
    routeExists: boolean;
    operationId: string;
    httpMethod: string;
    path: string;
}

function SubmitSpecificationFooter (props: SpecificationFooterProps) {
    const { goToNextStep, close } = useWizardContext();
    
    async function onNext() {
      goToNextStep();
    }

    return (
      <WizardFooterWrapper>
        <Button variant="secondary" onClick={close}>Cancel</Button>
        <Button variant="primary" onClick={onNext} isDisabled={!props.hasSpecification}>Next</Button>
      </WizardFooterWrapper>
    );
};

function CreateOpenApiFooter (props: FooterProps) {
    const { goToNextStep, goToPrevStep, close } = useWizardContext();
    
    async function onNext() {
      goToNextStep();
      props.footerCallback();
    }
  
    return (
      <WizardFooterWrapper>
        <Button variant="secondary" onClick={goToPrevStep}>Back</Button>
        <Button variant="secondary" onClick={close}>Cancel</Button>
        <Button variant="primary" onClick={onNext}>Create</Button>
      </WizardFooterWrapper>
    );
};

export const OpenApiCreate : FunctionComponent<Props> = (props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [openApiError, setOpenApiError] = useState('');
  const [specUrl, setSpecUrl] = useState('');
  const [hasSpecification, setHasSpecification] = useState(false);
  const [openApi, setOpenApi] = useState<OpenApi>();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [filtered, setFiltered] = useState<Operation[]>([]);
  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [allOperationsSelected, setAllOperationsSelected ] = useState<boolean>(true);
  const entitiesContext = useContext(EntitiesContext);
  const navigate = useNavigate();

  const handlePageChange = (newPageNumber: number) => {
    setPageNumber(newPageNumber);
  };

  const handleSearch = useCallback(() => {
    const filtered = operations.filter(operation => operation.operationId.includes(search));
    setFiltered(filtered);

  },[search, operations]);

  const updateSpecification = useCallback((value: string, url: string) => {

    console.log("Updating specification: " + value);
    if (value !== '') {    
        if (value.startsWith('openapi:')) {
            var spec: OpenApi = parse(value);
            populateOperations(spec);
            setOpenApi(openApi);
            setOpenApiError('');
        } else if (value.match('.*"openapi":.*')) {
            var spec: OpenApi = JSON.parse(value)
            populateOperations(spec);
            setOpenApi(openApi);
            setOpenApiError('');
        } else {
            setOpenApiError('Invalid specification provided');
        }

        setSpecUrl(url);
        setHasSpecification(true);
    }
  }, []);

  const populateOperations = (spec: OpenApi) => {
    var specOperations: Array<Operation> = [];

    Object.values(spec.paths ?? {}).forEach((path, index) => {
        VALID_METHODS.forEach((method) => {
          if (!isDefined(path[method])) {
            return;
          }
  
          const operationId = path[method].operationId;

          var operation: Operation = {
            selected: true,
            routeExists: false,
            operationId: operationId!,
            httpMethod: method,
            path: Object.keys(spec.paths)[index],
          }

          entitiesContext?.camelResource.getVisualEntities().forEach((entity: BaseVisualCamelEntity) => {
            if (
                entity.type === EntityType.Route &&
                (entity as CamelRouteVisualEntity).route?.from?.uri === 'direct:' + operationId
            ) {
                operation.routeExists = true
            }
          });

          specOperations.push(operation);
        });
    });

    setOperations(specOperations);
  }

  const selectAllOperations = (selected: boolean) => {

    console.log("Select all operations " + selected);

    var updatedOperations: Operation[] = operations.filter(operation => {
        operation.selected = selected;

        return operation;
    });

    setOperations(updatedOperations);
    setAllOperationsSelected(selected);
  }

  const selectOperation = (operationId: string, selected: boolean) => {

    console.log("Select operation " + operationId + " " + selected);

    var updatedOperations: Operation[] = operations.filter(operation => {
        if (operation.operationId == operationId) {
            operation.selected = selected;

            if (allOperationsSelected && selected == false)
                setAllOperationsSelected(false);
        };

        return operation;
    });

    setOperations(updatedOperations);
  };

  const createOpenApiElements = () => {
    setOpenApiError('');

    operations.forEach((operation) => {
    if (operation.selected) {
        const operationId = operation.operationId;
        const route: RouteDefinition = {
        from: {
            uri: 'direct:' + operationId,
            steps: [{ setBody: {
                constant: 'Operation ' + operationId + ' not yet implemented' 
                }
            }],
        },
        };

        let routeExists: boolean = false;
        entitiesContext?.camelResource.getVisualEntities().forEach((entity: BaseVisualCamelEntity) => {
        if (
            entity.type === EntityType.Route &&
            (entity as CamelRouteVisualEntity).route?.from?.uri === 'direct:' + operationId
        ) {
            routeExists = true;
        }
        });

        if (!routeExists) {
            const entity = new CamelRouteVisualEntity(route);
            entitiesContext?.camelResource.addExistingEntity(entity);
        }
    }
    });

    let restExists: boolean = false;

    entitiesContext?.camelResource.getVisualEntities().forEach((entity: BaseVisualCamelEntity) => {
      if (entity.type === EntityType.Rest) {
        if ((entity as CamelRestVisualEntity).restDef.rest?.openApi?.specification === specUrl) {
          restExists = true;
        }
      }
    });

    if (!restExists) {
      /*const rest: Rest = FlowTemplateService.getFlowTemplate(SourceSchemaType.Rest);
      rest.openApi = rest.openApi ?? { specification: '' };
      rest.openApi.specification = specUrl;
      const entity = new CamelRestVisualEntity( {rest });*/
      var rest = {
        rest: {
            openApi: {
                specification: specUrl
            }
        }
      }
      const entity = new CamelRestVisualEntity( rest );
      entitiesContext?.camelResource.addExistingEntity(entity);
    }

    entitiesContext?.updateSourceCodeFromEntities();
    entitiesContext?.updateEntitiesFromCamelResource();
  };

  const onCreate = () => {
    createOpenApiElements();
    props.openApiCreateToggle();
  };

  const onCancel = useCallback(() => {
    props.openApiCreateToggle();
  }, [props]);

  const onClose = useCallback(() => {
    props.openApiCreateToggle();
  }, [props]);

  useEffect(() => {
    if (search === ''){
        setFiltered(operations);
    } else {
        handleSearch();
    }
  }, [search, openApiError, hasSpecification, operations]);

  return (
    <>
        <TextContent>
            <Text component={TextVariants.h1}>Add Open API</Text>
        </TextContent>
        <Table title='Add Open API'>
            <Tbody>
                <Tr>
                    <Td>
                        <Wizard onClose={onClose} isVisitRequired>
                            <WizardStep name={`Specification`} key={'specification'} id={'specification'} footer={<SubmitSpecificationFooter hasSpecification={hasSpecification}/>}>
                                <OpenApiSpecification updateSpecification={updateSpecification}/>
                                {hasSpecification &&
                                    <Alert
                                        variant="success" title="Specification provided">
                                        <p>Specification provided, now proceed by clicking "Next"</p>
                                    </Alert>
                                }
                            </WizardStep>
                            <WizardStep
                                name="Review"
                                key="review"
                                id="review"
                                footer={<CreateOpenApiFooter footerCallback={onCreate}/>}
                            >
                            <Text>The following operations are included in the Open API specification and will be added automatically:</Text>
                            <Table borders={false} variant="compact">
                                <Thead>
                                    <Tr>
                                        <Th>
                                            <ActionList>
                                                <ActionListItem>
                                                    <SearchInput aria-label="Search Open API input" placeholder="Find Open API by specification" onChange={(event, value) => setSearch(value)}/>
                                                </ActionListItem>
                                            </ActionList>
                                        </Th>
                                        <Th colSpan={4}>
                                            <PaginationTop itemCount={operations.length} perPage={10} pageChangeCallback={handlePageChange}/>
                                        </Th>
                                    </Tr>
                                    <Tr>
                                        <Th><Checkbox id="select_all_operations" isChecked={allOperationsSelected} onChange={(_event, checked) => selectAllOperations(checked)}/></Th>
                                        <Th>Operation ID</Th>
                                        <Th>Method</Th><Th>Path</Th><Th/>
                                    </Tr>   
                                </Thead>
                                <Tbody>
                                    {filtered.map((operation, index) => {
                                        if (index >= ((pageNumber-1)*10) && index <= (pageNumber)*10-1) {
                                        return <Tr key={operation.operationId}>
                                                    <Td width={10}><Checkbox id={operation.operationId} isDisabled={operation.routeExists} isChecked={operation.selected} onChange={(_event, checked) => selectOperation(operation.operationId, checked)}/></Td>
                                                    <Td width={20}>{operation.operationId}</Td>
                                                    <Td width={10}>{operation.httpMethod}</Td>
                                                    <Td>{operation.path}</Td>
                                                    {operation.routeExists &&
                                                    <Td>Route already exists</Td>
                                                    }
                                                </Tr>;
                                        } else {
                                            return;
                                        }
                                    })}
                                    {filtered.length === 0 && search !== '' &&
                                        <Tr>
                                            <Td colSpan={4}>
                                                <Bullseye>
                                                    <EmptyState variant={EmptyStateVariant.sm}>
                                                        <EmptyStateHeader icon={<EmptyStateIcon icon={SearchIcon} />} titleText="No results found" headingLevel="h2" />
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
                                        }
                                </Tbody>    
                            </Table>
                            </WizardStep>
                        </Wizard>
                    </Td>
                </Tr>
            </Tbody>
        </Table>
    </>
    );
};

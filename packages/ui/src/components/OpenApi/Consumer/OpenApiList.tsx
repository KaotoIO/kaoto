import { useCallback, useContext, useEffect, useState } from 'react';
import {
    ActionList,
    ActionListItem,
    Bullseye,
    Button,
    EmptyState,
    EmptyStateActions,
    EmptyStateBody,
    EmptyStateFooter,
    EmptyStateHeader,
    EmptyStateIcon,
    EmptyStateVariant,
    Icon,
    SearchInput
    } from '@patternfly/react-core';
import { Table, Thead, Th, Tbody, Td, Tr } from '@patternfly/react-table';
import PlusCircleIcon from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon';
import DeleteIcon from '@patternfly/react-icons/dist/esm/icons/trash-icon';
import SearchIcon from '@patternfly/react-icons/dist/esm/icons/search-icon';

import { EntityType } from '../../../models/camel/entities';
import { CamelRestVisualEntity } from '../../../models/visualization/flows/camel-rest-visual-entity';
import { EntitiesContext } from '../../../providers/entities.provider';
import PaginationTop from '../../Visualization/Pagination/PaginationTop';
import { OpenApiConfigure } from './OpenApiConfigure';
import { BaseVisualCamelEntity, IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { CamelRouteVisualEntity } from '../../../models/visualization/flows/camel-route-visual-entity';


interface RestOpenApi {
    id: string;
    specificationUri: string;
    operationId: string;
    host: string;
}

export default function OpenApis() {
    const [restOpenApiId, setRestOpenApiId] = useState('');
    const [specificationUri, setSpecificationUri] = useState('');
    const [operationId, setOperationId] = useState('');
    const [host, setHost] = useState('');;
    const [restOpenApis, setRestOpenApis] = useState<RestOpenApi[]>([]);
    const [filtered, setFiltered] = useState<RestOpenApi[]>([]);
    const [search, setSearch] = useState('');
    const [pageNumber, setPageNumber] = useState(1);
    const [openApiConfigureOpen, setOpenApiConfigureOpen] = useState(false);
    const entitiesContext = useContext(EntitiesContext);
    
    const handlePageChange = (newPageNumber: number) => {
        setPageNumber(newPageNumber);
      };

    const handleSearch = useCallback(() => {
        const filtered = restOpenApis.filter(restOpenApi => restOpenApi.specificationUri.includes(search));
        setFiltered(filtered);

    },[search, restOpenApis]);

    const openApiConfigure = (currentRestOpenApiId: string) => {
        restOpenApis.forEach((currentRestOpenApi) => {
            if (currentRestOpenApi.id == currentRestOpenApiId) {
                setRestOpenApiId(currentRestOpenApi.id);
                setSpecificationUri(currentRestOpenApi.specificationUri);
                setOperationId(currentRestOpenApi.operationId);
                setHost(currentRestOpenApi.host);
            }
        });

        openApiConfigureToggle();
    };

    const openApiConfigureToggle = useCallback(() => {
        setOpenApiConfigureOpen(!openApiConfigureOpen);
    },[openApiConfigureOpen]);

    const findRestOpenApiComponents = (contextNode: IVisualizationNode, newRestOpenApis: RestOpenApi[]) => {
        
        if (contextNode.getTitle() == 'rest-openapi') {
            console.log("Found rest-api");

            var newRestOpenApi: RestOpenApi = {
                id: contextNode.getId()!,
                specificationUri: contextNode.getComponentSchema()!.definition!.parameters.specificationUri,
                operationId: contextNode.getComponentSchema()!.definition!.parameters.operationId,
                host: contextNode.getComponentSchema()!.definition!.parameters.host
            }

            newRestOpenApis.push(newRestOpenApi);
        }

        contextNode.getChildren()?.forEach((child) => {
            findRestOpenApiComponents(child, newRestOpenApis);
        });
    }

    useEffect(() => {
        console.log("Useeffect for Consumer");

        var newRestOpenApis: RestOpenApi[] = new Array<RestOpenApi>;

        entitiesContext?.camelResource.getVisualEntities().filter((entity: BaseVisualCamelEntity) => {
            console.log("Found route");
            if (entity.type === EntityType.Route) {

                var route: CamelRouteVisualEntity  = entity as CamelRouteVisualEntity;

                route.toVizNode().getChildren()?.forEach((child) => {
                    findRestOpenApiComponents(child, newRestOpenApis);
                });
            }
          });

        setRestOpenApis(newRestOpenApis);

        if (search === ''){
            setFiltered(newRestOpenApis);
        } else {
            handleSearch();
        }
      }, [search, openApiConfigureOpen]);


    return(
        <>
        {openApiConfigureOpen &&
            <OpenApiConfigure openApiConfigureToggle={openApiConfigureToggle} restOpenApiId={restOpenApiId} specificationUri={specificationUri} operationId={operationId} host={host}/>
        }
        {!openApiConfigureOpen &&
        <Table borders={false} variant="compact">
            <Thead noWrap>
                <Tr>
                    <Th width={30} colSpan={2}>
                        <ActionList>
                            <ActionListItem>
                                <SearchInput aria-label="Search Open API input" placeholder="Find Open API by specification" onChange={(event, value) => setSearch(value)}/>
                            </ActionListItem>
                        </ActionList>
                    </Th>
                   <Th width={70} colSpan={3}>
                     <PaginationTop itemCount={restOpenApis.length} perPage={10} pageChangeCallback={handlePageChange}/>
                    </Th>
                </Tr>
                <Tr>
                    <Th width={20}>ID</Th>
                    <Th width={40}>Specification</Th>
                    <Th width={20}>Operation</Th>
                    <Th>Host</Th>
                    <Th width={20}>Actions</Th>
                </Tr>
            </Thead>
            <Tbody>
                {filtered.map((restOpenApi, index) => {
                    if (index >= ((pageNumber-1)*10) && index <= (pageNumber)*10-1) {
                    return <Tr key={restOpenApi.id}>
                                <Td width={10}>{restOpenApi.id}</Td>
                                <Td width={20}>{restOpenApi.specificationUri}</Td>
                                <Td width={20}>{restOpenApi.operationId}</Td>
                                <Td width={20}>{restOpenApi.host}</Td>
                                <Td>
                                    <ActionList>
                                        <ActionListItem>
                                            <Button onClick={() => openApiConfigure(restOpenApi.id)}>Configure Open API</Button>
                                        </ActionListItem>
                                    </ActionList>
                                </Td>
                            </Tr>;
                    } else {
                        return;
                    }
                })}
            </Tbody>    
        </Table>
        }
        </>
    );
}
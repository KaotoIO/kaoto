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
  SearchInput,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import { Table, Thead, Th, Tbody, Td, Tr } from '@patternfly/react-table';
import PlusCircleIcon from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon';
import DeleteIcon from '@patternfly/react-icons/dist/esm/icons/trash-icon';
import SearchIcon from '@patternfly/react-icons/dist/esm/icons/search-icon';

import { EntityType } from '../../../models/camel/entities';
import { CamelRestVisualEntity } from '../../../models/visualization/flows/camel-rest-visual-entity';
import { EntitiesContext } from '../../../providers/entities.provider';
import PaginationTop from '../../Visualization/Pagination/PaginationTop';
import { OpenApiCreate } from './OpenApiCreate';
import { BaseVisualCamelEntity } from '../../../models/visualization/base-visual-entity';

interface OpenApi {
  id: string;
  specification: string;
}

export default function OpenApis() {
  const [openApiId, setOpenApiId] = useState('');
  const [openApis, setOpenApis] = useState<OpenApi[]>([]);
  const [filtered, setFiltered] = useState<OpenApi[]>([]);
  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [openApiCreateOpen, setOpenApiCreateOpen] = useState(false);
  const [openApiDeleteOpen, setOpenApiDeleteOpen] = useState(false);
  const entitiesContext = useContext(EntitiesContext);

  const handlePageChange = (newPageNumber: number) => {
    setPageNumber(newPageNumber);
  };

  const handleSearch = useCallback(() => {
    const filtered = openApis.filter((openApi) => openApi.specification.includes(search));
    setFiltered(filtered);
  }, [search, openApis]);

  const openApiCreateToggle = useCallback(() => {
    setOpenApiCreateOpen(!openApiCreateOpen);
  }, [openApiCreateOpen]);

  const openApiDeleteToggle = useCallback(
    (openApiId: string) => {
      setOpenApiId(openApiId);
      setOpenApiDeleteOpen(!openApiDeleteOpen);
    },
    [openApiDeleteOpen],
  );

  const handleDeleteOpenApi = (openApiId: string) => {
    entitiesContext?.camelResource.getVisualEntities().filter((entity: BaseVisualCamelEntity) => {
      if (entity.type === EntityType.Rest && entity.getId() == openApiId) {
        entitiesContext?.camelResource.removeEntity(entity.getId());
      }
    });

    entitiesContext?.updateSourceCodeFromEntities();
    entitiesContext?.updateEntitiesFromCamelResource();

    const newOpenApis = openApis.filter((openApi) => openApi.id !== openApiId);

    setOpenApis(newOpenApis);
    setFiltered(newOpenApis);
  };

  useEffect(() => {
    const newOpenApis = new Array<OpenApi>();

    entitiesContext?.camelResource.getVisualEntities().filter((entity: BaseVisualCamelEntity) => {
      if (entity.type === EntityType.Rest && (entity as CamelRestVisualEntity).restDef.rest.openApi) {
        const newOpenApi: OpenApi = {
          id: entity.getId(),
          specification: (entity as CamelRestVisualEntity).restDef.rest.openApi!.specification,
        };

        newOpenApis.push(newOpenApi);
      }
    });

    setOpenApis(newOpenApis);

    if (search === '') {
      setFiltered(newOpenApis);
    } else {
      handleSearch();
    }
  }, [search, openApiCreateOpen, openApiDeleteOpen]);

  return (
    <>
      {openApiCreateOpen && <OpenApiCreate openApiCreateToggle={openApiCreateToggle} />}
      {!openApiCreateOpen && (
        <div>
          <TextContent>
            <Text component={TextVariants.h1}>Configure Open API Producers</Text>
          </TextContent>
          <Table borders={false} variant="compact">
            <Thead noWrap>
              <Tr>
                <Th width={30} colSpan={2}>
                  <ActionList>
                    <ActionListItem>
                      <Button onClick={openApiCreateToggle}>Add Open API Producer</Button>
                    </ActionListItem>
                    <ActionListItem>
                      <SearchInput
                        aria-label="Search Open API input"
                        placeholder="Find Open API by specification"
                        onChange={(event, value) => setSearch(value)}
                      />
                    </ActionListItem>
                  </ActionList>
                </Th>
                <Th width={70}>
                  <PaginationTop itemCount={openApis.length} perPage={10} pageChangeCallback={handlePageChange} />
                </Th>
              </Tr>
              <Tr>
                <Th width={20}>ID</Th>
                <Th width={60} colSpan={2}>
                  Specification
                </Th>
                <Th width={20}>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filtered.map((openApi, index) => {
                if (index >= (pageNumber - 1) * 10 && index <= pageNumber * 10 - 1) {
                  return (
                    <Tr key={openApi.id}>
                      <Td>{openApi.id}</Td>
                      <Td colSpan={2}>{openApi.specification}</Td>
                      <Td>
                        <ActionList>
                          <ActionListItem key={openApi.id + '_action'}>
                            <Button onClick={() => handleDeleteOpenApi(openApi.id)}>Delete</Button>
                          </ActionListItem>
                        </ActionList>
                      </Td>
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
                        <EmptyStateBody>
                          No Open API matches your filter settings. Change your filter or add an Open API.
                        </EmptyStateBody>
                        <EmptyStateFooter>
                          <EmptyStateActions>
                            <Button onClick={openApiCreateToggle}>Add Open API</Button>
                          </EmptyStateActions>
                        </EmptyStateFooter>
                      </EmptyState>
                    </Bullseye>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </div>
      )}
    </>
  );
}

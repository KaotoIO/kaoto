import { Rest, RouteDefinition } from '@kaoto/camel-catalog/types';
import {
  ActionList,
  ActionListItem,
  Bullseye,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Checkbox,
  DropEvent,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateVariant,
  FileUpload,
  Form,
  FormGroup,
  HelperText,
  HelperTextItem,
  InputGroup,
  Popover,
  SearchInput,
  Tab,
  TabTitleText,
  Tabs,
  Text,
  TextInput,
} from '@patternfly/react-core';
import { Table, Thead, Th, Tbody, Td, Tr } from '@patternfly/react-table';
import { OpenApi, OpenApiOperation, OpenApiPath } from 'openapi-v3';
import { FunctionComponent, useCallback, useContext, useEffect, useState } from 'react';
import SearchIcon from '@patternfly/react-icons/dist/esm/icons/search-icon';
import { useNavigate } from 'react-router-dom';
import { parse } from 'yaml';
import { BaseVisualCamelEntity, CamelRouteVisualEntity } from '../../../models';
import { EntityType } from '../../../models/camel/entities';
import { SourceSchemaType } from '../../../models/camel/source-schema-type';
import { CamelRestVisualEntity } from '../../../models/visualization/flows/camel-rest-visual-entity';
import { FlowTemplateService } from '../../../models/visualization/flows/support/flow-templates-service';
import { EntitiesContext } from '../../../providers/entities.provider';
import { SettingsContext } from '../../../providers';
import { Links } from '../../../router/links.models';
import { isDefined } from '../../../utils';
import PaginationTop from '../../Visualization/Pagination/PaginationTop';

interface Props {
  updateSpecification: (spec: string, url: string) => void;
  specificationUri: string;
}

interface ApicurioArtifact {
  groupId: string;
  id: string;
  name: string;
  description: string;
  createdOn: string;
  createdBy: string;
  type: string;
  state: string;
  modifiedOn: string;
  modifiedBy: string;
}

interface ApicurioArtifactSearchResult {
  artifacts: ApicurioArtifact[];
  count: number;
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

export const OpenApiSpecification: FunctionComponent<Props> = (props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [activeTabKey, setActiveTabKey] = useState<string | number>(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [isDownloadDisabled, setIsDownloadDisabled] = useState(false);
  const [isUploadDisabled, setIsUploadDisabled] = useState(false);
  const [fileName, setFileName] = useState('');
  const [specification, setSpecification] = useState('');
  const [specificationUri, setSpecificationUri] = useState('');
  const [apicurioArtifacts, setApicurioArtifacts] = useState<ApicurioArtifact[]>([]);
  const [filtered, setFiltered] = useState<ApicurioArtifact[]>([]);
  const settingsAdapter = useContext(SettingsContext);

  const handlePageChange = (newPageNumber: number) => {
    setPageNumber(newPageNumber);
  };

  const handleSearch = useCallback(() => {
    const filtered = apicurioArtifacts.filter((apicurioArtifact) => apicurioArtifact.name.includes(search));
    setFiltered(filtered);
  }, [search, apicurioArtifacts]);

  const handleTabClick = (_event: unknown, tabIndex: string | number) => {
    setActiveTabKey(tabIndex);
  };

  const handleFileInputChange = (_, file: File) => {
    console.log('File Input Change called ' + file.name);

    setFileName(file.name);
    setSpecificationUri(file.name);
  };

  const handleTextChange = (_event: React.ChangeEvent<HTMLTextAreaElement>, value: string) => {
    setIsDownloadDisabled(true);

    setSpecification(value);
  };

  const handleDataChange = (_event: DropEvent, value: string) => {
    setSpecification(value);
  };

  const handleClear = (_event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    setFileName('');
    setSpecification('');
  };

  const handleFileReadStarted = (_event: DropEvent, _fileHandle: File) => {
    setIsLoading(true);
  };

  const handleFileReadFinished = (_event: DropEvent, _fileHandle: File) => {
    setIsLoading(false);
  };

  const updateDownloadUrl = (url: string) => {
    setDownloadUrl(url);
    setSpecificationUri(url);
  };

  const downloadFromUrl = () => {
    setIsUploadDisabled(true);

    fetch(downloadUrl, { method: 'GET', mode: 'cors' })
      .then((res) => res.text())
      .then((spec) => {
        updateSpecification(spec);
      });
  };

  const downloadFromApicurioRegistry = (id: string) => {
    const apicurioRegistryUrl = settingsAdapter.getSettings().apicurioRegistryUrl;

    const newSpecificationUri = apicurioRegistryUrl + '/apis/registry/v2/groups/default/artifacts/' + id;

    fetch(newSpecificationUri, { method: 'GET', mode: 'cors' })
      .then((res) => res.text())
      .then((spec) => {
        setSpecificationUri(newSpecificationUri);
        setSpecification(spec);
        props.updateSpecification(spec, newSpecificationUri);
      });
  };

  const updateSpecification = (spec: string) => {
    setSpecification(spec);
    props.updateSpecification(spec, specificationUri);
  };

  useEffect(() => {
    if (isDefined(props.specificationUri) && props.specificationUri.startsWith('http')) {
      updateDownloadUrl(props.specificationUri);
    }

    const apicurioRegistryUrl = settingsAdapter.getSettings().apicurioRegistryUrl;

    // TODO: Place this URL in a config file.
    fetch(apicurioRegistryUrl + '/apis/registry/v2/search/artifacts', { method: 'GET', mode: 'cors' })
      .then((res) => res.json() as Promise<ApicurioArtifactSearchResult>)
      .then((apicurioArtifactSearchResult) => {
        const newApicurioArtifacts: ApicurioArtifact[] = apicurioArtifactSearchResult.artifacts.filter(
          (apicurioArtifact) => {
            if (apicurioArtifact.type == 'OPENAPI') {
              return apicurioArtifact;
            }
          },
        );

        setApicurioArtifacts(newApicurioArtifacts);
        setFiltered(newApicurioArtifacts);
      });
  }, [isDownloadDisabled, isUploadDisabled, props.specificationUri, settingsAdapter]);

  return (
    <Tabs
      activeKey={activeTabKey}
      onSelect={handleTabClick}
      variant={'default'}
      isBox
      aria-label="Tabs in the box light variation example"
      role="region"
    >
      <Tab eventKey={0} title={<TabTitleText>From URL</TabTitleText>} aria-label="Box light variation content - users">
        <Form>
          <FormGroup isRequired onSubmit={downloadFromUrl}>
            <InputGroup>
              <TextInput
                id="operation-name"
                type="url"
                value={specificationUri}
                onChange={(_event, value) => updateDownloadUrl(value)}
                isDisabled={isDownloadDisabled}
              />
              <Button key="download_url" id="download_url" variant="tertiary" onClick={downloadFromUrl}>
                Download
              </Button>
              <Button key="clear_url" id="clear_url" variant="tertiary" isDisabled={true}>
                Clear
              </Button>
            </InputGroup>
          </FormGroup>
        </Form>
      </Tab>
      <Tab eventKey={1} title={<TabTitleText>From file</TabTitleText>} aria-label="Box light variation content - users">
        <Form>
          <FormGroup>
            <FileUpload
              id="text-file-simple"
              type="text"
              filename={fileName}
              filenamePlaceholder="Drag and drop a file or upload one"
              onFileInputChange={handleFileInputChange}
              onDataChange={handleDataChange}
              onTextChange={handleTextChange}
              onReadStarted={handleFileReadStarted}
              onReadFinished={handleFileReadFinished}
              onClearClick={handleClear}
              isLoading={isLoading}
              allowEditingUploadedText={false}
              hideDefaultPreview={true}
              isClearButtonDisabled={true}
              isDisabled={isUploadDisabled}
              browseButtonText="Upload"
            />
          </FormGroup>
        </Form>
      </Tab>
      <Tab
        eventKey={2}
        title={<TabTitleText>From Apicurio Registry</TabTitleText>}
        aria-label="Box light variation content - users"
      >
        <Table borders={false} variant="compact">
          <Thead noWrap>
            <Tr>
              <Th width={30}>
                <ActionList>
                  <ActionListItem>
                    <SearchInput
                      aria-label="Search Open API input"
                      placeholder="Find Open API by name"
                      onChange={(_event, value) => setSearch(value)}
                    />
                  </ActionListItem>
                </ActionList>
              </Th>
              <Th colSpan={70}>
                <PaginationTop
                  itemCount={apicurioArtifacts.length}
                  perPage={10}
                  pageChangeCallback={handlePageChange}
                />
              </Th>
            </Tr>
            <Tr>
              <Th width={30}>ID</Th>
              <Th colSpan={2} width={90}>
                Specification Name
              </Th>
              <Th width={10}>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map((apicurioArtifact, index) => {
              if (index >= (pageNumber - 1) * 10 && index <= pageNumber * 10 - 1) {
                return (
                  <Tr key={apicurioArtifact.id}>
                    <Td>{apicurioArtifact.id}</Td>
                    <Td colSpan={2}>{apicurioArtifact.name}</Td>
                    <Td>
                      <ActionList>
                        <ActionListItem key={apicurioArtifact.id + '_action'}>
                          <Button onClick={() => downloadFromApicurioRegistry(apicurioArtifact.id)} variant="primary">
                            Download
                          </Button>
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
      </Tab>
    </Tabs>
  );
};

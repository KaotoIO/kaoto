import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { parse as parseYaml } from 'yaml';

import { CamelResourceFactory } from '../../models/camel/camel-resource-factory';
import { EntityType } from '../../models/camel/entities';
import { REST_DSL_VERBS } from '../../models/special-processors.constants';
import { CamelRestVisualEntity } from '../../models/visualization/flows/camel-rest-visual-entity';
import { CamelRouteVisualEntity } from '../../models/visualization/flows/camel-route-visual-entity';
import { EntitiesContext, SettingsContext } from '../../providers';
import { SourceCodeContext } from '../../providers/source-code.provider';
import {
  ApicurioArtifact,
  ApicurioArtifactSearchResult,
  ImportLoadSource,
  ImportOperation,
  ImportSourceOption,
  RestVerb,
} from './restDslTypes';

const mapOpenApiParameterToCamelParam = (parameter: Record<string, unknown>): Record<string, unknown> | undefined => {
  const name = typeof parameter.name === 'string' ? parameter.name : undefined;
  const location = typeof parameter.in === 'string' ? parameter.in : undefined;
  if (!name || !location) return undefined;

  const schema = (parameter.schema as Record<string, unknown> | undefined) ?? {};
  const mapped: Record<string, unknown> = {
    name,
    type: location,
  };

  if (typeof parameter.required === 'boolean') {
    mapped.required = parameter.required;
  }
  if (typeof parameter.description === 'string' && parameter.description.trim()) {
    mapped.description = parameter.description;
  }
  if (typeof schema.type === 'string') {
    mapped.dataType = schema.type;
  }
  if ('default' in schema) {
    mapped.defaultValue = schema.default;
  }

  const enumValues = Array.isArray(schema.enum) ? schema.enum : undefined;
  if (enumValues?.length) {
    mapped.allowableValues = enumValues.map((value) => ({ value: String(value) }));
  }

  return mapped;
};

const buildCamelParamList = (
  pathItem: Record<string, unknown>,
  operation: Record<string, unknown>,
): Record<string, unknown>[] => {
  const merged = new Map<string, Record<string, unknown>>();
  const addParameters = (parameters: unknown) => {
    if (!Array.isArray(parameters)) return;
    parameters.forEach((parameter) => {
      if (!parameter || typeof parameter !== 'object') return;
      const asRecord = parameter as Record<string, unknown>;
      const name = typeof asRecord.name === 'string' ? asRecord.name : '';
      const location = typeof asRecord.in === 'string' ? asRecord.in : '';
      if (!name || !location) return;
      merged.set(`${location}:${name}`, asRecord);
    });
  };

  addParameters(pathItem.parameters);
  addParameters(operation.parameters);

  return Array.from(merged.values())
    .map(mapOpenApiParameterToCamelParam)
    .filter((item): item is Record<string, unknown> => Boolean(item));
};

const buildCamelSecurityList = (operation: Record<string, unknown>): Record<string, unknown>[] => {
  const security = operation.security;
  if (!Array.isArray(security)) return [];

  const mapped: Record<string, unknown>[] = [];
  security.forEach((securityRequirement) => {
    if (!securityRequirement || typeof securityRequirement !== 'object') return;
    Object.entries(securityRequirement as Record<string, unknown>).forEach(([key, value]) => {
      const scopes = Array.isArray(value) ? value.map((scope) => String(scope)).join(',') : '';
      mapped.push(scopes ? { key, scopes } : { key });
    });
  });

  return mapped;
};

const buildCamelResponseMessageList = (operation: Record<string, unknown>): Record<string, unknown>[] => {
  const responses = operation.responses as Record<string, unknown> | undefined;
  if (!responses || typeof responses !== 'object') return [];

  return Object.entries(responses).map(([code, response]) => {
    const responseRecord = (response as Record<string, unknown> | undefined) ?? {};
    const mapped: Record<string, unknown> = { code: String(code) };

    if (typeof responseRecord.description === 'string' && responseRecord.description.trim()) {
      mapped.message = responseRecord.description;
    }

    const headers = responseRecord.headers as Record<string, unknown> | undefined;
    if (headers && typeof headers === 'object') {
      const mappedHeaders = Object.entries(headers)
        .map(([name, headerValue]) => {
          const headerRecord = (headerValue as Record<string, unknown> | undefined) ?? {};
          const schema = (headerRecord.schema as Record<string, unknown> | undefined) ?? {};
          const mappedHeader: Record<string, unknown> = { name };
          if (typeof headerRecord.description === 'string' && headerRecord.description.trim()) {
            mappedHeader.description = headerRecord.description;
          }
          const enumValues = Array.isArray(schema.enum) ? schema.enum : undefined;
          if (enumValues?.length) {
            mappedHeader.allowableValues = enumValues.map((value) => ({ value: String(value) }));
          }
          return mappedHeader;
        })
        .filter((header) => Boolean(header.name));

      if (mappedHeaders.length > 0) {
        mapped.header = mappedHeaders;
      }
    }

    return mapped;
  });
};

const getOperationKey = (operation: Pick<ImportOperation, 'operationId' | 'method' | 'path'>): string =>
  `${operation.operationId}-${operation.method}-${operation.path}`;

export const applyRouteExistsToOperations = (
  operations: ImportOperation[],
  routeNames: Set<string>,
): ImportOperation[] =>
  operations.map((operation) => ({
    ...operation,
    routeExists: routeNames.has(operation.operationId),
  }));

export const toggleSelectAllOperations = (operations: ImportOperation[], checked: boolean): ImportOperation[] =>
  operations.map((operation) => ({
    ...operation,
    selected: operation.routeExists ? false : checked,
  }));

export const buildRestDefinitionFromOperations = (
  operations: ImportOperation[],
  restId: string,
  openApiSpecUri: string,
): Record<string, unknown> => {
  const restDefinition: Record<string, unknown> = { id: restId };
  const trimmedSpecUri = openApiSpecUri.trim();
  if (trimmedSpecUri) {
    restDefinition.openApi = { specification: trimmedSpecUri };
  }

  operations.forEach((operation) => {
    const methodKey = operation.method;
    const list = (restDefinition[methodKey] as Record<string, unknown>[] | undefined) ?? [];
    const operationDefinition: Record<string, unknown> = {
      id: operation.operationId,
      path: operation.path,
      routeId: `route-${operation.operationId}`,
      to: `direct:${operation.operationId}`,
    };
    const operationDescription = operation.description?.trim();
    if (operationDescription) {
      operationDefinition.description = operationDescription;
    }
    const operationConsumes = operation.consumes?.trim();
    if (operationConsumes) {
      operationDefinition.consumes = operationConsumes;
    }
    const operationProduces = operation.produces?.trim();
    if (operationProduces) {
      operationDefinition.produces = operationProduces;
    }
    if (operation.param && operation.param.length > 0) {
      operationDefinition.param = operation.param;
    }
    if (operation.responseMessage && operation.responseMessage.length > 0) {
      operationDefinition.responseMessage = operation.responseMessage;
    }
    if (operation.security && operation.security.length > 0) {
      operationDefinition.security = operation.security;
    }
    if (typeof operation.deprecated === 'boolean') {
      operationDefinition.deprecated = operation.deprecated;
    }
    list.push(operationDefinition);
    restDefinition[methodKey] = list;
  });

  return restDefinition;
};

export const buildOperationsFromSpec = (spec: Record<string, unknown>): ImportOperation[] => {
  const operations: ImportOperation[] = [];
  const paths = spec.paths as Record<string, unknown> | undefined;
  if (!paths) return operations;

  Object.entries(paths).forEach(([pathKey, definition]) => {
    if (!definition || typeof definition !== 'object') return;
    REST_DSL_VERBS.forEach((method) => {
      const op = (definition as Record<string, unknown>)[method] as Record<string, unknown> | undefined;
      if (!op) return;
      const operationId = (op.operationId as string | undefined) ?? `${method}-${pathKey}`;
      const description =
        typeof op.description === 'string' ? op.description : typeof op.summary === 'string' ? op.summary : undefined;
      const requestBodyContent = (op.requestBody as { content?: Record<string, unknown> } | undefined)?.content;
      const consumes = requestBodyContent ? Object.keys(requestBodyContent).join(',') : undefined;

      const responseEntries = Object.entries((op.responses as Record<string, unknown> | undefined) ?? {});
      const successResponse = responseEntries.find(([statusCode]) => /^2\d\d$/.test(statusCode))?.[1] as
        | { content?: Record<string, unknown> }
        | undefined;
      const fallbackResponse = responseEntries[0]?.[1] as { content?: Record<string, unknown> } | undefined;
      const responseContent = successResponse?.content ?? fallbackResponse?.content;
      const produces = responseContent ? Object.keys(responseContent).join(',') : undefined;
      const param = buildCamelParamList(definition as Record<string, unknown>, op);
      const security = buildCamelSecurityList(op);
      const responseMessage = buildCamelResponseMessageList(op);
      const deprecated = typeof op.deprecated === 'boolean' ? op.deprecated : undefined;

      operations.push({
        operationId,
        method,
        path: pathKey,
        description,
        consumes,
        produces,
        param,
        security,
        responseMessage,
        deprecated,
        selected: true,
        routeExists: false,
      });
    });
  });

  return operations;
};

type UseRestDslImportWizardArgs = {
  isActive: boolean;
};

export const useRestDslImportWizard = ({ isActive }: UseRestDslImportWizardArgs) => {
  const entitiesContext = useContext(EntitiesContext);
  const settingsAdapter = useContext(SettingsContext);
  const sourceCode = useContext(SourceCodeContext);
  const apicurioRegistryUrl = settingsAdapter.getSettings().rest.apicurioRegistryUrl;

  const [importOperations, setImportOperations] = useState<ImportOperation[]>([]);
  const [openApiLoadSource, setOpenApiLoadSource] = useState<ImportLoadSource>(undefined);
  const [importSource, setImportSource] = useState<ImportSourceOption>('file');
  const [importCreateRest, setImportCreateRest] = useState(false);
  const [importCreateRoutes, setImportCreateRoutes] = useState(true);
  const [importSelectAll, setImportSelectAll] = useState(true);
  const [isOpenApiParsed, setIsOpenApiParsed] = useState(false);
  const [openApiSpecText, setOpenApiSpecText] = useState('');
  const [openApiSpecUri, setOpenApiSpecUri] = useState('');
  const [openApiError, setOpenApiError] = useState('');
  const [apicurioSearch, setApicurioSearch] = useState('');
  const [apicurioError, setApicurioError] = useState('');
  const [apicurioArtifacts, setApicurioArtifacts] = useState<ApicurioArtifact[]>([]);
  const [filteredApicurioArtifacts, setFilteredApicurioArtifacts] = useState<ApicurioArtifact[]>([]);
  const [selectedApicurioId, setSelectedApicurioId] = useState('');
  const [isApicurioLoading, setIsApicurioLoading] = useState(false);
  const [isImportBusy, setIsImportBusy] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const openApiFileInputRef = useRef<HTMLInputElement | null>(null);

  const resetImportWizard = useCallback(() => {
    setImportOperations([]);
    setIsOpenApiParsed(false);
    setOpenApiSpecText('');
    setOpenApiSpecUri('');
    setOpenApiError('');
    setOpenApiLoadSource(undefined);
    setImportSource('uri');
    setImportCreateRest(false);
    setImportCreateRoutes(true);
    setImportSelectAll(true);
    setApicurioSearch('');
    setApicurioError('');
    setApicurioArtifacts([]);
    setFilteredApicurioArtifacts([]);
    setSelectedApicurioId('');
  }, []);

  const parseOpenApiSpec = useCallback((specText: string): boolean => {
    if (!specText.trim()) {
      setOpenApiError('Provide an OpenAPI specification to import.');
      setImportOperations([]);
      setIsOpenApiParsed(false);
      return false;
    }

    try {
      const spec = parseYaml(specText) as Record<string, unknown>;
      if (!spec || typeof spec !== 'object' || !('paths' in spec)) {
        throw new Error('Invalid spec');
      }
      setOpenApiSpecText(JSON.stringify(spec, null, 2));
      const operations = buildOperationsFromSpec(spec);
      if (operations.length === 0) {
        setOpenApiError('No operations were found in the specification.');
        setImportOperations([]);
        setIsOpenApiParsed(false);
        return false;
      }

      setOpenApiError('');
      setImportOperations(operations);
      setImportSelectAll(true);
      setIsOpenApiParsed(true);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid OpenAPI specification.';
      setOpenApiError(message);
      setImportOperations([]);
      setIsOpenApiParsed(false);
      return false;
    }
  }, []);

  const fetchApicurioArtifacts = useCallback(async () => {
    if (!apicurioRegistryUrl) {
      setApicurioError('Apicurio Registry URL is missing.');
      return;
    }

    setIsApicurioLoading(true);
    setApicurioError('');
    try {
      const response = await fetch(`${apicurioRegistryUrl}/apis/registry/v2/search/artifacts`);
      if (!response.ok) {
        throw new Error(`Failed to fetch artifacts (${response.status})`);
      }
      const result = (await response.json()) as ApicurioArtifactSearchResult;
      const artifacts = (result.artifacts ?? []).filter((artifact) => artifact.type === 'OPENAPI');
      setApicurioArtifacts(artifacts);
      setFilteredApicurioArtifacts(artifacts);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to fetch artifacts from Apicurio Registry.';
      setApicurioError(message);
    } finally {
      setIsApicurioLoading(false);
    }
  }, [apicurioRegistryUrl]);

  const handleLoadFromApicurio = useCallback(
    async (artifactId: string): Promise<boolean> => {
      if (!apicurioRegistryUrl) return false;

      setIsApicurioLoading(true);
      setApicurioError('');
      try {
        const artifactUrl = `${apicurioRegistryUrl}/apis/registry/v2/groups/default/artifacts/${artifactId}`;
        const response = await fetch(artifactUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch artifact (${response.status})`);
        }
        const specText = await response.text();
        const parsed = parseOpenApiSpec(specText);
        if (parsed) {
          setOpenApiLoadSource('apicurio');
        }
        setOpenApiSpecUri(artifactUrl);
        return parsed;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to download the selected artifact.';
        setApicurioError(message);
        return false;
      } finally {
        setIsApicurioLoading(false);
      }
    },
    [apicurioRegistryUrl, parseOpenApiSpec],
  );

  useEffect(() => {
    if (!isActive || importSource !== 'apicurio') return;
    fetchApicurioArtifacts();
  }, [fetchApicurioArtifacts, importSource, isActive]);

  useEffect(() => {
    if (!apicurioSearch.trim()) {
      setFilteredApicurioArtifacts(apicurioArtifacts);
      return;
    }
    const lowered = apicurioSearch.toLowerCase();
    setFilteredApicurioArtifacts(apicurioArtifacts.filter((artifact) => artifact.name.toLowerCase().includes(lowered)));
  }, [apicurioArtifacts, apicurioSearch]);

  const handleFetchOpenApiSpec = useCallback(async () => {
    const trimmed = openApiSpecUri.trim();
    if (!trimmed) {
      setOpenApiError('Provide a specification URI to fetch.');
      return false;
    }

    setIsImportBusy(true);
    setOpenApiError('');
    try {
      const response = await fetch(trimmed);
      if (!response.ok) {
        throw new Error(`Failed to fetch specification (${response.status})`);
      }
      const specText = await response.text();
      const parsed = parseOpenApiSpec(specText);
      if (parsed) {
        setOpenApiLoadSource('uri');
      }
      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to fetch the specification.';
      setOpenApiError(message);
      setIsOpenApiParsed(false);
      return false;
    } finally {
      setIsImportBusy(false);
    }
  }, [openApiSpecUri, parseOpenApiSpec]);

  const handleUploadOpenApiClick = useCallback(() => {
    openApiFileInputRef.current?.click();
  }, []);

  const handleUploadOpenApiFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const content = await file.text();
        const parsed = parseOpenApiSpec(content);
        if (parsed) {
          setOpenApiLoadSource('file');
        }
        setOpenApiSpecUri(file.name);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to read the uploaded specification.';
        setOpenApiError(message);
        setIsOpenApiParsed(false);
      } finally {
        event.target.value = '';
      }
    },
    [parseOpenApiSpec],
  );

  const importOperationsWithRouteExists = useMemo(() => {
    const routeNames = new Set<string>();
    const visualRoutes = entitiesContext?.visualEntities?.filter((entity) => entity.type === EntityType.Route) ?? [];
    if (visualRoutes.length > 0) {
      visualRoutes.forEach((entity) => {
        const routeEntity = entity as CamelRouteVisualEntity;
        const uri = routeEntity.entityDef?.route?.from?.uri ?? '';
        if (uri.startsWith('direct:')) {
          routeNames.add(uri.slice('direct:'.length).split('?')[0]);
        }
      });
    } else if (sourceCode) {
      const camelResource = CamelResourceFactory.createCamelResource(sourceCode);
      const routeEntities = camelResource.getEntities().filter((entity) => entity.type === EntityType.Route);
      routeEntities.forEach((entity) => {
        const model = entity.toJSON() as {
          route?: { id?: string; from?: { uri?: string; parameters?: { name?: string } } };
          id?: string;
          from?: { uri?: string; parameters?: { name?: string } };
        };
        const routeModel = model.route ?? model;
        const uri = routeModel.from?.uri ?? '';
        if (uri.startsWith('direct:')) {
          routeNames.add(uri.slice('direct:'.length).split('?')[0]);
          return;
        }
        if (uri === 'direct' && routeModel.from?.parameters?.name) {
          routeNames.add(routeModel.from.parameters.name);
        }
      });
    }

    return applyRouteExistsToOperations(importOperations, routeNames);
  }, [entitiesContext?.visualEntities, importOperations, sourceCode]);

  const handleToggleSelectAllOperations = useCallback(
    (checked: boolean) => {
      const routeExistsByKey = new Map(
        importOperationsWithRouteExists.map((operation) => [getOperationKey(operation), operation.routeExists]),
      );
      setImportOperations((prev) => {
        const withRouteExists = prev.map((operation) => ({
          ...operation,
          routeExists: routeExistsByKey.get(getOperationKey(operation)) ?? false,
        }));
        const next = toggleSelectAllOperations(withRouteExists, checked);
        const selectable = next.filter((operation) => !operation.routeExists);
        const allSelected = selectable.length > 0 && selectable.every((operation) => operation.selected);
        setImportSelectAll(allSelected);
        return next;
      });
    },
    [importOperationsWithRouteExists],
  );

  const handleToggleOperation = useCallback((operationId: string, method: RestVerb, path: string, checked: boolean) => {
    setImportOperations((prev) => {
      const next = prev.map((operation) =>
        operation.operationId === operationId && operation.method === method && operation.path === path
          ? { ...operation, selected: checked }
          : operation,
      );
      setImportSelectAll(next.every((operation) => operation.selected));
      return next;
    });
  }, []);

  const handleImportOpenApi = useCallback((): boolean => {
    if (!entitiesContext || (!importCreateRest && !importCreateRoutes)) {
      setImportStatus({
        type: 'error',
        message: 'Import failed. Choose at least one option to generate.',
      });
      return false;
    }
    const selectedOperations = importOperationsWithRouteExists.filter((operation) => operation.selected);
    if (selectedOperations.length === 0) {
      setOpenApiError('Select at least one operation to import.');
      setImportStatus({
        type: 'error',
        message: 'Import failed. Select at least one operation.',
      });
      return false;
    }

    const camelResource = entitiesContext.camelResource as {
      addNewEntity: (type?: EntityType) => string;
      getVisualEntities: () => Array<{ id: string; type: EntityType }>;
    };

    if (importCreateRoutes) {
      selectedOperations.forEach((operation) => {
        if (operation.routeExists) return;
        const newId = camelResource.addNewEntity(EntityType.Route);
        const routeEntity = camelResource
          .getVisualEntities()
          .find((entity) => entity.type === EntityType.Route && entity.id === newId) as
          | CamelRouteVisualEntity
          | undefined;

        routeEntity?.updateModel('route.id', `route-${operation.operationId}`);
        routeEntity?.updateModel('route.from.id', `direct-from-${operation.operationId}`);
        routeEntity?.updateModel('route.from.uri', `direct:${operation.operationId}`);
        routeEntity?.updateModel('route.from.steps', [
          {
            setBody: {
              constant: `Operation ${operation.operationId} not yet implemented`,
            },
          },
        ]);
      });
    }

    if (importCreateRest) {
      const newRestId = camelResource.addNewEntity(EntityType.Rest);
      const restEntity = camelResource
        .getVisualEntities()
        .find((entity) => entity.type === EntityType.Rest && entity.id === newRestId) as
        | CamelRestVisualEntity
        | undefined;

      if (restEntity) {
        const restDefinition = buildRestDefinitionFromOperations(selectedOperations, newRestId, openApiSpecUri);
        restEntity.updateModel(restEntity.getRootPath(), restDefinition);
      }
    }

    entitiesContext.updateEntitiesFromCamelResource();
    setImportStatus({
      type: 'success',
      message: `Import succeeded. ${selectedOperations.length} operation${selectedOperations.length === 1 ? '' : 's'} added.`,
    });
    return true;
  }, [entitiesContext, importCreateRest, importCreateRoutes, importOperationsWithRouteExists, openApiSpecUri]);

  const handleImportSourceChange = useCallback((nextSource: ImportSourceOption) => {
    setImportSource(nextSource);
    setOpenApiError('');
    setApicurioError('');
    setImportOperations([]);
    setIsOpenApiParsed(false);
    setOpenApiLoadSource(undefined);
    setImportSelectAll(true);
    setSelectedApicurioId('');
  }, []);

  const handleWizardNext = useCallback(async () => {
    if (isImportBusy) return false;
    setOpenApiError('');
    setApicurioError('');

    if (importSource === 'uri') {
      if (!openApiSpecUri.trim()) {
        setOpenApiError('Provide a specification URI to fetch.');
        return false;
      }
      const ok = await handleFetchOpenApiSpec();
      if (!ok) return false;
    } else if (importSource === 'file') {
      if (!isOpenApiParsed) {
        setOpenApiError('Upload a specification file to continue.');
        return false;
      }
    } else {
      if (!selectedApicurioId) {
        setApicurioError('Select an artifact to continue.');
        return false;
      }
      setIsImportBusy(true);
      const ok = await handleLoadFromApicurio(selectedApicurioId);
      setIsImportBusy(false);
      if (!ok) return false;
    }

    if (!isOpenApiParsed) {
      setOpenApiError('Parse the specification before continuing.');
      return false;
    }

    return true;
  }, [
    handleFetchOpenApiSpec,
    handleLoadFromApicurio,
    importSource,
    isImportBusy,
    isOpenApiParsed,
    openApiSpecUri,
    selectedApicurioId,
  ]);

  const handleParseOpenApiSpec = useCallback(() => {
    parseOpenApiSpec(openApiSpecText);
  }, [openApiSpecText, parseOpenApiSpec]);

  return {
    openApiSpecUri,
    openApiSpecText,
    openApiError,
    apicurioRegistryUrl,
    apicurioError,
    apicurioSearch,
    filteredApicurioArtifacts,
    selectedApicurioId,
    isApicurioLoading,
    isImportBusy,
    isOpenApiParsed,
    importCreateRest,
    importCreateRoutes,
    importSelectAll,
    importOperations: importOperationsWithRouteExists,
    openApiLoadSource,
    importSource,
    importStatus,
    openApiFileInputRef,
    resetImportWizard,
    setOpenApiSpecUri,
    setOpenApiSpecText,
    setApicurioSearch,
    setSelectedApicurioId,
    setImportCreateRest,
    setImportCreateRoutes,
    handleFetchOpenApiSpec,
    handleParseOpenApiSpec,
    handleImportSourceChange,
    handleToggleSelectAllOperations,
    handleToggleOperation,
    handleUploadOpenApiClick,
    handleUploadOpenApiFile,
    handleWizardNext,
    handleImportOpenApi,
    fetchApicurioArtifacts,
  };
};

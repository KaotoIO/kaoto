import { OpenApi } from 'openapi-v3';
import { useCallback, useContext, useMemo, useState } from 'react';
import { parse as parseYaml } from 'yaml';

import { EntityType } from '../../models/camel/entities';
import { CamelRestVisualEntity } from '../../models/visualization/flows/camel-rest-visual-entity';
import { CamelRouteVisualEntity } from '../../models/visualization/flows/camel-route-visual-entity';
import { EntitiesContext, SettingsContext } from '../../providers';
import { OpenApiProcessingService } from '../../services/openapi-processing.service';
import { ImportLoadSource, ImportOperation, ImportSourceOption, SchemaLoadedResult } from './RestDslImportTypes';

export const useRestDslImportWizard = () => {
  const entitiesContext = useContext(EntitiesContext);
  const settingsAdapter = useContext(SettingsContext);
  const apicurioRegistryUrl = settingsAdapter.getSettings().rest.apicurioRegistryUrl;

  const [importOperations, setImportOperations] = useState<ImportOperation[]>([]);
  const [openApiLoadSource, setOpenApiLoadSource] = useState<ImportLoadSource>(undefined);
  const [importSource, setImportSource] = useState<ImportSourceOption>('file');
  const [importCreateRest, setImportCreateRest] = useState(false);
  const [importCreateRoutes, setImportCreateRoutes] = useState(true);
  const [importSelectAll, setImportSelectAll] = useState(true);
  const [isOpenApiParsed, setIsOpenApiParsed] = useState(false);
  const [openApiSpecText, setOpenApiSpecText] = useState('');
  const [sourceIdentifier, setSourceIdentifier] = useState('');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const resetImportWizard = useCallback(() => {
    setImportOperations([]);
    setIsOpenApiParsed(false);
    setOpenApiSpecText('');
    setSourceIdentifier('');
    setOpenApiLoadSource(undefined);
    setImportSource('file');
    setImportCreateRest(false);
    setImportCreateRoutes(true);
    setImportSelectAll(true);
    setImportStatus(null);
  }, []);

  const parseOpenApiSpec = useCallback((specText: string): { success: boolean; error?: string } => {
    if (!specText.trim()) {
      setImportOperations([]);
      setIsOpenApiParsed(false);
      return { success: false, error: 'Provide an OpenAPI specification to import.' };
    }

    try {
      const spec = parseYaml(specText) as OpenApi;
      if (!spec || typeof spec !== 'object' || !('paths' in spec)) {
        throw new Error('Invalid spec');
      }
      setOpenApiSpecText(JSON.stringify(spec, null, 2));
      const operations = OpenApiProcessingService.buildOperationsFromSpec(spec);
      if (operations.length === 0) {
        setImportOperations([]);
        setIsOpenApiParsed(false);
        return { success: false, error: 'No operations were found in the specification.' };
      }

      setImportOperations(operations);
      setImportSelectAll(true);
      setIsOpenApiParsed(true);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid OpenAPI specification.';
      setImportOperations([]);
      setIsOpenApiParsed(false);
      return { success: false, error: message };
    }
  }, []);

  const handleSchemaLoaded = useCallback(
    (result: SchemaLoadedResult) => {
      const parsed = parseOpenApiSpec(result.schema);
      if (parsed.success) {
        setOpenApiLoadSource(result.source);
        setSourceIdentifier(result.sourceIdentifier);
        setImportStatus(null);
      } else if (parsed.error) {
        setImportStatus({ type: 'error', message: parsed.error });
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
    }

    return OpenApiProcessingService.applyRouteExistsToOperations(importOperations, routeNames).map((operation) => ({
      ...operation,
      selected: operation.routeExists ? false : operation.selected,
    }));
  }, [entitiesContext?.visualEntities, importOperations]);

  const handleToggleSelectAllOperations = useCallback(
    (checked: boolean) => {
      const routeExistsByKey = new Map(
        importOperationsWithRouteExists.map((operation) => [
          OpenApiProcessingService.getOperationKey(operation),
          operation.routeExists,
        ]),
      );
      setImportOperations((prev) => {
        const withRouteExists = prev.map((operation) => ({
          ...operation,
          routeExists: routeExistsByKey.get(OpenApiProcessingService.getOperationKey(operation)) ?? false,
        }));
        const next = OpenApiProcessingService.toggleSelectAllOperations(withRouteExists, checked);
        const selectable = next.filter((operation) => !operation.routeExists);
        const allSelected = selectable.length > 0 && selectable.every((operation) => operation.selected);
        setImportSelectAll(allSelected);
        return next;
      });
    },
    [importOperationsWithRouteExists],
  );

  const handleToggleOperation = useCallback((operationId: string, method: string, path: string, checked: boolean) => {
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
        const restDefinition = OpenApiProcessingService.buildRestDefinitionFromOperations(
          selectedOperations,
          newRestId,
          sourceIdentifier,
        );
        restEntity.updateModel(restEntity.getRootPath(), restDefinition);
      }
    }

    entitiesContext.updateEntitiesFromCamelResource();
    setImportStatus({
      type: 'success',
      message: `Import succeeded. ${selectedOperations.length} operation${selectedOperations.length === 1 ? '' : 's'} added.`,
    });
    return true;
  }, [entitiesContext, importCreateRest, importCreateRoutes, importOperationsWithRouteExists, sourceIdentifier]);

  const handleImportSourceChange = useCallback((nextSource: ImportSourceOption) => {
    setImportSource(nextSource);
    setImportOperations([]);
    setIsOpenApiParsed(false);
    setOpenApiLoadSource(undefined);
    setImportSelectAll(true);
    setSourceIdentifier('');
  }, []);

  const handleParseOpenApiSpec = useCallback(() => {
    const result = parseOpenApiSpec(openApiSpecText);
    if (!result.success && result.error) {
      setImportStatus({ type: 'error', message: result.error });
    } else {
      setImportStatus(null);
    }
  }, [openApiSpecText, parseOpenApiSpec]);

  return {
    importSource,
    isOpenApiParsed,
    openApiSpecText,
    openApiLoadSource,
    sourceIdentifier,
    importCreateRest,
    importCreateRoutes,
    importSelectAll,
    importOperations: importOperationsWithRouteExists,
    importStatus,
    apicurioRegistryUrl,
    handleSchemaLoaded,
    handleImportSourceChange,
    setOpenApiSpecText,
    handleParseOpenApiSpec,
    setImportCreateRest,
    setImportCreateRoutes,
    handleToggleSelectAllOperations,
    handleToggleOperation,
    handleImportOpenApi,
    resetImportWizard,
  };
};

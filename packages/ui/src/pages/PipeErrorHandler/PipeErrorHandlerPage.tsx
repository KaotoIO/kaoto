import { CanvasFormTabsContext, CanvasFormTabsContextResult, KaotoForm, KaotoFormProps } from '@kaoto/forms';
import { Content } from '@patternfly/react-core';
import { FocusEvent, FunctionComponent, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { PipeResource, SourceSchemaType } from '../../models/camel';
import { CatalogKind } from '../../models/catalog-kind';
import { KaotoSchemaDefinition } from '../../models/kaoto-schema';
import { CamelCatalogService } from '../../models/visualization/flows/camel-catalog.service';
import { EntitiesContext } from '../../providers/entities.provider';

export const PipeErrorHandlerPage: FunctionComponent = () => {
  const formTabsValue: CanvasFormTabsContextResult = useMemo(
    () => ({ selectedTab: 'All', setSelectedTab: () => {} }),
    [],
  );
  const entitiesContext = useContext(EntitiesContext);
  const pipeResource = entitiesContext?.camelResource as PipeResource;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const errorHandlerSchema = (CamelCatalogService.getComponent(CatalogKind.Entity, 'PipeErrorHandler')
    ?.propertiesSchema || {}) as KaotoSchemaDefinition['schema'];

  if (Array.isArray(errorHandlerSchema.oneOf) && !Array.isArray(errorHandlerSchema.anyOf)) {
    errorHandlerSchema.anyOf = [{ oneOf: errorHandlerSchema.oneOf }];
    delete errorHandlerSchema.oneOf;
  }

  const isSupported = useMemo(() => {
    return pipeResource && [SourceSchemaType.Pipe, SourceSchemaType.KameletBinding].includes(pipeResource.getType());
  }, [pipeResource]);

  const getErrorHandlerModel = useCallback(() => {
    const found = pipeResource.getErrorHandlerEntity();
    return found?.parent.errorHandler ?? {};
  }, [pipeResource]);

  const onChangeModel = useCallback(
    (model: Record<string, unknown>) => {
      if (Object.keys(model).length > 0) {
        let entity = pipeResource.getErrorHandlerEntity();
        if (!entity) {
          entity = pipeResource.createErrorHandlerEntity();
        }
        entity.parent.errorHandler = model;
      } else {
        pipeResource!.deleteErrorHandlerEntity();
      }
      setHasPendingChanges(true);
    },
    [entitiesContext, pipeResource],
  );

  const flushPendingChanges = useCallback(() => {
    if (hasPendingChanges) {
      entitiesContext!.updateSourceCodeFromEntities();
      setHasPendingChanges(false);
    }
  }, [entitiesContext, hasPendingChanges]);

  const handleContainerBlur = useCallback(
    (e: FocusEvent<HTMLDivElement>) => {
      const current = containerRef.current;
      const nextFocused = e.relatedTarget as Node | null;
      if (!current || !nextFocused || !current.contains(nextFocused)) {
        flushPendingChanges();
      }
    },
    [flushPendingChanges],
  );

  useEffect(() => {
    return () => {
      flushPendingChanges();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isSupported ? (
    <CanvasFormTabsContext.Provider value={formTabsValue}>
      <div ref={containerRef} onBlur={handleContainerBlur}>
        <KaotoForm
          data-testid="pipe-error-handler-form"
          schema={errorHandlerSchema}
          model={getErrorHandlerModel()}
          onChange={onChangeModel as KaotoFormProps['onChange']}
        />
      </div>
    </CanvasFormTabsContext.Provider>
  ) : (
    <Content>Not applicable</Content>
  );
};

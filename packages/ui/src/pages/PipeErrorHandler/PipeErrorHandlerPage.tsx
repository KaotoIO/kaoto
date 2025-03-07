import { PipeErrorHandler as PipeErrorHandlerType } from '@kaoto/camel-catalog/types';
import { Content } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useMemo } from 'react';
import { KaotoForm, KaotoFormProps } from '../../components/Visualization/Canvas/FormV2/KaotoForm';
import { PipeResource, SourceSchemaType } from '../../models/camel';
import { CanvasFormTabsContext, CanvasFormTabsContextResult } from '../../providers/canvas-form-tabs.provider';
import { EntitiesContext } from '../../providers/entities.provider';
import { CamelCatalogService } from '../../models/visualization/flows/camel-catalog.service';
import { CatalogKind } from '../../models/catalog-kind';
import { KaotoSchemaDefinition } from '../../models/kaoto-schema';

export const PipeErrorHandlerPage: FunctionComponent = () => {
  const formTabsValue: CanvasFormTabsContextResult = useMemo(() => ({ selectedTab: 'All', onTabChange: () => {} }), []);
  const entitiesContext = useContext(EntitiesContext);
  const pipeResource = entitiesContext?.camelResource as PipeResource;

  const errorHandlerSchema = (CamelCatalogService.getComponent(CatalogKind.Entity, 'PipeErrorHandler') ??
    {}) as KaotoSchemaDefinition['schema'];

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
    (model: PipeErrorHandlerType) => {
      if (Object.keys(model).length > 0) {
        let entity = pipeResource.getErrorHandlerEntity();
        if (!entity) {
          entity = pipeResource.createErrorHandlerEntity();
        }
        entity.parent.errorHandler = model;
      } else {
        pipeResource!.deleteErrorHandlerEntity();
      }
      entitiesContext!.updateSourceCodeFromEntities();
    },
    [entitiesContext, pipeResource],
  );

  return isSupported ? (
    <CanvasFormTabsContext.Provider value={formTabsValue}>
      <KaotoForm
        data-testid="pipe-error-handler-form"
        schema={errorHandlerSchema}
        model={getErrorHandlerModel()}
        onChange={onChangeModel as KaotoFormProps['onChange']}
      />
    </CanvasFormTabsContext.Provider>
  ) : (
    <Content>Not applicable</Content>
  );
};

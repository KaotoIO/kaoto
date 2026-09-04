import { CanvasFormTabsContext, CanvasFormTabsContextResult, KaotoForm, KaotoFormProps } from '@kaoto/forms';
import { Content } from '@patternfly/react-core';
import { FunctionComponent, Suspense, use, useCallback, useContext, useMemo } from 'react';

import { Loading } from '../../components/Loading';
import { PipeResource, SourceSchemaType } from '../../models/camel';
import { KaotoSchemaDefinition } from '../../models/kaoto-schema';
import { EntitiesContext, EntitiesContextResult } from '../../providers/entities.provider';
import { PipeErrorHandlerService } from './pipe-error-handler.service';

export const PipeErrorHandlerPage: FunctionComponent = () => {
  const entitiesContext = useContext(EntitiesContext);
  const pipeResource = entitiesContext?.camelResource as PipeResource;

  const isSupported = useMemo(() => {
    return pipeResource && [SourceSchemaType.Pipe, SourceSchemaType.KameletBinding].includes(pipeResource.getType());
  }, [pipeResource]);

  const errorHandlerSchemaPromise = useMemo(() => {
    if (!isSupported) {
      return Promise.resolve(undefined);
    }

    return PipeErrorHandlerService.getErrorHandlerSchema();
  }, [isSupported]);

  if (!isSupported) {
    return <Content>Not applicable</Content>;
  }

  return (
    <Suspense fallback={<Loading />}>
      <PipeErrorHandlerPageInner
        pipeResource={pipeResource}
        entitiesContext={entitiesContext!}
        errorHandlerSchemaPromise={errorHandlerSchemaPromise}
      />
    </Suspense>
  );
};

const PipeErrorHandlerPageInner: FunctionComponent<{
  pipeResource: PipeResource;
  entitiesContext: EntitiesContextResult;
  errorHandlerSchemaPromise: Promise<KaotoSchemaDefinition['schema'] | undefined>;
}> = ({ pipeResource, entitiesContext, errorHandlerSchemaPromise }) => {
  const formTabsValue: CanvasFormTabsContextResult = useMemo(
    () => ({ selectedTab: 'All', setSelectedTab: () => {} }),
    [],
  );
  const errorHandlerSchema = use(errorHandlerSchemaPromise);

  const getErrorHandlerModel = useCallback(() => {
    const found = pipeResource.getErrorHandlerEntity();
    return found?.parent.errorHandler ?? {};
  }, [pipeResource]);

  const onChangeModel = useCallback(
    (model: Record<string, unknown>) => {
      if (Object.keys(model).length > 0) {
        let entity = pipeResource.getErrorHandlerEntity();
        entity ??= pipeResource.createErrorHandlerEntity();
        entity.parent.errorHandler = model;
      } else {
        pipeResource.deleteErrorHandlerEntity();
      }
      entitiesContext.updateSourceCodeFromEntities();
    },
    [entitiesContext, pipeResource],
  );

  return (
    <CanvasFormTabsContext.Provider value={formTabsValue}>
      <KaotoForm
        data-testid="pipe-error-handler-form"
        schema={errorHandlerSchema}
        model={getErrorHandlerModel()}
        onChange={onChangeModel as KaotoFormProps['onChange']}
      />
    </CanvasFormTabsContext.Provider>
  );
};

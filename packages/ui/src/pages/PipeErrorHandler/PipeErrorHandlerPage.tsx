import { Title } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext } from 'react';
import { MetadataEditor } from '../../components/MetadataEditor';
import { useSchemasStore } from '../../store';
import { EntitiesContext } from '../../providers/entities.provider';
import { ObjectMeta } from '@kaoto-next/camel-catalog/types';
import { EntityType } from '../../models/camel/entities';
import { PipeErrorHandler as PipeErrorHandlerType } from '@kaoto/camel-catalog/types';
import { PipeErrorHandlerEntity } from '../../models/visualization/metadata/pipeErrorHandlerEntity';

export const PipeErrorHandlerPage: FunctionComponent = () => {
  const schemaMap = useSchemasStore((state) => state.schemas);
  const entitiesContext = useContext(EntitiesContext);
  const entities = entitiesContext?.entities ?? [];

  const findErrorHandler = useCallback(() => {
    return entities.find((item) => item.type === EntityType.ErrorHandler) as
      | { errorHandler: PipeErrorHandlerType }
      | undefined;
  }, [entities]);

  const getErrorHandler = useCallback(() => {
    const found = findErrorHandler();
    return found ? found.errorHandler : {};
  }, [findErrorHandler]);

  const onChangeModel = useCallback(
    (model: ObjectMeta) => {
      const errorHandler = findErrorHandler();
      if (Object.keys(model).length > 0) {
        if (!errorHandler) {
          entities.push(new PipeErrorHandlerEntity(model));
        } else {
          Object.keys(errorHandler.errorHandler).forEach((key) => {
            if (!(key in model)) {
              delete errorHandler?.errorHandler[key];
            }
          });
          Object.assign(errorHandler.errorHandler, model);
        }
      } else if (errorHandler) {
        const index = entities.indexOf(errorHandler as PipeErrorHandlerEntity);
        entities.splice(index, 1);
      }
      entitiesContext?.updateCodeFromEntities();
    },
    [entities, entitiesContext, findErrorHandler],
  );

  return (
    <>
      <Title headingLevel="h1">Pipe ErrorHandler Configuration</Title>
      <MetadataEditor
        name="ErrorHandler"
        schema={schemaMap['PipeErrorHandler'].schema}
        metadata={getErrorHandler()}
        onChangeModel={onChangeModel}
      />
    </>
  );
};

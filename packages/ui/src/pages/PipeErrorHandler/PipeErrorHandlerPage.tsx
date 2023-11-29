import { TextContent } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useMemo } from 'react';
import { EntitiesContext } from '../../providers/entities.provider';
import { PipeErrorHandler as PipeErrorHandlerType } from '@kaoto-next/camel-catalog/types';
import { PipeResource, SourceSchemaType } from '../../models/camel';
import { useSchemasStore } from '../../store';
import { PipeErrorHandlerEditor } from '../../components/MetadataEditor/PipeErrorHandlerEditor';

export const PipeErrorHandlerPage: FunctionComponent = () => {
  const schemaMap = useSchemasStore((state) => state.schemas);
  const entitiesContext = useContext(EntitiesContext);
  const pipeResource = entitiesContext?.camelResource as PipeResource;

  const errorHandlerSchema = useMemo(() => {
    return schemaMap['PipeErrorHandler'].schema;
  }, [schemaMap]);

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
    <>
      <PipeErrorHandlerEditor
        schema={errorHandlerSchema}
        model={getErrorHandlerModel()}
        onChangeModel={onChangeModel}
      />
    </>
  ) : (
    <TextContent>Not applicable</TextContent>
  );
};

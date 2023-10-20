import { TextContent, Title } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useMemo } from 'react';
import { MetadataEditor } from '../../components/MetadataEditor';
import { EntitiesContext } from '../../providers/entities.provider';
import { PipeErrorHandler as PipeErrorHandlerType } from '@kaoto-next/camel-catalog/types';
import { PipeResource, SourceSchemaType } from '../../models/camel';
import { useSchemasStore } from '../../store';

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
      entitiesContext!.updateCodeFromEntities();
    },
    [entitiesContext, pipeResource],
  );

  return isSupported ? (
    <>
      <Title headingLevel="h1">Pipe ErrorHandler Configuration</Title>
      <MetadataEditor
        name="ErrorHandler"
        schema={errorHandlerSchema}
        metadata={getErrorHandlerModel()}
        onChangeModel={onChangeModel}
      />
    </>
  ) : (
    <TextContent>Not applicable</TextContent>
  );
};

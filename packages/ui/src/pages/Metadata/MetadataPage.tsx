import { TextContent } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useMemo } from 'react';
import { MetadataEditor } from '../../components/MetadataEditor';
import { useSchemasStore } from '../../store';
import { EntitiesContext } from '../../providers/entities.provider';
import { ObjectMeta } from '@kaoto/camel-catalog/types';
import { CamelKResource, CamelKResourceKinds } from '../../models/camel/camel-k-resource';

export const MetadataPage: FunctionComponent = () => {
  const schemaMap = useSchemasStore((state) => state.schemas);
  const entitiesContext = useContext(EntitiesContext);
  const camelkResource = entitiesContext?.camelResource as CamelKResource;

  const metadataSchema = useMemo(() => {
    return schemaMap['ObjectMeta'].schema;
  }, [schemaMap]);

  const isSupported = useMemo(() => {
    return camelkResource && camelkResource.getType() in CamelKResourceKinds;
  }, [camelkResource]);

  const getMetadataModel = useCallback(() => {
    const found = camelkResource.getMetadataEntity();
    return found?.parent.metadata ?? {};
  }, [camelkResource]);

  const onChangeModel = useCallback(
    (model: ObjectMeta) => {
      if (Object.keys(model).length > 0) {
        let entity = camelkResource.getMetadataEntity();
        if (!entity) {
          entity = camelkResource.createMetadataEntity();
        } else {
          entity.parent.metadata = model;
          camelkResource.refreshVisualMetadata();
        }
      } else {
        camelkResource.deleteMetadataEntity();
      }
      entitiesContext?.updateEntitiesFromCamelResource();
    },
    [camelkResource, entitiesContext],
  );

  return isSupported ? (
    <MetadataEditor
      name="Metadata"
      schema={metadataSchema}
      metadata={getMetadataModel()}
      onChangeModel={onChangeModel}
    />
  ) : (
    <TextContent>Not applicable</TextContent>
  );
};

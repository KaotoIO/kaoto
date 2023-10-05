import { Title } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext } from 'react';
import { MetadataEditor } from '../../components/MetadataEditor';
import { useSchemasStore } from '../../store';
import { EntitiesContext } from '../../providers/entities.provider';
import { ObjectMeta } from '@kaoto-next/camel-catalog/types';
import { EntityType } from '../../models/camel/entities';
import { MetadataEntity } from '../../models/visualization/metadata';

export const MetadataPage: FunctionComponent = () => {
  const schemaMap = useSchemasStore((state) => state.schemas);
  const entitiesContext = useContext(EntitiesContext);
  const entities = entitiesContext?.entities ?? [];

  const findMetadata = useCallback(() => {
    return entities.find((item) => item.type === EntityType.Metadata) as { metadata: ObjectMeta } | undefined;
  }, [entities]);

  const getMetadata = useCallback(() => {
    const found = findMetadata();
    return found ? found.metadata : {};
  }, [findMetadata]);

  const onChangeModel = useCallback(
    (model: ObjectMeta) => {
      const metadata = findMetadata();
      if (Object.keys(model).length > 0) {
        if (!metadata) {
          entities.push(new MetadataEntity(model));
        } else {
          Object.keys(metadata.metadata).forEach((key) => {
            if (!(key in model)) {
              delete metadata.metadata[key];
            }
          });
          Object.assign(metadata.metadata, model);
        }
      } else if (metadata) {
        const index = entities.indexOf(metadata as MetadataEntity);
        entities.splice(index, 1);
      }
      entitiesContext?.updateCodeFromEntities();
    },
    [entities, entitiesContext, findMetadata],
  );

  return (
    <>
      <Title headingLevel="h1">Metadata Configuration</Title>
      <MetadataEditor
        name="Metadata"
        schema={schemaMap.ObjectMeta.schema}
        metadata={getMetadata()}
        onChangeModel={onChangeModel}
      />
    </>
  );
};

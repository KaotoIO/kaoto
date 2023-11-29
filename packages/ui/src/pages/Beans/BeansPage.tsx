import { TextContent } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useMemo } from 'react';
import { MetadataEditor } from '../../components/MetadataEditor';
import { useSchemasStore } from '../../store';
import { EntitiesContext } from '../../providers/entities.provider';
import { BeansDeserializer } from '@kaoto-next/camel-catalog/types';
import { EntityType } from '../../models/camel/entities';
import { BeansEntity } from '../../models/visualization/metadata';
import { BeansAwareResource } from '../../models/camel';

export const BeansPage: FunctionComponent = () => {
  const schemaMap = useSchemasStore((state) => state.schemas);
  const entitiesContext = useContext(EntitiesContext);
  const camelResource = entitiesContext?.camelResource;

  const beansSchema = useMemo(() => {
    return schemaMap['beans'].schema;
  }, [schemaMap]);

  const isSupported = useMemo(() => {
    return (camelResource as unknown as BeansAwareResource).createBeansEntity !== undefined;
  }, [camelResource]);

  const findBeansEntity = useCallback(() => {
    return camelResource?.getEntities().find((item) => item.type === EntityType.Beans) as BeansEntity | undefined;
  }, [camelResource]);

  const getBeansModel = useCallback(() => {
    const found = findBeansEntity();
    return found ? found.parent.beans : [];
  }, [findBeansEntity]);

  const onChangeModel = useCallback(
    (model: BeansDeserializer) => {
      const beansAwareResource = camelResource as unknown as BeansAwareResource;
      if (model?.length > 0) {
        let entity = findBeansEntity();
        if (!entity) {
          entity = beansAwareResource.createBeansEntity();
        }
        entity.parent.beans = model;
      } else {
        const entity = findBeansEntity();
        entity && beansAwareResource.deleteBeansEntity(entity);
      }
      entitiesContext?.updateSourceCodeFromEntities();
    },
    [camelResource, entitiesContext, findBeansEntity],
  );

  return isSupported ? (
    <>
      <MetadataEditor name="Beans" schema={beansSchema} metadata={getBeansModel()} onChangeModel={onChangeModel} />
    </>
  ) : (
    <TextContent>Not applicable</TextContent>
  );
};

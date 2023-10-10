import { Title } from '@patternfly/react-core';
import { FunctionComponent, useContext } from 'react';
import { MetadataEditor } from '../../components/MetadataEditor';
import { useSchemasStore } from '../../store';
import { EntitiesContext } from '../../providers/entities.provider';
import { BeansDeserializer } from '@kaoto-next/camel-catalog/types';
import { EntityType } from '../../models/camel-entities';
import { Beans } from '../../models/visualization/metadata';

export const BeansPage: FunctionComponent = () => {
  const schemaMap = useSchemasStore((state) => state.schemas);
  const entitiesContext = useContext(EntitiesContext);
  const metadata = entitiesContext?.entities ?? [];

  function findBeansData() {
    return metadata.find((item) => item.type === EntityType.Beans) as { beans: BeansDeserializer } | undefined;
  }

  function getBeansData() {
    const found = findBeansData();
    return found ? found.beans : [];
  }

  function onChangeModel(model: BeansDeserializer) {
    let beansData = findBeansData();
    if (model?.length > 0) {
      if (!beansData) {
        beansData = { beans: [...model] };
        metadata.push(new Beans(beansData.beans));
      } else {
        beansData.beans = [...model];
      }
    } else if (beansData) {
      const index = metadata.indexOf(beansData as Beans);
      metadata.splice(index, 1);
    }
    entitiesContext?.updateCodeFromEntities();
  }

  return (
    <>
      <Title headingLevel="h1">Beans Configuration</Title>
      <MetadataEditor
        name="Beans"
        schema={schemaMap.beans.schema}
        metadata={getBeansData()}
        onChangeModel={onChangeModel}
      />
    </>
  );
};

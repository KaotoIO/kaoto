import { useCallback, useMemo, useState } from 'react';
import { parse } from 'yaml';
import { isCamelRoute } from '../camel-utils';
import { BaseCamelEntity, BaseVisualCamelEntity, CamelRoute } from '../models/camel-entities';
import { isDefined } from '../utils';

export const useEntities = () => {
  const [sourceCode, setSourceCode] = useState<string>('');
  const [entities, setEntities] = useState<BaseCamelEntity[]>([]);
  const [visualEntities, setVisualEntities] = useState<BaseVisualCamelEntity[]>([]);

  const setCode = useCallback((code: string) => {
    try {
      setSourceCode(code);
      const result = parse(code);
      const rawEntities = Array.isArray(result) ? result : [result];

      const entities = rawEntities.reduce(
        (acc, rawEntity) => {
          const entity = getEntity(rawEntity);

          if (entity instanceof CamelRoute) {
            acc.visualEntities.push(entity);
          } else if (isDefined(entity) && typeof entity === 'object') {
            acc.entities.push(entity);
          }

          return acc;
        },
        { entities: [], visualEntities: [] } as {
          entities: BaseCamelEntity[];
          visualEntities: BaseVisualCamelEntity[];
        },
      );

      setEntities(entities.entities);
      setVisualEntities(entities.visualEntities);
    } catch (e) {
      setEntities([]);
      setVisualEntities([]);
      console.error(e);
    }
  }, []);

  const value = useMemo(
    () => ({
      code: sourceCode,
      setCode,
      entities,
      visualEntities,
    }),
    [sourceCode, setCode, entities, visualEntities],
  );

  return value;
};

function getEntity(rawEntity: unknown): BaseCamelEntity | BaseVisualCamelEntity | undefined {
  if (!isDefined(rawEntity) || Array.isArray(rawEntity)) {
    return undefined;
  }

  if (isCamelRoute(rawEntity)) {
    return new CamelRoute(rawEntity.route);
  }

  return rawEntity as BaseCamelEntity;
}

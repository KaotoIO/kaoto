import { useCallback, useMemo, useState } from 'react';
import { parse, stringify } from 'yaml';
import { isCamelRoute, isKameletBinding, isPipe } from '../camel-utils';
import { BaseCamelEntity } from '../models/camel-entities';
import { BaseVisualCamelEntity } from '../models/visualization/base-visual-entity';
import { CamelRoute, KameletBinding, Pipe } from '../models/visualization/flows';
import { EventNotifier, isDefined } from '../utils';

export interface EntitiesContextResult {
  code: string;
  setCode: (code: string) => void;
  entities: BaseCamelEntity[];
  visualEntities: BaseVisualCamelEntity[];
  updateCodeFromEntities: () => void;
  eventNotifier: EventNotifier;
}

export const useEntities = (): EntitiesContextResult => {
  const [sourceCode, setSourceCode] = useState<string>('');
  const [entities, setEntities] = useState<BaseCamelEntity[]>([]);
  const [visualEntities, setVisualEntities] = useState<BaseVisualCamelEntity[]>([]);
  const eventNotifier = useMemo(() => new EventNotifier(), []);

  /** Set the Source Code and updates the Entities */
  const setCode = useCallback((code: string) => {
    try {
      setSourceCode(code);
      const result = parse(code);
      const rawEntities = Array.isArray(result) ? result : [result];

      const entitiesHolder = rawEntities.reduce(
        (acc, rawEntity) => {
          const entity = getEntity(rawEntity);

          if (entity instanceof CamelRoute || entity instanceof KameletBinding || entity instanceof Pipe) {
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

      setEntities(entitiesHolder.entities);
      setVisualEntities(entitiesHolder.visualEntities);

      /** Notify subscribers that a `entities:update` happened */
      eventNotifier.next('entities:update', undefined);
    } catch (e) {
      setEntities([]);
      setVisualEntities([]);
      console.error(e);
    }
  }, []);

  /** Updates the Source Code whenever the entities are updated */
  const updateCodeFromEntities = useCallback(() => {
    const visualEntitiesCode = stringify(visualEntities, null, { indent: 2 });
    const entitiesCode = stringify(entities, null, { indent: 2 });
    const code = visualEntitiesCode + '\n' + entitiesCode;

    /** Set the Source Code directly, without using `setCode` as updating the entities is already done */
    setSourceCode(code);

    /** Notify subscribers that a `code:update` happened */
    eventNotifier.next('code:update', code);
  }, [entities, eventNotifier, visualEntities]);

  const value = useMemo(
    () => ({
      code: sourceCode,
      setCode,
      entities,
      visualEntities,
      updateCodeFromEntities,
      eventNotifier,
    }),
    [sourceCode, setCode, entities, visualEntities, updateCodeFromEntities, eventNotifier],
  );

  return value;
};

function getEntity(rawEntity: unknown): BaseCamelEntity | BaseVisualCamelEntity | undefined {
  if (!isDefined(rawEntity) || Array.isArray(rawEntity)) {
    return undefined;
  }

  if (isCamelRoute(rawEntity)) {
    return new CamelRoute(rawEntity.route);
  } else if (isKameletBinding(rawEntity)) {
    return new KameletBinding(rawEntity);
  } else if (isPipe(rawEntity)) {
    return new Pipe(rawEntity);
  }

  return rawEntity as BaseCamelEntity;
}

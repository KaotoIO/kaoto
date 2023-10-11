import { useCallback, useMemo, useState } from 'react';
import { parse, stringify } from 'yaml';
import { isBeans, isCamelRoute, isIntegration, isKamelet, isKameletBinding, isPipe } from '../camel-utils';
import { BaseCamelEntity, SourceSchemaType } from '../models/camel-entities';
import { BaseVisualCamelEntity } from '../models/visualization/base-visual-entity';
import { CamelRoute, KameletBinding, Pipe } from '../models/visualization/flows';
import { Beans } from '../models/visualization/metadata';
import { EventNotifier, isDefined } from '../utils';
import { VisualFlowsReducer } from './visual-flows';

export interface EntitiesContextResult {
  code: string;
  setCode: (code: string) => void;
  entities: BaseCamelEntity[];
  currentSchemaType: SourceSchemaType;
  setCurrentSchemaType: (entity: SourceSchemaType) => void;
  visualEntities: BaseVisualCamelEntity[];
  updateCodeFromEntities: () => void;
  eventNotifier: EventNotifier;
}

export const useEntities = (): EntitiesContextResult => {
  const [sourceCode, setSourceCode] = useState<string>('');
  const [entities, setEntities] = useState<BaseCamelEntity[]>([]);
  const [visualEntities, setVisualEntities] = useState<BaseVisualCamelEntity[]>([]);
  const eventNotifier = useMemo(() => new EventNotifier(), []);
  const [currentSchemaType, setCurrentSchemaType] = useState<SourceSchemaType>(SourceSchemaType.Route);

  /** Set the Source Code and updates the Entities */
  const setCode = useCallback((code: string) => {
    try {
      setSourceCode(code);
      const result = parse(code);
      const rawEntities = Array.isArray(result) ? result : [result];
      setCurrentSchemaType(getEntityType(rawEntities[0]));

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
    let code = '';
    if (visualEntities.length == 1 && !(visualEntities[0] instanceof CamelRoute)) {
      // Camel K CRs
      // TODO non-visual entities have to be combined into CR
      code = stringify(visualEntities[0], null) + '\n';
    } else {
      if (visualEntities.length > 0) {
        code += stringify(visualEntities, null, { indent: 2 }) + '\n';
      }
      if (entities.length > 0) {
        code += stringify(entities, null, { indent: 2 }) + '\n';
      }
    }
    /** Set the Source Code directly, without using `setCode` as updating the entities is already done */
    setSourceCode(code);

    /** Notify subscribers that a `code:update` happened */
    eventNotifier.next('code:update', code);
  }, [entities, eventNotifier, visualEntities]);

  /** VisibleFlows related objects */
  const [visibleFlows, dispatch] = useReducer(VisualFlowsReducer, {});
  const visualFlowsApi = useMemo(() => new visualFlowsApi(dispatch), [dispatch]);
  const visibleFlowsPublic = useMemo(() => getVisibleFlowsInformation(visibleFlows), [visibleFlows]);

  const value = useMemo(
    () => ({
      code: sourceCode,
      setCode,
      entities,
      currentSchemaType: currentSchemaType,
      setCurrentSchemaType: setCurrentSchemaType,
      visualEntities,
      updateCodeFromEntities,
      eventNotifier,
    }),
    [
      sourceCode,
      setCode,
      currentSchemaType,
      setCurrentSchemaType,
      entities,
      visualEntities,
      updateCodeFromEntities,
      eventNotifier,
    ],
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
  } else if (isBeans(rawEntity)) {
    return new Beans(rawEntity.beans);
  }

  return rawEntity as BaseCamelEntity;
}

function getEntityType(entity: unknown): SourceSchemaType {
  if (isKameletBinding(entity)) {
    return SourceSchemaType.KameletBinding;
  }
  if (isKamelet(entity)) {
    return SourceSchemaType.Kamelet;
  }
  if (isIntegration(entity)) {
    return SourceSchemaType.Integration;
  }
  if (isPipe(entity)) {
    return SourceSchemaType.Pipe;
  }

  return SourceSchemaType.Route;
}

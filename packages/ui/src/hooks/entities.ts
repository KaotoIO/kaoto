import { useCallback, useMemo, useState } from 'react';
import { parse, stringify } from 'yaml';
import { CamelResource, SourceSchemaType, createCamelResource } from '../models/camel';
import { BaseCamelEntity } from '../models/camel/entities';
import { BaseVisualCamelEntity } from '../models/visualization/base-visual-entity';
import { EventNotifier } from '../utils';

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
  const eventNotifier = useMemo(() => new EventNotifier(), []);
  const [camelResource, setCamelResource] = useState<CamelResource>(createCamelResource());

  /** Set the Source Code and updates the Entities */
  const setCode = useCallback(
    (code: string) => {
      try {
        setSourceCode(code);
        const result = parse(code);
        const camelResource = createCamelResource(result);
        setCamelResource(camelResource);

        /** Notify subscribers that a `entities:update` happened */
        eventNotifier.next('entities:update', undefined);
      } catch (e) {
        setCamelResource(createCamelResource());
        console.error(e);
      }
    },
    [eventNotifier],
  );

  /** Updates the Source Code whenever the entities are updated */
  const updateCodeFromEntities = useCallback(() => {
    const code = stringify(camelResource) || '';
    setSourceCode(code);

    /** Notify subscribers that a `code:update` happened */
    eventNotifier.next('code:update', code);
  }, [camelResource, eventNotifier]);

  const setCurrentSchemaType = useCallback(() => {
    return (type: SourceSchemaType) => {
      setCamelResource(createCamelResource(type));
      updateCodeFromEntities();
    };
  }, [updateCodeFromEntities]);

  return useMemo(
    () => ({
      code: sourceCode,
      setCode,
      entities: camelResource.getEntities(),
      currentSchemaType: camelResource?.getType(),
      setCurrentSchemaType: setCurrentSchemaType(),
      visualEntities: camelResource.getVisualEntities(),
      updateCodeFromEntities,
      eventNotifier,
    }),
    [sourceCode, setCode, setCurrentSchemaType, camelResource, updateCodeFromEntities, eventNotifier],
  );
};

import { useCallback, useMemo, useReducer, useState } from 'react';
import { parse, stringify } from 'yaml';
import { BaseCamelEntity } from '../models/camel/entities';
import { BaseVisualCamelEntity } from '../models/visualization/base-visual-entity';
import { EventNotifier } from '../utils';
import { CamelResource, createCamelResource, SourceSchemaType } from '../models/camel';
import { IVisibleFlows, VisibleFlowsReducer, VisualFlowsApi } from '../models/visualization/flows/flows-visibility';

export interface EntitiesContextResult {
  code: string;
  setCode: (code: string) => void;
  entities: BaseCamelEntity[];
  currentSchemaType: SourceSchemaType;
  setCurrentSchemaType: (entity: SourceSchemaType) => void;
  visualEntities: BaseVisualCamelEntity[];
  visibleFlows: IVisibleFlows;
  visualFlowsApi: VisualFlowsApi;
  updateCodeFromEntities: () => void;
  eventNotifier: EventNotifier;
}

export const useEntities = (): EntitiesContextResult => {
  const [sourceCode, setSourceCode] = useState<string>('');
  const eventNotifier = useMemo(() => new EventNotifier(), []);
  const [camelResource, setCamelResource] = useState<CamelResource>(createCamelResource());
  const [visibleFlows, dispatch] = useReducer(VisibleFlowsReducer, {});
  const visualFlowsApi = new VisualFlowsApi(dispatch);

  /** Set the Source Code and updates the Entities */
  const setCode = useCallback((code: string) => {
    try {
      setSourceCode(code);
      const result = parse(code);
      const camelResource = createCamelResource(result);
      setCamelResource(camelResource);
      const flows = camelResource.getVisualEntities().map((e) => e.id);
      visualFlowsApi.setVisibleFlows(flows);
      /** Notify subscribers that a `entities:update` happened */
      eventNotifier.next('entities:update', undefined);
    } catch (e) {
      setCamelResource(createCamelResource());
      console.error(e);
    }
  }, []);

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
      visibleFlows,
      visualFlowsApi,
      updateCodeFromEntities,
      eventNotifier,
    }),
    [sourceCode, setCode, setCurrentSchemaType, camelResource, visibleFlows, updateCodeFromEntities, eventNotifier],
  );
};

import { useCallback, useMemo, useState } from 'react';
import { parse, stringify } from 'yaml';
import { CamelResource, SourceSchemaType, createCamelResource } from '../models/camel';
import { BaseCamelEntity } from '../models/camel/entities';
import { BaseVisualCamelEntity } from '../models/visualization/base-visual-entity';
import { FlowTemplateService, flowTemplateService } from '../models/visualization/flows/flow-templates-service';
import { camelRouteYaml } from '../stubs/camel-route';
import { LocalStorageKeys } from '../models';
import { useLocalStorage } from '.';

export interface EntitiesContextResult {
  code: string;
  setCode: (code: string) => void;
  entities: BaseCamelEntity[];
  currentSchemaType: SourceSchemaType;
  setCurrentSchemaType: (entity: SourceSchemaType) => void;
  visualEntities: BaseVisualCamelEntity[];
  flowTemplateService: FlowTemplateService;
  camelResource: CamelResource;
  updateCodeFromEntities: () => void;
}

export const useEntities = (): EntitiesContextResult => {
  const [sourceCode, setSourceCode] = useLocalStorage(LocalStorageKeys.SourceCode, camelRouteYaml);
  const [camelResource, setCamelResource] = useState<CamelResource>(createCamelResource(parse(sourceCode)));

  /** Set the Source Code and updates the Entities */
  const setCode = useCallback(
    (code: string) => {
      try {
        setSourceCode(code);
        const result = parse(code);
        const camelResource = createCamelResource(result);
        setCamelResource(camelResource);
      } catch (e) {
        setCamelResource(createCamelResource());
        console.error(e);
      }
    },
    [setSourceCode],
  );

  /** Updates the Source Code whenever the entities are updated */
  const updateCodeFromEntities = useCallback(() => {
    const code = stringify(camelResource) || '';
    setSourceCode(code);
  }, [camelResource, setSourceCode]);

  const setCurrentSchemaType = useCallback(
    (type: SourceSchemaType) => {
      setCamelResource(createCamelResource(type));
      updateCodeFromEntities();
    },
    [updateCodeFromEntities],
  );

  return useMemo(
    () => ({
      code: sourceCode,
      setCode,
      entities: camelResource.getEntities(),
      currentSchemaType: camelResource?.getType(),
      setCurrentSchemaType,
      visualEntities: camelResource.getVisualEntities(),
      flowTemplateService,
      camelResource,
      updateCodeFromEntities,
    }),
    [sourceCode, setCode, setCurrentSchemaType, camelResource, updateCodeFromEntities],
  );
};

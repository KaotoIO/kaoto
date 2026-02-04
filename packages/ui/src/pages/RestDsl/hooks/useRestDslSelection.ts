import { useEffect, useMemo, useState } from 'react';

import { CamelRestConfigurationVisualEntity } from '../../../models/visualization/flows/camel-rest-configuration-visual-entity';
import { CamelRestVisualEntity } from '../../../models/visualization/flows/camel-rest-visual-entity';
import { RestEditorSelection, SelectedFormState } from '../restDslTypes';

interface UseRestDslSelectionProps {
  restConfiguration: CamelRestConfigurationVisualEntity | undefined;
  restEntities: CamelRestVisualEntity[];
}

export const useRestDslSelection = ({ restConfiguration, restEntities }: UseRestDslSelectionProps) => {
  const defaultSelection = useMemo<RestEditorSelection | undefined>(() => {
    if (restConfiguration) return { kind: 'restConfiguration' };
    const firstRest = restEntities[0];
    if (firstRest) return { kind: 'rest', restId: firstRest.id };
    return undefined;
  }, [restConfiguration, restEntities]);

  const [selection, setSelection] = useState<RestEditorSelection | undefined>(defaultSelection);

  useEffect(() => {
    if (!selection) {
      setSelection(defaultSelection);
      return;
    }

    if (selection.kind === 'restConfiguration' && !restConfiguration) {
      setSelection(defaultSelection);
      return;
    }

    if (selection.kind !== 'restConfiguration') {
      const restEntity = restEntities.find((entity) => entity.id === selection.restId);
      if (!restEntity) {
        setSelection(defaultSelection);
      }
    }
  }, [defaultSelection, restConfiguration, restEntities, selection]);

  const selectedFormState = useMemo<SelectedFormState | undefined>(() => {
    if (!selection) return undefined;

    if (selection.kind === 'restConfiguration') {
      if (!restConfiguration) return undefined;
      return {
        title: 'Rest Configuration',
        entity: restConfiguration,
        path: restConfiguration.getRootPath(),
        omitFields: restConfiguration.getOmitFormFields(),
      };
    }

    const restEntity = restEntities.find((entity) => entity.id === selection.restId);
    if (!restEntity) return undefined;

    if (selection.kind === 'rest') {
      return {
        title: 'Rest',
        entity: restEntity,
        path: restEntity.getRootPath(),
        omitFields: restEntity.getOmitFormFields(),
      };
    }

    const operationPath = `${restEntity.getRootPath()}.${selection.verb}.${selection.index}`;
    return {
      title: `${selection.verb.toUpperCase()} Operation`,
      entity: restEntity,
      path: operationPath,
      omitFields: ['to'],
    };
  }, [restConfiguration, restEntities, selection]);

  return {
    selection,
    setSelection,
    selectedFormState,
  };
};

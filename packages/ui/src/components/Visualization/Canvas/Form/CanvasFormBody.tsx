import { KaotoForm } from '@kaoto/forms';
import { FocusEvent, FunctionComponent, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { IVisualizationNode } from '../../../../models';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { isDefined, setValue } from '../../../../utils';
import { UnknownNode } from '../../Custom/UnknownNode';
import { customFieldsFactoryfactory } from './fields/custom-fields-factory';
import { SuggestionRegistrar } from './suggestions/SuggestionsProvider';

interface CanvasFormTabsProps {
  vizNode: IVisualizationNode;
}

export const CanvasFormBody: FunctionComponent<CanvasFormTabsProps> = ({ vizNode }) => {
  const entitiesContext = useContext(EntitiesContext);
  const omitFields = useRef(vizNode.getOmitFormFields() ?? []);
  const schema = useMemo(() => vizNode.getComponentSchema()?.schema, [vizNode]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const isUnknownComponent = useMemo(() => {
    return !isDefined(schema) || Object.keys(schema).length === 0;
  }, [schema]);

  const model = vizNode.getComponentSchema()?.definition;

  const flushPendingChanges = useCallback(() => {
    if (hasPendingChanges) {
      entitiesContext?.updateSourceCodeFromEntities();
      setHasPendingChanges(false);
    }
  }, [entitiesContext, hasPendingChanges]);

  const handleOnChangeIndividualProp = useCallback(
    (path: string, value: unknown) => {
      let updatedValue = value;
      if (typeof value === 'string' && value.trim() === '') {
        updatedValue = undefined;
      }

      const newModel = vizNode.getComponentSchema()?.definition ?? {};
      setValue(newModel, path, updatedValue);
      vizNode.updateModel(newModel);
      setHasPendingChanges(true);
    },
    [vizNode],
  );

  const handleContainerBlur = useCallback(
    (e: FocusEvent<HTMLDivElement>) => {
      const current = containerRef.current;
      const nextFocused = e.relatedTarget as Node | null;
      // If focus moved outside of the form container (or nowhere), flush changes
      if (!current || !nextFocused || !current.contains(nextFocused)) {
        flushPendingChanges();
      }
    },
    [flushPendingChanges],
  );

  // Flush pending changes when component unmounts or when switching nodes
  useEffect(() => {
    return () => {
      flushPendingChanges();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vizNode]);

  if (isUnknownComponent) {
    return <UnknownNode model={model} />;
  }

  return (
    <SuggestionRegistrar>
      <div ref={containerRef} onBlur={handleContainerBlur}>
        <KaotoForm
          schema={schema}
          onChangeProp={handleOnChangeIndividualProp}
          model={model}
          omitFields={omitFields.current}
          customFieldsFactory={customFieldsFactoryfactory}
        />
      </div>
    </SuggestionRegistrar>
  );
};

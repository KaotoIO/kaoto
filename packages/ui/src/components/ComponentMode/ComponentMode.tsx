import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useState } from 'react';
import { useProcessorIcon } from '../../hooks/processor-icon.hook';
import { useEntityContext } from '../../hooks/useEntityContext/useEntityContext';
import { IVisualizationNode } from '../../models';
import { CamelRouteVisualEntityData } from '../../models/visualization/flows/support/camel-component-types';
import './ComponentMode.scss';

export const ComponentMode: FunctionComponent<{ vizNode?: IVisualizationNode }> = ({ vizNode }) => {
  const { updateSourceCodeFromEntities } = useEntityContext();
  const [processorName, setProcessorName] = useState<keyof ProcessorDefinition>(
    (vizNode?.data as CamelRouteVisualEntityData)?.processorName,
  );

  const switchComponentMode = useCallback(
    (newProcessorName: keyof ProcessorDefinition) => {
      if (!vizNode || newProcessorName === processorName) return;

      const path = vizNode.data.path;
      const rootEipPath = path?.split('.').slice(0, -1).join('.');
      const definition = vizNode.getComponentSchema()?.definition;
      if (!definition || !rootEipPath) return;

      /**
       * Switch the used EIP for the component, it can go from 'to' to 'toD' or 'poll'
       * and vice versa.
       */
      vizNode.data = { ...vizNode.data, path: rootEipPath };
      vizNode.updateModel(undefined);

      vizNode.data = { ...vizNode.data, path: `${rootEipPath}.${newProcessorName}`, processorName: newProcessorName };
      vizNode.updateModel(definition);
      updateSourceCodeFromEntities();
      setProcessorName(newProcessorName);
    },
    [vizNode, processorName, updateSourceCodeFromEntities],
  );

  const { Icon: ToIcon, description: toDescription } = useProcessorIcon('to');
  const { Icon: ToDIcon, description: toDDescription } = useProcessorIcon('toD');
  const { Icon: PollIcon, description: pollDescription } = useProcessorIcon('poll');

  return (
    <section className="component-mode">
      <ToggleGroup isCompact aria-label="Component Mode Toggle Group">
        {toDescription && (
          <ToggleGroupItem
            icon={<ToIcon />}
            text="Static"
            buttonId="to"
            title={toDescription}
            isSelected={processorName === 'to'}
            onChange={() => {
              switchComponentMode('to');
            }}
          />
        )}
        {toDDescription && (
          <ToggleGroupItem
            icon={<ToDIcon />}
            text="Dynamic"
            buttonId="toD"
            title={toDDescription}
            isSelected={processorName === 'toD'}
            onChange={() => {
              switchComponentMode('toD');
            }}
          />
        )}
        {pollDescription && (
          <ToggleGroupItem
            icon={<PollIcon />}
            text="Poll"
            buttonId="poll"
            title={pollDescription}
            isSelected={processorName === 'poll'}
            onChange={() => {
              switchComponentMode('poll');
            }}
          />
        )}
      </ToggleGroup>
    </section>
  );
};

export default ComponentMode;

import './ComponentMode.scss';

import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useState } from 'react';

import { useProcessorTooltips } from '../../hooks/use-processor-tooltips.hook';
import { useEntityContext } from '../../hooks/useEntityContext/useEntityContext';
import { IVisualizationNode } from '../../models';
import { COMPONENT_MODE_PROCESSORS } from '../../models/special-processors.constants';
import { getProcessorIcon } from '../../utils/processor-icon';

export const ComponentMode: FunctionComponent<{ vizNode?: IVisualizationNode }> = ({ vizNode }) => {
  const { updateSourceCodeFromEntities } = useEntityContext();
  const [processorName, setProcessorName] = useState(vizNode?.data.primaryNodeId?.name);
  const parsedDefinition = vizNode?.data.definition;

  const switchComponentMode = useCallback(
    (newProcessorName: keyof ProcessorDefinition) => {
      if (!vizNode || newProcessorName === processorName) return;

      const path = vizNode.data.path;
      const rootEipPath = path?.split('.').slice(0, -1).join('.');
      if (!parsedDefinition || !rootEipPath) return;

      /**
       * Switch the used EIP for the component, it can go from 'to' to 'toD' or 'poll'
       * and vice versa.
       */
      vizNode.data = { ...vizNode.data, path: rootEipPath };
      vizNode.updateModel(undefined);

      const existingPrimaryNodeId = vizNode.data.primaryNodeId;
      if (!existingPrimaryNodeId) return;

      vizNode.data = {
        ...vizNode.data,
        path: `${rootEipPath}.${newProcessorName}`,
        primaryNodeId: {
          ...existingPrimaryNodeId,
          name: newProcessorName,
        },
      };
      vizNode.updateModel(parsedDefinition);
      updateSourceCodeFromEntities();
      setProcessorName(newProcessorName);
    },
    [vizNode, processorName, parsedDefinition, updateSourceCodeFromEntities],
  );

  const ToIcon = getProcessorIcon('to');
  const ToDIcon = getProcessorIcon('toD');
  const PollIcon = getProcessorIcon('poll');
  const tooltips = useProcessorTooltips(COMPONENT_MODE_PROCESSORS);

  return (
    <section className="component-mode">
      <ToggleGroup isCompact aria-label="Component Mode Toggle Group">
        {ToIcon && (
          <ToggleGroupItem
            icon={<ToIcon />}
            text="Static"
            buttonId="to"
            title={tooltips.to}
            isSelected={processorName === 'to'}
            onChange={() => {
              switchComponentMode('to');
            }}
          />
        )}
        {ToDIcon && (
          <ToggleGroupItem
            icon={<ToDIcon />}
            text="Dynamic"
            buttonId="toD"
            title={tooltips.toD}
            isSelected={processorName === 'toD'}
            onChange={() => {
              switchComponentMode('toD');
            }}
          />
        )}
        {PollIcon && (
          <ToggleGroupItem
            icon={<PollIcon />}
            text="Poll"
            buttonId="poll"
            title={tooltips.poll}
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

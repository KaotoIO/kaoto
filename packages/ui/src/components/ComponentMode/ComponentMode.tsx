import './ComponentMode.scss';

import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useState } from 'react';

import { useProcessorTooltips } from '../../hooks/use-processor-tooltips.hook';
import { useEntityContext } from '../../hooks/useEntityContext/useEntityContext';
import { IVisualizationNode } from '../../models';
import { COMPONENT_MODE_PROCESSORS } from '../../models/special-processors.constants';
import { getProcessorIcon } from '../../utils/processor-icon';

const ToIcon = getProcessorIcon('to');
const ToDIcon = getProcessorIcon('toD');
const PollIcon = getProcessorIcon('poll');

export const ComponentMode: FunctionComponent<{ vizNode?: IVisualizationNode }> = ({ vizNode }) => {
  const { updateSourceCodeFromEntities } = useEntityContext();
  const [processorName, setProcessorName] = useState(vizNode?.data.primaryNodeId?.name);

  const switchComponentMode = useCallback(
    (newProcessorName: keyof ProcessorDefinition) => {
      if (!vizNode || newProcessorName === processorName) return;

      if (!vizNode.switchComponentMode(newProcessorName)) return;
      updateSourceCodeFromEntities();
      setProcessorName(newProcessorName);
    },
    [vizNode, processorName, updateSourceCodeFromEntities],
  );

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

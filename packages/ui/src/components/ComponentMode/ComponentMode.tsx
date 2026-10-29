import './ComponentMode.scss';

import { ContentSwitcher, Switch } from '@carbon/react';
import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { FunctionComponent, useCallback, useMemo, useState } from 'react';

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

  const processors = useMemo(
    () => [
      { name: 'to', text: 'Static', icon: ToIcon, tooltip: tooltips.to },
      { name: 'toD', text: 'Dynamic', icon: ToDIcon, tooltip: tooltips.toD },
      { name: 'poll', text: 'Poll', icon: PollIcon, tooltip: tooltips.poll },
    ],
    [ToIcon, ToDIcon, PollIcon, tooltips],
  );

  const selectedIndex = processors.findIndex((p) => p.name === processorName);

  return (
    <section className="component-mode">
      <ContentSwitcher
        size="sm"
        aria-label="Component Mode Toggle Group"
        selectedIndex={Math.max(selectedIndex, 0)}
        onChange={({ name }: { name?: string | number }) => {
          if (typeof name === 'string') {
            switchComponentMode(name as keyof ProcessorDefinition);
          }
        }}
      >
        {processors
          .filter(({ icon }) => icon !== null && icon !== undefined)
          .map(({ name, text, icon: Icon, tooltip }) => (
            <Switch key={name} name={name} text={text} title={tooltip}>
              {Icon && <Icon />}
            </Switch>
          ))}
      </ContentSwitcher>
    </section>
  );
};

export default ComponentMode;

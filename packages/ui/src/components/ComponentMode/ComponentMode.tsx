import './ComponentMode.scss';

import { ContentSwitcher, Switch } from '@carbon/react';
import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { FunctionComponent, useCallback, useMemo, useState } from 'react';

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

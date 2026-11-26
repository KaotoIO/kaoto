import { DefaultGroup, GraphElement, isNode, observer, withSelection } from '@patternfly/react-topology';
import { FunctionComponent } from 'react';

import { CanvasNode } from '../../Canvas/canvas.models';
import { NodeContextMenuFn } from '../ContextMenu/NodeContextMenu';
import { withNodeContextMenu } from '../ContextMenu/withNodeContextMenu';
import { useCollapseStep } from '../hooks/collapse-step.hook';
import { CustomNodeWithSelection } from '../Node/CustomNode';
import { useRouteLinkAnchors } from '../route-link-anchor';
import { AgentStepLinks } from './AgentStepLinks';
import { CustomGroupExpanded } from './CustomGroupExpanded';

type IDefaultGroup = Parameters<typeof DefaultGroup>[0];
interface ICustomGroup extends IDefaultGroup {
  element: GraphElement<CanvasNode, CanvasNode['data']>;
}

const CustomGroupInner: FunctionComponent<ICustomGroup> = observer(({ element, onCollapseChange, ...rest }) => {
  if (!isNode(element)) {
    throw new Error('CustomGroupInner must be used only on Node elements');
  }

  const { onCollapseNode, onExpandNode } = useCollapseStep(element);
  useRouteLinkAnchors();
  /* A route draws the links from its agent steps to where its links to the tools start, expanded or collapsed */
  const agentStepLinks = !isNode(element.getParent()) && <AgentStepLinks element={element} />;

  if (element.isCollapsed()) {
    return (
      <>
        <CustomNodeWithSelection
          {...rest}
          element={element}
          onCollapseToggle={() => {
            onExpandNode();
            onCollapseChange?.(element, true);
          }}
        />
        {agentStepLinks}
      </>
    );
  }

  return (
    <>
      <CustomGroupExpanded
        {...rest}
        element={element}
        onCollapseToggle={() => {
          onCollapseNode();
          onCollapseChange?.(element, false);
        }}
      />
      {agentStepLinks}
    </>
  );
});

export const CustomGroup: FunctionComponent<ICustomGroup> = ({ element, ...rest }: ICustomGroup) => {
  if (!isNode(element)) {
    throw new Error('CustomGroup must be used only on Node elements');
  }

  return <CustomGroupInner element={element} {...rest} />;
};

export const CustomGroupWithSelection = withSelection()(withNodeContextMenu(NodeContextMenuFn)(CustomGroup));

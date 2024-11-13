import { isNode, observer } from '@patternfly/react-topology';
import { FunctionComponent } from 'react';
import { useCollapseStep } from '../hooks/collapse-step.hook';
import { CustomNodeWithSelection } from '../Node/CustomNode';
import { CustomGroupExpendedWithDndDrop } from './CustomGroupExpanded';
import { CustomGroupProps } from './Group.models';

export const CustomGroupCollapsible: FunctionComponent<CustomGroupProps> = observer(
  ({ className, element, selected, onCollapseChange, ...rest }) => {
    if (!isNode(element)) {
      throw new Error('CustomGroupCollapsible must be used only on Node elements');
    }

    const { onCollapseNode, onExpandNode } = useCollapseStep(element);

    if (element.isCollapsed()) {
      return (
        <CustomNodeWithSelection
          element={element}
          onCollapseToggle={() => {
            onExpandNode();
            onCollapseChange?.(element, true);
          }}
        />
      );
    }

    return (
      <CustomGroupExpendedWithDndDrop
        {...rest}
        element={element}
        onCollapseToggle={() => {
          onCollapseNode();
          onCollapseChange?.(element, false);
        }}
      />
    );
  },
);

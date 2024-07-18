import { action, Dimensions, Node, observer } from '@patternfly/react-topology';
import clsx from 'clsx';
import { FunctionComponent } from 'react';
import { CustomGroupCollapsed } from './CustomGroupCollapsed';
import { CustomGroupExpanded } from './CustomGroupExpanded';
import { CustomGroupProps } from './Group.models';

export const CustomGroupCollapsible: FunctionComponent<CustomGroupProps> = observer(
  ({ className, element, selected, onCollapseChange, ...rest }) => {
    const handleCollapse = (group: Node, collapsed: boolean): void => {
      action(() => {
        if (collapsed && rest.collapsedWidth !== undefined && rest.collapsedHeight !== undefined) {
          group.setDimensions(new Dimensions(rest.collapsedWidth, rest.collapsedHeight));
        }

        group.setCollapsed(collapsed);
        group.getController().getGraph().layout();
      })();

      onCollapseChange?.(group, collapsed);
    };
    const vizNode = element.getData()?.vizNode;
    const isDisabled = !!vizNode?.getComponentSchema()?.definition?.disabled;
    const classNames = clsx(className, { 'custom-group--selected': selected, 'custom-group--disabled': isDisabled });

    if (element.isCollapsed()) {
      return (
        <CustomGroupCollapsed className={classNames} element={element} onCollapseChange={handleCollapse} {...rest} />
      );
    }
    return <CustomGroupExpanded className={classNames} element={element} onCollapseChange={handleCollapse} {...rest} />;
  },
);

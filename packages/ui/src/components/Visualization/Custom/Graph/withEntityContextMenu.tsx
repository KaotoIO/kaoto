import { WithContextMenuProps } from '@patternfly/react-topology';
import React, { ComponentType, useMemo } from 'react';
import { useCanvasEntities } from '../../../../hooks/useCanvasEntities';
import { generateEntityContextMenu } from './generateEntityContextMenu';

export interface WithEntityContextMenuProps {
  entityContextMenuFn: () => React.ReactElement[];
}

export const withEntityContextMenu = <P extends WithContextMenuProps>(
  WrappedComponent: ComponentType<P & WithEntityContextMenuProps>,
) => {
  return (props: P) => {
    const entityData = useCanvasEntities();

    const entityContextMenuFn = useMemo(() => () => generateEntityContextMenu(entityData), [entityData]);

    return <WrappedComponent {...props} entityContextMenuFn={entityContextMenuFn} />;
  };
};

import { FunctionComponent, lazy, PropsWithChildren, useContext } from 'react';

import { RenderingAnchorContext } from '../RenderingAnchor/rendering.provider';
import { IRegisteredComponent } from '../RenderingAnchor/rendering.provider.model';
import { Anchors } from './anchors';
import { componentModeActivationFn } from './component-mode.activationfn';
import { datamapperActivationFn } from './datamapper.activationfn';
import { groupAutoStartupActivationFn } from './group-auto-startup.activationfn';

// Keep lazy component identities stable across remounts and Suspense retries.
const componentsToRegister: IRegisteredComponent[] = [
  {
    anchor: Anchors.CanvasFormHeader,
    activationFn: datamapperActivationFn,
    component: lazy(() => import('../DataMapper/DataMapperLauncher')),
  },
  {
    anchor: Anchors.CanvasFormHeader,
    activationFn: componentModeActivationFn,
    component: lazy(() => import('../ComponentMode/ComponentMode')),
  },
  {
    anchor: Anchors.CanvasGroupTitlebar,
    activationFn: groupAutoStartupActivationFn,
    component: lazy(() => import('../GroupAutoStartupSwitch/GroupAutoStartupSwitch')),
  },
];

export const RegisterComponents: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const { registerComponent } = useContext(RenderingAnchorContext);

  componentsToRegister.forEach((regComponent) => {
    registerComponent(regComponent);
  });

  return <>{children}</>;
};

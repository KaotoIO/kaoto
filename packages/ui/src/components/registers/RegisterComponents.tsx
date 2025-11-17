import { FunctionComponent, lazy, PropsWithChildren, useContext, useRef } from 'react';

import { RenderingAnchorContext } from '../RenderingAnchor/rendering.provider';
import { IRegisteredComponent } from '../RenderingAnchor/rendering.provider.model';
import { Anchors } from './anchors';
import { componentModeActivationFn } from './component-mode.activationfn';
import { datamapperActivationFn } from './datamapper.activationfn';

export const RegisterComponents: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const { registerComponent } = useContext(RenderingAnchorContext);

  const componentsToRegister = useRef<IRegisteredComponent[]>([
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
  ]);

  componentsToRegister.current.forEach((regComponent) => registerComponent(regComponent));

  return <>{children}</>;
};

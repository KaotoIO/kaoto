import { FunctionComponent, lazy, PropsWithChildren, useContext, useRef } from 'react';

import { RenderingAnchorContext } from '../RenderingAnchor/rendering.provider';
import { IRegisteredComponent } from '../RenderingAnchor/rendering.provider.model';
import { Anchors } from './anchors';
import { componentModeActivationFn } from './component-mode.activationfn';
import { datamapperActivationFn } from './datamapper.activationfn';
import { directRouteNavigationActivationFn } from './direct-route-navigation.activationfn';

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
    {
      anchor: Anchors.CanvasNodeBottomRight,
      activationFn: directRouteNavigationActivationFn,
      component: lazy(() =>
        import('../Visualization/Custom/Node/DirectRouteNavigationAnchor').then((module) => ({
          default: module.DirectRouteNavigationAnchor,
        })),
      ),
    },
  ]);

  componentsToRegister.current.forEach((regComponent) => registerComponent(regComponent));

  return <>{children}</>;
};

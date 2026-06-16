import { Content, ContentVariants } from '@patternfly/react-core';
import { createContext, FunctionComponent, PropsWithChildren, Suspense, useCallback, useMemo, useRef } from 'react';

import { getCamelRandomId } from '../../camel-utils/camel-random-id';
import { IVisualizationNode } from '../../models';
import { Loading } from '../Loading';
import { IRegisteredComponent, IRenderingAnchorContext } from './rendering.provider.model';

export const RenderingAnchorContext = createContext<IRenderingAnchorContext>({
  registerComponent: () => {},
  getRegisteredComponents: () => [],
});

export const RenderingProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const registeredComponents = useRef<({ key: string } & IRegisteredComponent)[]>([]);

  const registerComponent = useCallback((props: IRegisteredComponent) => {
    const key = getCamelRandomId(props.anchor, 6);
    registeredComponents.current.push({ key, ...props });
  }, []);

  const getRegisteredComponents = useCallback((anchorTag: string, vizNode: IVisualizationNode) => {
    return registeredComponents.current
      .filter(
        (registeredComponent) => registeredComponent.anchor === anchorTag && registeredComponent.activationFn(vizNode),
      )
      .map(({ key, component }) => ({ key, Component: component }));
  }, []);

  const value = useMemo(
    () => ({ registerComponent, getRegisteredComponents }),
    [getRegisteredComponents, registerComponent],
  );

  return (
    <Suspense
      fallback={
        <Loading>
          <Content data-testid="loading-dynamic-components" component={ContentVariants.h3}>
            Loading dynamic components...
          </Content>
        </Loading>
      }
    >
      <RenderingAnchorContext.Provider value={value}>{children}</RenderingAnchorContext.Provider>
    </Suspense>
  );
};

import { isDefined } from '@kaoto/forms';
import { FunctionComponent, Suspense, useContext } from 'react';

import { IVisualizationNode } from '../../models';
import { LoadingSmall } from '../Loading';
import { RenderingAnchorContext } from './rendering.provider';

interface IRenderingAnchor {
  anchorTag: string;
  vizNode: IVisualizationNode | undefined;
}

export const RenderingAnchor: FunctionComponent<IRenderingAnchor> = ({ anchorTag, vizNode }) => {
  const renderingAnchorContext = useContext(RenderingAnchorContext);

  if (!isDefined(vizNode)) {
    return null;
  }

  const registeredChildren = renderingAnchorContext.getRegisteredComponents(anchorTag, vizNode);

  if (registeredChildren.length === 0) {
    return null;
  }

  // The registered components are lazy: keep their loading local to the anchor instead of suspending the editor
  return (
    <Suspense fallback={<LoadingSmall />}>
      {registeredChildren.map(({ key, Component }) => (
        <Component key={key} vizNode={vizNode} />
      ))}
    </Suspense>
  );
};

import { FunctionComponent, useEffect } from 'react';
import { useCanvas } from '../../../hooks/useCanvas';

export const CanvasMonitor: FunctionComponent = () => {
  const { getAllNodePaths, reloadNodeReferences } = useCanvas();

  useEffect(() => {
    console.log(
      'Node References: [' +
        getAllNodePaths()
          .map((p) => p + '\n')
          .toString() +
        ']',
    );
  }, [getAllNodePaths, reloadNodeReferences]);

  return <></>;
};

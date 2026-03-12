import { FunctionComponent, useEffect } from 'react';

import { useDocumentTreeStore } from '../../../store';

export const CanvasMonitor: FunctionComponent = () => {
  const nodesConnectionPorts = useDocumentTreeStore((state) => state.nodesConnectionPorts);

  useEffect(() => {
    const nodePaths = Object.keys(nodesConnectionPorts);
    console.debug('Connection Ports: [' + nodePaths.map((p) => p + '\n').toString() + ']');
  }, [nodesConnectionPorts]);

  return <></>;
};

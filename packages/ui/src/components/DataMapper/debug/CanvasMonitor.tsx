import { FunctionComponent, useEffect } from 'react';

import { useDocumentTreeStore } from '../../../store';

export const CanvasMonitor: FunctionComponent = () => {
  const nodesConnectionPorts = useDocumentTreeStore((state) => state.nodesConnectionPorts);
  const connectionPortVersion = useDocumentTreeStore((state) => state.connectionPortVersion);

  useEffect(() => {
    const nodePaths = Object.keys(nodesConnectionPorts);
    console.debug('Connection Ports: [' + nodePaths.map((p) => p + '\n').toString() + ']');
  }, [nodesConnectionPorts, connectionPortVersion]);

  return <></>;
};

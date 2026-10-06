import { FunctionComponent } from 'react';

interface Props {
  documentNodeId: string;
  isSource: boolean;
  edge: 'top' | 'bottom';
}

export const EdgeMarkerPort: FunctionComponent<Props> = ({ documentNodeId, isSource, edge }) => (
  <span
    className={`expansion-panel__edge-marker expansion-panel__edge-marker--${edge} ${isSource ? 'expansion-panel__edge-marker--source' : 'expansion-panel__edge-marker--target'}`}
    data-connection-port="true"
    data-document-node-id={documentNodeId}
    data-edge={edge}
  />
);

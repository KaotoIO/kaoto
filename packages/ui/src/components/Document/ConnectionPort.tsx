import { FunctionComponent } from 'react';

interface Props {
  documentNodeId: string;
  nodePath: string;
  isSource: boolean;
  testId?: string;
}

export const ConnectionPort: FunctionComponent<Props> = ({ documentNodeId, nodePath, isSource, testId }) => (
  <span
    className={`node__connection-port ${isSource ? 'node__connection-port--source' : 'node__connection-port--target'}`}
    data-testid={testId}
    data-connection-port="true"
    data-node-path={nodePath}
    data-document-node-id={documentNodeId}
  />
);

import {
  Alert,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  CodeBlock,
  CodeBlockCode,
} from '@patternfly/react-core';
import { stringify } from 'yaml';
import { FunctionComponent } from 'react';

interface UnknownNodeProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any;
}

export const UnknownNode: FunctionComponent<UnknownNodeProps> = (props) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Node source</CardTitle>
      </CardHeader>
      <CardBody>
        <CodeBlock>
          <CodeBlockCode>{stringify(props.model)}</CodeBlockCode>
        </CodeBlock>
      </CardBody>
      <CardFooter>
        <Alert variant="warning" title="Unknow node type">
          The configuration for an unknown node cannot be changed in the configuration form. Please switch to the source
          code and correct the node type. Another option is to replace the step in the graphical editor but in that case
          you will probably lose the existing configuration.
        </Alert>
      </CardFooter>
    </Card>
  );
};

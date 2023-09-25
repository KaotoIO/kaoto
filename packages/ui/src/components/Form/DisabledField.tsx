import { ConnectedFieldProps, connectField } from 'uniforms';
import { ExpandableDetails } from './ExpandableDetails';
import { Card, CardBody, CardTitle } from '@patternfly/react-core';

interface CustomStepsFieldProps {
  'data-testid': string;
  [key: string]: string;
}

export const DisabledField = connectField((props: ConnectedFieldProps<CustomStepsFieldProps>) => {
  return (
    <Card>
      <CardTitle>{props.label}</CardTitle>
      <CardBody>
        <ExpandableDetails details={props}>
          <p>Configuring this field is not yet supported</p>
        </ExpandableDetails>
      </CardBody>
    </Card>
  );
});

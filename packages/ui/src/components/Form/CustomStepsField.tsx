import { ConnectedFieldProps, connectField } from 'uniforms';
import { ExpandableDetails } from './ExpandableDetails';
import { Card, CardBody, CardTitle } from '@patternfly/react-core';

interface CustomStepsFieldProps {
  'data-testid': string;
  [key: string]: string;
}

export const CustomStepsField = connectField((props: ConnectedFieldProps<CustomStepsFieldProps>) => {
  return (
    <Card>
      <CardTitle>Steps field</CardTitle>
      <CardBody>
        <ExpandableDetails details={props}>
          <p>This field has been replaced</p>
        </ExpandableDetails>
      </CardBody>
    </Card>
  );
});

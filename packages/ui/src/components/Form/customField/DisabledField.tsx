import { Card, CardBody, CardTitle } from '@patternfly/react-core';
import { ConnectedFieldProps, connectField } from 'uniforms';
import { CustomExpandableSection } from './CustomExpandableSection';

interface CustomStepsFieldProps {
  'data-testid': string;
  [key: string]: string;
}

export const DisabledField = connectField((props: ConnectedFieldProps<CustomStepsFieldProps>) => {
  return (
    <Card>
      <CardTitle>{props.label}</CardTitle>
      <CardBody>
        <p>Configuring this field is not yet supported</p>

        <CustomExpandableSection groupName={props.name}>
          <code>
            <pre>{JSON.stringify(props, null, 2)}</pre>
          </code>
        </CustomExpandableSection>
      </CardBody>
    </Card>
  );
});

import { Alert, Card, CardBody } from '@patternfly/react-core';
import { FunctionComponent } from 'react';

export const NoFieldFound: FunctionComponent = () => {
  return (
    <Card>
      <CardBody>
        <Alert variant="info" title="No Field Found">
          No field found matching this criteria. Please switch to the All tab.
        </Alert>
      </CardBody>
    </Card>
  );
};

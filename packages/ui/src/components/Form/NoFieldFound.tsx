import { Alert, Button, Card, CardBody } from '@patternfly/react-core';
import { FunctionComponent, useContext } from 'react';
import { CanvasFormTabsContext } from '../../providers';

export const NoFieldFound: FunctionComponent = () => {
  const { selectedTab, onTabChange } = useContext(CanvasFormTabsContext);
  return (
    <Card>
      <CardBody>
        <Alert variant="info" title={`No ${selectedTab} Field Found`}>
          No field found matching this criteria. Please switch to the{' '}
          <Button id="All" onClick={(e) => onTabChange(e, true)} variant="link" isInline>
            <b>All</b>
          </Button>{' '}
          tab.
        </Alert>
      </CardBody>
    </Card>
  );
};

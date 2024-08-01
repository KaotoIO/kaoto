import { Alert, Card, CardBody, Button } from '@patternfly/react-core';
import { FunctionComponent, useContext } from 'react';
import { CanvasFormTabsContext } from '../../providers';
import { FormTabsModes } from '../Visualization/Canvas';

export const NoFieldFound: FunctionComponent = () => {
  const { selectedTab, onTabChange } = useContext(CanvasFormTabsContext);
  return (
    <Card>
      <CardBody>
        <Alert variant="info" title={`No ${selectedTab} Field Found`}>
          No field found matching this criteria. Please switch to the{' '}
          <Button id={FormTabsModes.ALL_FIELDS} onClick={(e) => onTabChange(e, true)} variant="link" isInline>
            <b>All</b>
          </Button>{' '}
          tab.
        </Alert>
      </CardBody>
    </Card>
  );
};

import { Alert, Button, Card, CardBody } from '@patternfly/react-core';
import { FunctionComponent, useContext } from 'react';
import { CanvasFormTabsContext } from '../../providers';

export const NoFieldFound: FunctionComponent = () => {
  const canvasFormTabsContext = useContext(CanvasFormTabsContext);

  if (!canvasFormTabsContext) {
    return null;
  }

  return (
    <Card data-testid="no-field-found">
      <CardBody>
        <Alert variant="info" title={`No ${canvasFormTabsContext.selectedTab} fields found`}>
          No field found matching this criteria. Please switch to the{' '}
          <Button id="All" onClick={canvasFormTabsContext.onTabChange} variant="link" isInline>
            <b>All</b>
          </Button>{' '}
          tab.
        </Alert>
      </CardBody>
    </Card>
  );
};

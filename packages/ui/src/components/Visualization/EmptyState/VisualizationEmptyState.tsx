import './VisualizationEmptyState.scss';

import { View } from '@carbon/icons-react';
import {
  Bullseye,
  Button,
  Card,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { FunctionComponent, useContext, useMemo } from 'react';

import noDataIcon from '../../../assets/no-data.svg';
import notFoundIcon from '../../../assets/not-found.svg';
import { IDataTestID } from '../../../models';
import { VisibleFlowsContext } from '../../../providers';
import { NewFlow } from './FlowType/NewFlow';

interface IVisualizationEmptyState extends IDataTestID {
  entitiesNumber: number;
  className?: string;
}

export const VisualizationEmptyState: FunctionComponent<IVisualizationEmptyState> = (props) => {
  const hasRoutes = useMemo(() => props.entitiesNumber > 0, [props.entitiesNumber]);
  const visibleFlowsContext = useContext(VisibleFlowsContext)!;

  return (
    <Bullseye className={props.className}>
      <Card>
        <img
          src={hasRoutes ? noDataIcon : notFoundIcon}
          alt={hasRoutes ? 'no data' : 'not found'}
          className="empty-state-icon"
        />
        <EmptyState
          headingLevel="h4"
          titleText={hasRoutes ? <p>There are no visible routes</p> : <p>There are no routes defined</p>}
          data-testid={props['data-testid']}
        >
          <EmptyStateBody>
            {hasRoutes ? (
              <Button
                onClick={() => {
                  visibleFlowsContext.visualFlowsApi?.showFlows();
                }}
                data-testid="show-all-routes-button"
                variant="control"
                icon={<View />}
              >
                <span className="pf-v6-u-m-sm">Show all routes</span>
              </Button>
            ) : (
              <p>You can create a new route using the New button</p>
            )}
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>{!hasRoutes && <NewFlow />}</EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      </Card>
    </Bullseye>
  );
};

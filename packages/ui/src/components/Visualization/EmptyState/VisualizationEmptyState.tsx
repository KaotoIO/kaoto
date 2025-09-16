import {
  Bullseye,
  Button,
  Card,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
} from '@patternfly/react-core';
import {
  EyeIcon,
  CubesIcon as PatternFlyCubesIcon,
  EyeSlashIcon as PatternFlyEyeSlashIcon,
} from '@patternfly/react-icons';
import { FunctionComponent, useContext, useMemo } from 'react';
import { IDataTestID } from '../../../models';
import { VisibleFlowsContext } from '../../../providers';
import { NewFlow } from './FlowType/NewFlow';

const CubesIcon: FunctionComponent = (props) => <PatternFlyCubesIcon data-testid="cubes-icon" {...props} />;
const EyeSlashIcon: FunctionComponent = (props) => <PatternFlyEyeSlashIcon data-testid="eye-slash-icon" {...props} />;

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
        <EmptyState
          headingLevel="h4"
          icon={hasRoutes ? EyeSlashIcon : CubesIcon}
          titleText={hasRoutes ? <p>There are no visible routes</p> : <p>There are no routes defined</p>}
          data-testid={props['data-testid']}
        >
          <EmptyStateBody>
            {hasRoutes ? (
              <Button
                onClick={() => {
                  visibleFlowsContext.visualFlowsApi?.showFlows();
                }}
                data-testid={'show-all-routes-button'}
                variant="control"
                icon={<EyeIcon />}
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

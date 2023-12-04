import { Button, Card, CardBody, Grid, CardTitle, GridItem, CardHeader } from '@patternfly/react-core';
import { TopologySideBar } from '@patternfly/react-topology';
import { FunctionComponent } from 'react';
import { CanvasForm } from './CanvasForm';
import { CanvasNode } from './canvas.models';
import { TimesIcon } from '@patternfly/react-icons';
import { ErrorBoundary } from '../../ErrorBoundary';
import './CanvasSideBar.scss';

interface CanvasSideBarProps {
  selectedNode: CanvasNode | undefined;
  onClose: () => void;
}

export const CanvasSideBar: FunctionComponent<CanvasSideBarProps> = (props) => {
  return (
    /**
     * We cannot use the onClose property since the button has 'position: absolute'
     * and doesn't take into account the sidebar children.
     */
    <TopologySideBar show={props.selectedNode !== undefined}>
      <Card>
        <CardHeader>
          <Grid hasGutter>
            <GridItem span={2}>
              <img
                className={'sidebar-icon-' + props.selectedNode?.label}
                src={props.selectedNode?.data?.vizNode?.data.icon}
                alt="icon"
              />
            </GridItem>
            <GridItem span={9}>
              <CardTitle>{props.selectedNode?.label}</CardTitle>
            </GridItem>
            <GridItem span={1}>
              <Button data-testid="close-side-bar" variant="plain" icon={<TimesIcon />} onClick={props.onClose} />
            </GridItem>
          </Grid>
        </CardHeader>
        <CardBody>
          {props.selectedNode === undefined ? null : (
            <ErrorBoundary key={props.selectedNode.id} fallback={<p>Something didn't work as expected</p>}>
              <CanvasForm selectedNode={props.selectedNode} />
            </ErrorBoundary>
          )}
        </CardBody>
      </Card>
    </TopologySideBar>
  );
};

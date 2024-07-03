import { Button, Grid, GridItem, Title } from '@patternfly/react-core';
import FilterIcon from '@patternfly/react-icons/dist/esm/icons/filter-icon';
import { TimesIcon } from '@patternfly/react-icons';
import { FunctionComponent, useContext } from 'react';
import './CanvasFormHeader.scss';
import { FormTypeContext } from '../../../../providers';

interface CanvasFormHeaderProps {
  nodeId: string;
  title?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodeIcon: any;
  onClose?: () => void;
}

export const CanvasFormHeader: FunctionComponent<CanvasFormHeaderProps> = (props) => {
  const { onToggleClick } = useContext(FormTypeContext);
  return (
    <Grid hasGutter>
      <GridItem className="form-header" span={11}>
        <img className={`form-header__icon-${props.nodeId}`} src={props.nodeIcon} alt="icon" />
        <Title className="form-header__title" headingLevel="h2">
          {props.title}
        </Title>
        <Button variant="link" icon={<FilterIcon />} onClick={onToggleClick} />
      </GridItem>
      <GridItem span={1}>
        <Button data-testid="close-side-bar" variant="plain" icon={<TimesIcon />} onClick={props.onClose} />
      </GridItem>
    </Grid>
  );
};

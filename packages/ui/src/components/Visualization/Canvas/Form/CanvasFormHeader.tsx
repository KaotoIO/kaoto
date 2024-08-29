import {
  Button,
  Grid,
  GridItem,
  SearchInput,
  Title,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { FunctionComponent, useContext } from 'react';
import { CanvasFormTabsContext } from '../../../../providers/canvas-form-tabs.provider';
import { FilteredFieldContext } from '../../../../providers/filtered-field.provider';
import { FormTabsModes } from './canvasformtabs.modes';
import './CanvasFormHeader.scss';

interface CanvasFormHeaderProps {
  nodeId: string;
  title?: string;
  nodeIcon?: string;
  onClose?: () => void;
}

export const CanvasFormHeader: FunctionComponent<CanvasFormHeaderProps> = (props) => {
  const { filteredFieldText, onFilterChange } = useContext(FilteredFieldContext);
  const { selectedTab, onTabChange } = useContext(CanvasFormTabsContext);

  return (
    <>
      <Grid hasGutter>
        <GridItem className="form-header" span={11}>
          <img className={`form-header__icon-${props.nodeId}`} src={props.nodeIcon} alt="icon" />
          <Title className="form-header__title" headingLevel="h2">
            {props.title}
          </Title>
        </GridItem>
        <GridItem span={1}>
          <Button data-testid="close-side-bar" variant="plain" icon={<TimesIcon />} onClick={props.onClose} />
        </GridItem>
      </Grid>

      <ToggleGroup aria-label="Single selectable form tabs" className="form-tabs">
        {Object.entries(FormTabsModes).map(([mode, tooltip]) => (
          <Tooltip key={mode} content={tooltip}>
            <ToggleGroupItem
              key={mode}
              text={mode}
              buttonId={mode}
              isSelected={selectedTab === mode}
              onChange={onTabChange}
            />
          </Tooltip>
        ))}
      </ToggleGroup>

      <SearchInput
        className="filter-fields"
        placeholder="Find properties by name"
        data-testid="filter-fields"
        value={filteredFieldText}
        onChange={onFilterChange}
        onClear={onFilterChange}
      />
    </>
  );
};

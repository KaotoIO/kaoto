import './CanvasFormHeader.scss';

import { CanvasFormTabsContext, FilteredFieldContext, FormTabsModes } from '@kaoto/forms';
import { Button, Grid, GridItem, SearchInput, Title, ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { FunctionComponent, useContext } from 'react';

interface CanvasFormHeaderProps {
  nodeId: string;
  title?: string;
  nodeIcon?: string;
  onClose?: () => void;
}

export const CanvasFormHeader: FunctionComponent<CanvasFormHeaderProps> = (props) => {
  const { filteredFieldText, onFilterChange } = useContext(FilteredFieldContext);
  const canvasFormTabsContext = useContext(CanvasFormTabsContext);

  return (
    <>
      <Grid hasGutter>
        <GridItem className="form-header" span={11}>
          <img className={`form-header__icon-${props.nodeId}`} src={props.nodeIcon} alt="icon" />
          <Title className="form-header__title" headingLevel="h2">
            {props.title}
          </Title>
        </GridItem>
        <GridItem span={1} className="canvas-header-close">
          <Button data-testid="close-side-bar" variant="plain" icon={<TimesIcon />} onClick={props.onClose} />
        </GridItem>
      </Grid>

      {canvasFormTabsContext && (
        <ToggleGroup aria-label="Single selectable form tabs" className="form-tabs">
          {Object.entries(FormTabsModes).map(([mode, tooltip]) => (
            <ToggleGroupItem
              title={tooltip}
              key={mode}
              text={mode}
              buttonId={mode}
              isSelected={canvasFormTabsContext.selectedTab === mode}
              onChange={() => {
                canvasFormTabsContext.setSelectedTab(mode as keyof typeof FormTabsModes);
              }}
            />
          ))}
        </ToggleGroup>
      )}

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

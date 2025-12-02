import './CanvasFormHeader.scss';

import { CanvasFormTabsContext, FilteredFieldContext, FormTabsModes } from '@kaoto/forms';
import { Button, Grid, GridItem, SearchInput, Title, ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { FunctionComponent, useContext } from 'react';

import { CatalogKind } from '../../../../models';
import { IconResolver } from '../../../IconResolver';

interface CanvasFormHeaderProps {
  nodeId: string;
  catalogKind: CatalogKind;
  name: string;
  title?: string;
  onClose?: () => void;
}

export const CanvasFormHeader: FunctionComponent<CanvasFormHeaderProps> = ({
  nodeId,
  catalogKind,
  name,
  title,
  onClose,
}) => {
  const { filteredFieldText, onFilterChange } = useContext(FilteredFieldContext);
  const canvasFormTabsContext = useContext(CanvasFormTabsContext);

  return (
    <>
      <Grid hasGutter>
        <GridItem className="form-header" span={11}>
          <IconResolver className={`form-header__icon-${nodeId}`} catalogKind={catalogKind} name={name} />

          <Title className="form-header__title" headingLevel="h2">
            {title}
          </Title>
        </GridItem>
        <GridItem span={1} className="canvas-header-close">
          <Button data-testid="close-side-bar" variant="plain" icon={<TimesIcon />} onClick={onClose} />
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

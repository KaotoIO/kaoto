import './CanvasFormHeader.scss';

import { Close } from '@carbon/icons-react';
import { ContentSwitcher, IconButton, Search, Switch } from '@carbon/react';
import { CanvasFormTabsContext, FilteredFieldContext, FormTabsModes } from '@kaoto/forms';
import { FunctionComponent, useCallback, useContext, useState } from 'react';

interface CanvasFormHeaderProps {
  nodeId: string;
  iconUrl: string;
  title?: string;
  onClose?: () => void;
}

export const CanvasFormHeader: FunctionComponent<CanvasFormHeaderProps> = ({ nodeId, iconUrl, title, onClose }) => {
  const { filteredFieldText, onFilterChange } = useContext(FilteredFieldContext);
  const canvasFormTabsContext = useContext(CanvasFormTabsContext);
  /**
   * `filteredFieldText` is debounced, so binding it directly to the input would
   * revert every keystroke until the debounce settles; keep the typed text locally
   */
  const [searchText, setSearchText] = useState(filteredFieldText);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchText(event.target.value);
      onFilterChange(event, event.target.value);
    },
    [onFilterChange],
  );

  const handleSearchClear = useCallback(() => {
    setSearchText('');
    onFilterChange(undefined, '');
  }, [onFilterChange]);

  const selectedTabIndex = canvasFormTabsContext
    ? Object.keys(FormTabsModes).indexOf(canvasFormTabsContext.selectedTab)
    : 0;

  return (
    <>
      <div className="form-header-row">
        <div className="form-header">
          {iconUrl && <img src={iconUrl} className={`form-header__icon-${nodeId}`} alt={title} />}
          <h2 className="form-header__title">{title}</h2>
        </div>
        <IconButton
          data-testid="close-side-bar"
          kind="ghost"
          size="sm"
          label="Close"
          onClick={onClose}
          className="canvas-header-close"
        >
          <Close />
        </IconButton>
      </div>

      {canvasFormTabsContext && (
        <ContentSwitcher
          aria-label="Single selectable form tabs"
          className="form-tabs"
          selectedIndex={selectedTabIndex}
          onChange={({ name }: { name?: string | number }) => {
            if (typeof name === 'string') {
              canvasFormTabsContext.setSelectedTab(name as keyof typeof FormTabsModes);
            }
          }}
        >
          {Object.entries(FormTabsModes).map(([mode, tooltip]) => (
            <Switch key={mode} name={mode} text={mode} title={tooltip} data-testid={`tab-${mode}`} />
          ))}
        </ContentSwitcher>
      )}

      <Search
        className="filter-fields"
        labelText="Find properties by name"
        placeholder="Find properties by name"
        data-testid="filter-fields"
        value={searchText}
        onChange={handleSearchChange}
        onClear={handleSearchClear}
        size="sm"
      />
    </>
  );
};

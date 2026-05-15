import './RuntimeSelector.scss';

import { FunctionComponent } from 'react';

import { useRuntimeContext } from '../../../../hooks/useRuntimeContext/useRuntimeContext';
import { getRuntimeIcon } from '../../../Icons/RuntimeIcon';

/**
 * Read-only display showing the currently active catalog based on file type and settings.
 * - For Citrus files: displays citrusCatalog from settings
 * - For Camel files: displays camelCatalog from settings
 * RuntimeProvider automatically selects the appropriate catalog.
 */
export const RuntimeSelector: FunctionComponent = () => {
  const runtimeContext = useRuntimeContext();

  if (!runtimeContext.selectedCatalog) {
    return null;
  }

  return (
    <div
      aria-label="Runtime Selector"
      className="runtime-selector-display"
      data-testid="runtime-selector-display"
      title="Catalog and version are read-only here. Change them in Settings."
    >
      {getRuntimeIcon(runtimeContext.selectedCatalog.name)}
      <span className="pf-v6-u-mr-sm">{runtimeContext.selectedCatalog.name}</span>
    </div>
  );
};

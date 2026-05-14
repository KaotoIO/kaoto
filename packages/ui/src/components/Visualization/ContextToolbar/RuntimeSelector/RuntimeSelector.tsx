import './RuntimeSelector.scss';

import { Information } from '@carbon/icons-react';
import { Toggletip, ToggletipActions, ToggletipButton, ToggletipContent, ToggletipLabel } from '@carbon/react';
import { FunctionComponent } from 'react';
import { Link } from 'react-router-dom';

import { useRuntimeContext } from '../../../../hooks/useRuntimeContext/useRuntimeContext';
import { Links } from '../../../../router/links.models';

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
    <div aria-label="Runtime Selector" className="runtime-selector-display" data-testid="runtime-selector-display">
      <ToggletipLabel>{runtimeContext.selectedCatalog.name}</ToggletipLabel>
      <Toggletip autoAlign>
        <ToggletipButton label="Show information">
          <Information />
        </ToggletipButton>
        <ToggletipContent>
          <p>Catalog and version are read-only here. Change them in Settings.</p>
          <ToggletipActions>
            <Link to={Links.Settings} className="cds--link">
              Go to Settings
            </Link>
          </ToggletipActions>
        </ToggletipContent>
      </Toggletip>
    </div>
  );
};

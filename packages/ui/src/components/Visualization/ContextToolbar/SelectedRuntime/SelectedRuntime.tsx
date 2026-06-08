import './SelectedRuntime.scss';

import { Information } from '@carbon/icons-react';
import { Toggletip, ToggletipActions, ToggletipButton, ToggletipContent, ToggletipLabel } from '@carbon/react';
import { FunctionComponent } from 'react';
import { Link } from 'react-router-dom';

import { useRuntimeContext } from '../../../../hooks/useRuntimeContext/useRuntimeContext';
import { Links } from '../../../../router/links.models';
import { getRuntimeIcon } from '../../../Icons/RuntimeIcon';

export const SelectedRuntime: FunctionComponent = () => {
  const { selectedCatalog } = useRuntimeContext();

  return (
    <div aria-label="Runtime Selector" className="runtime-selector-display" data-testid="runtime-selector-display">
      <ToggletipLabel>
        <span>
          {getRuntimeIcon(selectedCatalog?.name)} {selectedCatalog?.name}
        </span>
      </ToggletipLabel>

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

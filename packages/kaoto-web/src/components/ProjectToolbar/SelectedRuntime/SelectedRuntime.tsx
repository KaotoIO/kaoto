import './SelectedRuntime.scss';

import { Information } from '@carbon/icons-react';
import { Toggletip, ToggletipActions, ToggletipButton, ToggletipContent, ToggletipLabel } from '@carbon/react';
import { FunctionComponent } from 'react';
import { Link as RouterLink } from 'react-router';

import { useProjectContext } from '../../../hooks/useProjectContext';
import { useRuntimeContext } from '../../../hooks/useRuntimeContext';

export const SelectedRuntime: FunctionComponent = () => {
  const { selectedCatalog } = useRuntimeContext();
  const { projectId } = useProjectContext();

  return (
    <div aria-label="Runtime Selector" className="cs--selected-runtime" data-testid="runtime-selector-display">
      <Toggletip className="selected-runtime-toggletip">
        <ToggletipLabel className="selected-runtime-label">
          <span>{selectedCatalog ? `${selectedCatalog.name} ${selectedCatalog.version}` : 'No runtime selected'}</span>
        </ToggletipLabel>

        <ToggletipButton label="Show information">
          <Information />
        </ToggletipButton>

        <ToggletipContent>
          <p>Catalog and version are read-only here. Change them in Settings.</p>
          <ToggletipActions>
            <RouterLink to={`/projects/${projectId}/config`} className="cds--link">
              Go to Settings
            </RouterLink>
          </ToggletipActions>
        </ToggletipContent>
      </Toggletip>
    </div>
  );
};

import { isDefined } from '@kaoto/forms';
import { useContext, useEffect } from 'react';

import { SourceSchemaType } from '../../models/camel';
import { SettingsContext } from '../../providers/settings.provider';
import { findCatalog, requiresCatalogChange } from '../../utils/catalog-helper';
import { useEntityContext } from '../useEntityContext/useEntityContext';
import { useRuntimeContext } from '../useRuntimeContext/useRuntimeContext';

/**
 * Auto-switches the active catalog when the current schema type doesn't match.
 * For example, when a Test file is opened while the Main catalog is active,
 * this hook switches to the Citrus catalog using `testingCatalogName` from settings.
 */
export function useAutoSwitchCatalog(): void {
  const { currentSchemaType } = useEntityContext();
  const runtimeContext = useRuntimeContext();
  const settingsAdapter = useContext(SettingsContext);

  useEffect(() => {
    if (requiresCatalogChange(currentSchemaType, runtimeContext.selectedCatalog)) {
      const settings = settingsAdapter.getSettings();
      const preferredName =
        currentSchemaType === SourceSchemaType.Test ? settings.testingCatalogName : settings.runtimeCatalogName;
      const matchingCatalog = findCatalog(currentSchemaType, runtimeContext.catalogLibrary, preferredName);
      if (isDefined(matchingCatalog)) {
        runtimeContext.setSelectedCatalog(matchingCatalog);
      }
    }
  }, [currentSchemaType, runtimeContext.selectedCatalog, runtimeContext.catalogLibrary, settingsAdapter]);
}

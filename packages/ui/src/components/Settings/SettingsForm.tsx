import './SettingsForm.scss';

import { CanvasFormTabsContext, CanvasFormTabsContextResult, KaotoForm } from '@kaoto/forms';
import { Alert, Button, Card, CardBody, CardFooter, CardTitle } from '@patternfly/react-core';
import { FunctionComponent, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import settingsSchema from '../../assets/settingsSchema.json';
import { useReloadContext } from '../../hooks/useReloadContext/useReloadContext';
import { KaotoSchemaDefinition } from '../../models';
import { SettingsModel } from '../../models/settings';
import { SettingsContext } from '../../providers/settings.provider';
import { Links } from '../../router/links.models';
import { customFieldsFactoryfactory } from '../Visualization/Canvas/Form/fields/custom-fields-factory';

export const SettingsForm: FunctionComponent = () => {
  const settingsAdapter = useContext(SettingsContext);
  const formTabsValue: CanvasFormTabsContextResult = useMemo(
    () => ({ selectedTab: 'All', setSelectedTab: () => {} }),
    [],
  );
  const navigate = useNavigate();
  const { lastRender, reloadPage } = useReloadContext();
  const [settings, setSettings] = useState(settingsAdapter.getSettings());
  const [saveError, setSaveError] = useState<string | undefined>(undefined);
  const initialCatalogUrl = useMemo(() => settingsAdapter.getSettings().catalogUrl, [settingsAdapter]);

  const onChangeModel = (value: unknown) => {
    setSettings(value as SettingsModel);
    setSaveError(undefined);
  };

  const hasPendingCatalogUrlChange = settings.catalogUrl !== initialCatalogUrl;

  const onSave = async () => {
    try {
      await settingsAdapter.saveSettings(settings);
      reloadPage();

      if (!hasPendingCatalogUrlChange) {
        navigate(Links.Home);
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save settings');
    }
  };

  return (
    <Card className="settings-form-card" data-last-render={lastRender}>
      <CardTitle>Settings</CardTitle>

      <CardBody>
        {hasPendingCatalogUrlChange && (
          <Alert
            className="alert-catalog-url"
            isInline
            variant="info"
            title="Catalog versions will be recomputed after saving a custom catalog."
          >
            Runtime selector versions still reflect the currently saved catalog URL. Save the settings to recompute the
            available Camel and testing catalogs options from the new catalog URL.
          </Alert>
        )}
        {saveError && (
          <Alert className="alert-catalog-url" isInline variant="danger" title="Failed to save settings.">
            {saveError}
          </Alert>
        )}
        <CanvasFormTabsContext.Provider value={formTabsValue}>
          <KaotoForm
            data-testid="settings-form"
            schema={settingsSchema as KaotoSchemaDefinition['schema']}
            model={settings}
            onChange={onChangeModel}
            customFieldsFactory={customFieldsFactoryfactory}
          />
        </CanvasFormTabsContext.Provider>
      </CardBody>

      <CardFooter>
        <Button data-testid="settings-form-save-btn" variant="primary" onClick={onSave}>
          Save
        </Button>
      </CardFooter>
    </Card>
  );
};

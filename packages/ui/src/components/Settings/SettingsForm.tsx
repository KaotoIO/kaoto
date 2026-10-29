import './SettingsForm.scss';

import { Button, InlineNotification } from '@carbon/react';
import { CanvasFormTabsContext, CanvasFormTabsContextResult, KaotoForm } from '@kaoto/forms';
import { FunctionComponent, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

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
      settingsAdapter.saveSettings(settings);
      reloadPage();

      if (!hasPendingCatalogUrlChange) {
        await navigate(Links.Home);
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save settings');
    }
  };

  return (
    <div className="settings-form-card" data-last-render={lastRender}>
      <h2 className="settings-form-card__title">Settings</h2>

      <div className="settings-form-card__body">
        {hasPendingCatalogUrlChange && (
          <InlineNotification
            className="alert-catalog-url"
            kind="info"
            lowContrast
            hideCloseButton
            title="Catalog versions will be recomputed after saving a custom catalog."
            subtitle="Runtime selector versions still reflect the currently saved catalog URL. Save the settings to recompute the available Camel and testing catalogs options from the new catalog URL."
          />
        )}
        {saveError && (
          <InlineNotification
            className="alert-catalog-url"
            kind="error"
            lowContrast
            hideCloseButton
            title="Failed to save settings."
            subtitle={saveError}
          />
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
      </div>

      <div className="settings-form-card__footer">
        <Button
          data-testid="settings-form-save-btn"
          kind="primary"
          onClick={async () => {
            await onSave();
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
};

import { Button, Card, CardBody, CardFooter, CardTitle } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useState } from 'react';
import settingsSchema from '../../assets/settingsSchema.json';
import { useReloadContext } from '../../hooks/useReloadContext/useReloadContext';
import { KaotoSchemaDefinition } from '../../models';
import { SettingsModel } from '../../models/settings';
import { SchemaBridgeProvider } from '../../providers/schema-bridge.provider';
import { SettingsContext } from '../../providers/settings.provider';
import { CustomAutoForm } from '../Form/CustomAutoForm';

export const SettingsForm: FunctionComponent = () => {
  const settingsAdapter = useContext(SettingsContext);
  const { lastRender, reloadPage } = useReloadContext();
  const [settings, setSettings] = useState(settingsAdapter.getSettings());

  const onChangeModel = useCallback((value: unknown) => {
    setSettings(value as SettingsModel);
  }, []);

  const onSave = useCallback(() => {
    settingsAdapter.saveSettings(settings);
    reloadPage();
  }, [reloadPage, settings, settingsAdapter]);

  return (
    <Card data-last-render={lastRender}>
      <CardTitle>Settings</CardTitle>

      <CardBody>
        <SchemaBridgeProvider schema={settingsSchema as KaotoSchemaDefinition['schema']}>
          <CustomAutoForm data-testid="settings-form" model={settings} onChangeModel={onChangeModel} />
        </SchemaBridgeProvider>
      </CardBody>

      <CardFooter>
        <Button data-testid="settings-form-save-btn" variant="primary" onClick={onSave}>
          Save
        </Button>
      </CardFooter>
    </Card>
  );
};

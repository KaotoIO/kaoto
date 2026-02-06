import { CanvasFormTabsContext, CanvasFormTabsContextResult, KaotoForm } from '@kaoto/forms';
import { Button, Card, CardBody, CardFooter, CardTitle, Flex, FlexItem } from '@patternfly/react-core';
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

  const onChangeModel = (value: unknown) => {
    setSettings(value as SettingsModel);
  };

  const onSave = () => {
    settingsAdapter.saveSettings(settings);
    reloadPage();
    navigate(Links.Home);
  };

  return (
    <Card data-last-render={lastRender}>
      <CardTitle>Settings</CardTitle>

      <CardBody>
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
        <Flex justifyContent={{ default: 'justifyContentFlexEnd' }} style={{ width: '100%' }}>
          <FlexItem>
            <Button data-testid="settings-form-save-btn" variant="primary" onClick={onSave}>
              Apply
            </Button>
          </FlexItem>
        </Flex>
      </CardFooter>
    </Card>
  );
};

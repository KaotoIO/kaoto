import { CanvasFormTabsContext, CanvasFormTabsContextResult, KaotoForm, KaotoFormProps } from '@kaoto/forms';
import { Button, Card, CardBody, CardFooter, CardTitle } from '@patternfly/react-core';
import { FunctionComponent, useContext, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import configurationSchema from '../../assets/citrus-catalog/citrus/citrus-agent-configuration.json';
import { useReloadContext } from '../../hooks/useReloadContext/useReloadContext';
import { KaotoSchemaDefinition } from '../../models';
import { AgentConfigModel } from '../../models/citrus';
import { SettingsContext } from '../../providers';
import { Links } from '../../router/links.models';

export const AgentConfigurationForm: FunctionComponent = () => {
  const settingsAdapter = useContext(SettingsContext);
  const agentServiceUrl = settingsAdapter.getSettings().experimentalFeatures.citrusAgentServiceUrl || '';
  const formTabsValue: CanvasFormTabsContextResult = useMemo(
    () => ({ selectedTab: 'All', setSelectedTab: () => {} }),
    [],
  );
  const navigate = useNavigate();
  const { lastRender, reloadPage } = useReloadContext();
  const configuration = new AgentConfigModel();

  useEffect(() => {
    doFetch();
  });

  const doSave = (): void => {
    fetch(`${agentServiceUrl}/configuration`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(configuration),
    }).then((res) => {
      console.log(res);
    });
  };

  const doFetch = (): void => {
    fetch(`${agentServiceUrl}/health`)
      .then((res) => res.json())
      .then((json) => {
        if (json.status === 'UP') {
          fetch(`${agentServiceUrl}/configuration`, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          })
            .then((res) => res.json())
            .then((json) => {
              Object.assign(configuration, json);
            });
        }
      });
  };

  const onChangeModel = (value: unknown) => {
    Object.assign(configuration, value);
  };

  const onSave = () => {
    doSave();
    reloadPage();
    navigate(Links.AgentConfiguration);
  };

  return (
    <Card data-last-render={lastRender}>
      <CardTitle>Citrus Agent Configuration</CardTitle>

      <CardBody>
        <CanvasFormTabsContext.Provider value={formTabsValue}>
          <KaotoForm
            data-testid="configuration-form"
            schema={configurationSchema as KaotoSchemaDefinition['schema']}
            model={configuration}
            onChange={onChangeModel as KaotoFormProps['onChange']}
          />
        </CanvasFormTabsContext.Provider>
      </CardBody>

      <CardFooter>
        <Button data-testid="configuration-form-save-btn" variant="primary" onClick={onSave}>
          Save
        </Button>
      </CardFooter>
    </Card>
  );
};

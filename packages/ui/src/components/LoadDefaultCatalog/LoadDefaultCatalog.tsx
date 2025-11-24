import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  ExpandableSection,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { FunctionComponent, PropsWithChildren, useContext } from 'react';

import { useReloadContext } from '../../hooks/useReloadContext/useReloadContext';
import { SettingsContext } from '../../providers/settings.provider';

interface ILoadDefaultCatalogProps {
  errorMessage: string;
}

export const LoadDefaultCatalog: FunctionComponent<PropsWithChildren<ILoadDefaultCatalogProps>> = (props) => {
  const settingsAdapter = useContext(SettingsContext);
  const { reloadPage } = useReloadContext();

  const reloadCatalog = () => {
    const currentSettings = settingsAdapter.getSettings();
    settingsAdapter.saveSettings({ ...currentSettings, catalogUrl: '' });
    reloadPage();
  };

  return (
    <Bullseye>
      <EmptyState
        headingLevel="h4"
        icon={ExclamationCircleIcon}
        status="danger"
        titleText="The catalog couldn't be loaded"
        variant={EmptyStateVariant.lg}
        data-testid="load-default-catalog"
      >
        <EmptyStateBody>{props.children}</EmptyStateBody>

        <EmptyStateFooter>
          <EmptyStateActions>
            <Button variant="primary" onClick={reloadCatalog}>
              Reload with default Catalog
            </Button>
          </EmptyStateActions>
          <ExpandableSection
            toggleText="Error details"
            toggleId="error-details-expandable-section-toggle"
            contentId="expandable-section-content"
          >
            <code>
              <pre>{JSON.stringify(props.errorMessage, null, 2)}</pre>
            </code>
          </ExpandableSection>
        </EmptyStateFooter>
      </EmptyState>
    </Bullseye>
  );
};

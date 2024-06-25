import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateVariant,
  ExpandableSection,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { FunctionComponent, PropsWithChildren, useContext } from 'react';
import { useReloadContext } from '../../hooks/useReloadContext/useReloadContext';
import { SettingsContext } from '../../providers';

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
      <EmptyState variant={EmptyStateVariant.lg} data-testid="load-default-catalog">
        <EmptyStateHeader
          titleText="The Catalog couldn't be loaded"
          headingLevel="h4"
          icon={<EmptyStateIcon icon={ExclamationCircleIcon} />}
        />

        <EmptyStateBody>{props.children}</EmptyStateBody>

        <EmptyStateFooter>
          <EmptyStateActions>
            <Button variant="primary" onClick={reloadCatalog}>
              Reload with default Catalog
            </Button>
          </EmptyStateActions>
          <ExpandableSection
            toggleText="Error details"
            toggleId="expandable-section-toggle"
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

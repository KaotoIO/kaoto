import './DesignPage.scss';

import { FunctionComponent, ReactNode, useContext } from 'react';

import { Visualization } from '../../components/Visualization';
import { CatalogModalProvider } from '../../dynamic-catalog/catalog-modal.provider';
import { ActionConfirmationModalContextProvider } from '../../providers/action-confirmation-modal.provider';
import { EntitiesContext } from '../../providers/entities.provider';

export const DesignPage: FunctionComponent<{ fallback?: ReactNode; contextToolbar?: ReactNode }> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const visualEntities = entitiesContext?.visualEntities ?? [];

  return (
    <CatalogModalProvider>
      <ActionConfirmationModalContextProvider>
        <Visualization
          className="canvas-page"
          entities={visualEntities}
          fallback={props.fallback}
          contextToolbar={props.contextToolbar}
        />
      </ActionConfirmationModalContextProvider>
    </CatalogModalProvider>
  );
};

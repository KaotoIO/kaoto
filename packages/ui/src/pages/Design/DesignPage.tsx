import { FunctionComponent, ReactNode, useContext } from 'react';
import { Visualization } from '../../components/Visualization';
import { CatalogModalProvider } from '../../providers/catalog-modal.provider';
import { DeleteModalContextProvider } from '../../providers/delete-modal.provider';
import { EntitiesContext } from '../../providers/entities.provider';
import './DesignPage.scss';

export const DesignPage: FunctionComponent<{ fallback?: ReactNode }> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const visualEntities = entitiesContext?.visualEntities ?? [];

  return (
    <CatalogModalProvider>
      <DeleteModalContextProvider>
        <Visualization className="canvas-page" entities={visualEntities} fallback={props.fallback} />
      </DeleteModalContextProvider>
    </CatalogModalProvider>
  );
};

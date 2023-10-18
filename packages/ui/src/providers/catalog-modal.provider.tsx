import { Button, Modal } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';
import { CatalogTilesContext } from './catalog-tiles.provider';
import { Catalog, ITile } from '../components/Catalog';

interface CatalogModalContextValue {
  setIsModalOpen: (isOpen: boolean) => void;
}

interface CatalogModalProviderProps {
  onTileClick?: (tile: ITile) => void;
}

export const CatalogModalContext = createContext<CatalogModalContextValue | undefined>(undefined);

/**
 * This provider is used to interact with the catalog modal from anywhere in the application.
 * It is used in the Canvas component to open the catalog modal when the user clicks on the catalog button.
 *
 * In order to use this provider, you need to supply the Tiles using the CatalogTiles provider and
 * wrap your application with both providers:
 *
 * ```
 * <CatalogTilesProvider tiles={tiles}>  // In most cases, this will at the root of your application
 *   <CatalogModalProvider>              // This provider can be used anywhere in your application
 *     <App />
 *   </CatalogModalProvider>
 * </CatalogTilesProvider>
 * ```
 */
export const CatalogModalProvider: FunctionComponent<PropsWithChildren<CatalogModalProviderProps>> = (props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const tiles = useContext(CatalogTilesContext);

  const handleModalToggle = () => {
    setIsModalOpen(!isModalOpen);
  };

  const value: CatalogModalContextValue = useMemo(
    () => ({
      setIsModalOpen,
    }),
    [],
  );

  return (
    <CatalogModalContext.Provider value={value}>
      {props.children}

      {isModalOpen && (
        <Modal
          title="Catalog"
          isOpen={isModalOpen}
          onClose={handleModalToggle}
          actions={[
            <Button key="confirm" variant="primary" onClick={handleModalToggle}>
              Confirm
            </Button>,
            <Button key="cancel" variant="link" onClick={handleModalToggle}>
              Cancel
            </Button>,
          ]}
          ouiaId="BasicModal"
        >
          <Catalog tiles={tiles} onTileClick={props.onTileClick} />
        </Modal>
      )}
    </CatalogModalContext.Provider>
  );
};

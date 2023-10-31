import { Modal } from '@patternfly/react-core';
import {
  FunctionComponent,
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Catalog, ITile } from '../components/Catalog';
import { CatalogFilter, CatalogKind, DefinedComponent } from '../models';
import { isDefined } from '../utils';
import { CatalogTilesContext } from './catalog-tiles.provider';
import { CatalogContext } from './catalog.provider';

interface CatalogModalContextValue {
  setIsModalOpen: (isOpen: boolean) => void;
  getNewComponent: (catalogFilter: CatalogFilter) => Promise<DefinedComponent | undefined>;
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
export const CatalogModalProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const camelCatalogService = useContext(CatalogContext);
  const tiles = useContext(CatalogTilesContext);
  const [filteredTiles, setFilteredTiles] = useState(tiles);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const componentSelectionRef = useRef<{
    resolve: (component: DefinedComponent | undefined) => void;
    reject: (error: unknown) => unknown;
  }>();

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    componentSelectionRef.current?.resolve(undefined);
  }, []);

  const handleSelectComponent = useCallback(
    (tile: ITile) => {
      setIsModalOpen(false);
      const resolvedComponent: DefinedComponent = {
        name: tile.name,
        type: tile.type as CatalogKind,
        definition: camelCatalogService.getComponent(tile.type as CatalogKind, tile.name),
      };

      componentSelectionRef.current?.resolve(resolvedComponent);
    },
    [camelCatalogService],
  );

  const getNewComponent = useCallback(
    (catalogFilter: CatalogFilter) => {
      if (isDefined(catalogFilter.filterFunction) || isDefined(catalogFilter.kinds) || isDefined(catalogFilter.names)) {
        const localFilteredTiles = tiles.filter((tile) => {
          if (isDefined(catalogFilter.filterFunction)) {
            return catalogFilter.filterFunction(tile);
          }

          if (isDefined(catalogFilter.kinds) && !catalogFilter.kinds.includes(tile.type as CatalogKind)) {
            return false;
          }

          if (isDefined(catalogFilter.names) && !catalogFilter.names.includes(tile.name)) {
            return false;
          }

          return true;
        });

        setFilteredTiles(localFilteredTiles);
      } else {
        setFilteredTiles(tiles);
      }

      const componentSelectorPromise = new Promise<DefinedComponent | undefined>((resolve, reject) => {
        /** Set both resolve and reject functions to be used once the component is selected */
        componentSelectionRef.current = { resolve, reject };
      });

      setIsModalOpen(true);

      return componentSelectorPromise;
    },
    [tiles],
  );

  const value: CatalogModalContextValue = useMemo(
    () => ({
      setIsModalOpen,
      getNewComponent,
    }),
    [getNewComponent],
  );

  return (
    <CatalogModalContext.Provider value={value}>
      {props.children}

      {isModalOpen && (
        <Modal title="Catalog" isOpen onClose={handleCloseModal} ouiaId="CatalogModal">
          <Catalog tiles={filteredTiles} onTileClick={handleSelectComponent} />
        </Modal>
      )}
    </CatalogModalContext.Provider>
  );
};

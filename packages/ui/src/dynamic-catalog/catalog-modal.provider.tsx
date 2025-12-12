import './catalog-modal.provider.scss';

import { isDefined } from '@kaoto/forms';
import { Modal, ModalBody, ModalHeader, ModalVariant } from '@patternfly/react-core';
import {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Catalog, ITile, TileFilter } from '../components/Catalog';
import { CatalogKind, DefinedComponent } from '../models';
import { CatalogContext } from './catalog.provider';
import { useCatalogTiles } from './use-catalog-tiles.hook';

interface CatalogModalContextValue {
  getNewComponent: (catalogFilter?: TileFilter) => Promise<DefinedComponent | undefined>;
  checkCompatibility: (name: string, catalogFilter?: TileFilter) => boolean;
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
 * <CatalogTilesProvider>                // In most cases, this will at the root of your application
 *   <CatalogModalProvider>              // This provider can be used anywhere in your application
 *     <App />
 *   </CatalogModalProvider>
 * </CatalogTilesProvider>
 * ```
 */
export const CatalogModalProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const catalogRegistry = useContext(CatalogContext);
  const { fetchTiles, getTiles } = useCatalogTiles();
  const [filteredTiles, setFilteredTiles] = useState<ITile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const componentSelectionRef = useRef<{
    resolve: (component: DefinedComponent | undefined) => void;
    reject: (error: unknown) => unknown;
  }>(undefined);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    componentSelectionRef.current?.resolve(undefined);
  }, []);

  const handleSelectComponent = useCallback(
    async (tile: ITile) => {
      setIsModalOpen(false);

      const definition = await catalogRegistry.getEntity(tile.type as CatalogKind, tile.name, {
        forceFresh: tile.type === CatalogKind.Kamelet,
      });
      const resolvedComponent: DefinedComponent = {
        name: tile.name,
        type: tile.type as CatalogKind,
        definition,
      };

      componentSelectionRef.current?.resolve(resolvedComponent);
    },
    [catalogRegistry],
  );

  const getNewComponent = useCallback(
    async (catalogFilter?: TileFilter): Promise<DefinedComponent | undefined> => {
      let tiles: ITile[];
      try {
        tiles = await fetchTiles();
      } catch (error) {
        console.error('Error loading catalog tiles', error);
        tiles = [];
      }

      if (isDefined(catalogFilter)) {
        const localFilteredTiles = tiles.filter(catalogFilter);
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
    [fetchTiles],
  );

  const checkCompatibility = useCallback(
    (name: string, catalogFilter?: TileFilter): boolean => {
      const tiles = getTiles();
      const tile = tiles.find((t) => t.name === name);

      if (!isDefined(catalogFilter) || !isDefined(tile)) return false;

      return catalogFilter(tile);
    },
    [getTiles],
  );

  const value: CatalogModalContextValue = useMemo(
    () => ({
      getNewComponent,
      checkCompatibility,
    }),
    [checkCompatibility, getNewComponent],
  );

  return (
    <CatalogModalContext.Provider value={value}>
      {props.children}

      {isModalOpen && (
        <Modal variant={ModalVariant.large} position="top" isOpen onClose={handleCloseModal} ouiaId="CatalogModal">
          <ModalHeader title="Catalog" />
          <ModalBody>
            <Catalog tiles={filteredTiles} onTileClick={handleSelectComponent} />
          </ModalBody>
        </Modal>
      )}
    </CatalogModalContext.Provider>
  );
};

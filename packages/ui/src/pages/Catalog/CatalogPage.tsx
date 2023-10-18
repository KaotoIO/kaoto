import { Title } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useState } from 'react';
import { Catalog, ITile } from '../../components/Catalog';
import { PropertiesModal } from '../../components/PropertiesModal';
import { CatalogTilesContext } from '../../providers/catalog-tiles.provider';

export const CatalogPage: FunctionComponent = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTile, setModalTile] = useState<ITile>();
  const tiles = useContext(CatalogTilesContext);

  const onTileClick = useCallback((tile: ITile) => {
    setModalTile(tile);
    setIsModalOpen(true);
  }, []);

  return (
    <>
      <Title headingLevel="h1">Catalog browser</Title>
      <Catalog tiles={tiles} onTileClick={onTileClick} />
      {modalTile && (
        <PropertiesModal
          tile={modalTile}
          isModalOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        ></PropertiesModal>
      )}
    </>
  );
};

import { FunctionComponent, useCallback, useEffect, useState } from 'react';

import { Catalog, ITile } from '../../components/Catalog';
import { LoadDefaultCatalog } from '../../components/LoadDefaultCatalog';
import { Loading } from '../../components/Loading';
import { PropertiesModal } from '../../components/PropertiesModal';
import { useCatalogTiles } from '../../dynamic-catalog/ui';

export const CatalogPage: FunctionComponent = () => {
  const { fetchTiles } = useCatalogTiles();
  const [status, setStatus] = useState<'success' | 'loading' | 'error'>('loading');
  const [tiles, setTiles] = useState<ITile[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTile, setModalTile] = useState<ITile>();

  useEffect(() => {
    fetchTiles()
      .then((tiles) => {
        setTiles(tiles);
        setStatus('success');
      })
      .catch((error) => {
        setTiles([]);
        setErrorMessage(error?.message);
        setStatus('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTileClick = useCallback((tile: ITile) => {
    setModalTile(tile);
    setIsModalOpen(true);
  }, []);

  const handleOnClose = useCallback(() => {
    setIsModalOpen(false);
    setModalTile(undefined);
  }, []);

  if (status === 'loading') {
    return (
      <Loading small description="Fetching catalogs">
        Fetching catalogs
      </Loading>
    );
  } else if (status === 'error') {
    return <LoadDefaultCatalog errorMessage={errorMessage} />;
  }

  return (
    <>
      <Catalog tiles={tiles} onTileClick={onTileClick} />
      {modalTile && <PropertiesModal tile={modalTile} isModalOpen={isModalOpen} onClose={handleOnClose} />}
    </>
  );
};

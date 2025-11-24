import { Bullseye, Content, Spinner } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useEffect, useState } from 'react';

import { Catalog, ITile } from '../../components/Catalog';
import { LoadDefaultCatalog } from '../../components/LoadDefaultCatalog';
import { PropertiesModal } from '../../components/PropertiesModal';
import { useCatalogTiles } from '../../dynamic-catalog';

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
      <Bullseye>
        <Content>
          <h2>
            Fetching catalogs <Spinner isInline aria-label="Fetching catalogs" />
          </h2>
        </Content>
      </Bullseye>
    );
  } else if (status === 'error') {
    return <LoadDefaultCatalog errorMessage={errorMessage} />;
  }

  return (
    <>
      <Catalog tiles={tiles} onTileClick={onTileClick} />
      {modalTile && (
        <PropertiesModal tile={modalTile} isModalOpen={isModalOpen} onClose={handleOnClose}></PropertiesModal>
      )}
    </>
  );
};

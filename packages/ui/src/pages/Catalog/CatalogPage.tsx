import { Title } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useEffect, useState } from 'react';
import { camelComponentToTile, camelProcessorToTile, kameletToTile } from '../../camel-utils';
import { Catalog, ITile } from '../../components/Catalog';
import { PropertiesModal } from '../../components/PropertiesModal';
import { CatalogKind } from '../../models';
import { useCatalogStore } from '../../store';

export const CatalogPage: FunctionComponent = () => {
  const { catalogs } = useCatalogStore((state) => state);
  const [tiles, setTiles] = useState<Record<string, ITile[]>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTile, setModalTile] = useState<ITile>();

  useEffect(() => {
    setTiles({
      Component: Object.values(catalogs[CatalogKind.Component] ?? {}).map(camelComponentToTile),
      Processor: Object.values(catalogs[CatalogKind.Processor] ?? {}).map(camelProcessorToTile),
      Kamelet: Object.values(catalogs[CatalogKind.Kamelet] ?? {}).map(kameletToTile),
    });
  }, [catalogs]);

  const onTileClick = useCallback((tile: ITile) => {
    setIsModalOpen(!isModalOpen);
    setModalTile(tile);
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

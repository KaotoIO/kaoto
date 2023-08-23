import { Title } from '@patternfly/react-core';
import { FunctionComponent, useEffect, useState } from 'react';
import { camelComponentToTile, camelProcessorToTile, kameletToTile } from '../../camel-utils';
import { ITile } from '../../components/Catalog';
import { Visualization } from '../../components/Visualization';
import { CatalogKind } from '../../models';
import { useCatalogStore } from '../../store';
import './DesignPage.scss';

export const DesignPage: FunctionComponent = () => {
  /** TODO: Extract this logic into a separate provider */
  const catalogs = useCatalogStore((state) => state.catalogs);
  const [tiles, setTiles] = useState<Record<string, ITile[]>>({});

  useEffect(() => {
    setTiles({
      Component: Object.values(catalogs[CatalogKind.Component] ?? {}).map(camelComponentToTile),
      Processor: Object.values(catalogs[CatalogKind.Processor] ?? {}).map(camelProcessorToTile),
      Kamelet: Object.values(catalogs[CatalogKind.Kamelet] ?? {}).map(kameletToTile),
    });
  }, [catalogs]);

  return (
    <div className="canvasPage">
      <Title headingLevel="h1">Visualization</Title>

      <Visualization className="canvasPage__canvas" tiles={tiles} />
    </div>
  );
};

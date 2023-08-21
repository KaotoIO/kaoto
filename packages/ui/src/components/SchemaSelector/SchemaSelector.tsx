import { FunctionComponent, PropsWithChildren, useCallback, useEffect, useState } from 'react';
import { Schema } from '../../models';
import { Catalog, ITile } from '../Catalog';

const SCHEMA_INDEX_KEY = 'Schema';

interface IconResolverProps {
  schemas: Schema[];
  onClick?: (schema: Schema) => void;
}

export const SchemaSelector: FunctionComponent<PropsWithChildren<IconResolverProps>> = (props) => {
  const [tiles, setTiles] = useState<Record<string, ITile[]>>({});

  useEffect(() => {
    const tiles: ITile[] = props.schemas.map((schema) => {
      return {
        name: schema.name,
        title: schema.name,
        description: '',
        tags: [schema.version],
        type: SCHEMA_INDEX_KEY,
        rawObject: schema.schema,
      };
    });

    setTiles({ [SCHEMA_INDEX_KEY]: tiles });
  }, [props.schemas]);

  const onTileClick = useCallback(
    (tile: ITile) => {
      props.onClick?.(tile.rawObject as Schema);
    },
    [props],
  );

  return <Catalog tiles={tiles} onTileClick={onTileClick} />;
};

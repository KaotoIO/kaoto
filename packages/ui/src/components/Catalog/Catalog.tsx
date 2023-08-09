import { Badge, Gallery, SearchInput, Tab, TabTitleText, Tabs } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, useCallback, useEffect, useState } from 'react';
import { Tile } from './Tile';
import { ITile } from './Tile.models';

interface CatalogProps {
  tiles: Record<string, ITile[]>;
  onTileClick?: (tile: ITile) => void;
}

export const Catalog: FunctionComponent<PropsWithChildren<CatalogProps>> = (props) => {
  const [activeTabKey, setActiveTabKey] = useState<string | number>(getFirstTabKey(props.tiles));
  const [searchTerm, setSearchTerm] = useState('');

  const onChange = (value: string) => {
    setSearchTerm(value);
  };

  useEffect(() => {
    setActiveTabKey(getFirstTabKey(props.tiles));
  }, [props.tiles]);

  const handleTabClick = useCallback(
    (_event: React.MouseEvent<unknown> | React.KeyboardEvent | MouseEvent, tabIndex: string | number) => {
      setActiveTabKey(tabIndex);
    },
    [],
  );

  const onTileClick = useCallback(
    (tile: ITile) => {
      props.onTileClick?.(tile);
    },
    [props],
  );

  return (
    <>
      <SearchInput
        placeholder="Find by name"
        value={searchTerm}
        onChange={(_event, value) => {
          onChange(value);
        }}
        onClear={() => {
          onChange('');
        }}
      />

      <Tabs activeKey={activeTabKey} onSelect={handleTabClick} aria-label="Available catalogs" role="region">
        {Object.entries(props.tiles).map(([key, value]) => (
          <Tab
            key={key}
            eventKey={key}
            title={
              <>
                <TabTitleText>{key}</TabTitleText>
                <Badge isRead>{value.length}</Badge>
              </>
            }
            aria-label={`${key} catalog`}
          >
            <Gallery hasGutter>
              {value
                .filter((tile) => tile.name.includes(searchTerm))
                .map((tile) => (
                  <Tile key={tile.name} tile={tile} onClick={onTileClick} />
                ))}
            </Gallery>
          </Tab>
        ))}
      </Tabs>
    </>
  );
};

function getFirstTabKey(tiles: CatalogProps['tiles']): string | number {
  return Object.keys(tiles)[0];
}

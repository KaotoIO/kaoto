import './BaseCatalog.scss';
// The PatternFly `Gallery` component pulls this stylesheet in, but the virtualized grid only reuses its CSS classes
import '@patternfly/react-styles/css/layouts/Gallery/gallery.css';

import { DataList } from '@patternfly/react-core';
import { forwardRef, FunctionComponent, Ref, useCallback, useEffect, useRef } from 'react';
import {
  Components,
  GridComponents,
  GridListProps,
  ItemProps,
  ListProps,
  Virtuoso,
  VirtuosoGrid,
} from 'react-virtuoso';

import { CatalogLayout, getTileKey, ITile } from './Catalog.models';
import { CatalogDataListItem } from './DataListItem';
import { Tile } from './Tile';

interface BaseCatalogProps {
  tiles: ITile[];
  catalogLayout: CatalogLayout;
  onTileClick?: (tile: ITile) => void;
  onTagClick: (_event: unknown, value: string) => void;
}

const computeItemKey = (_index: number, tile: ITile) => getTileKey(tile);

/** Reuses the PatternFly gallery CSS, so the columns and the gutter are the same as a regular `Gallery` */
const GalleryList = forwardRef<HTMLDivElement, GridListProps>(({ className, ...props }, ref) => (
  <div {...props} ref={ref} className={`${className ?? ''} pf-v6-l-gallery pf-m-gutter catalog-list__content`.trim()} />
));
GalleryList.displayName = 'GalleryList';

const galleryComponents: GridComponents = { List: GalleryList };

const CatalogDataList = forwardRef<HTMLDivElement, ListProps>(({ children, style }, ref) => (
  <DataList
    aria-label="Catalog list"
    isCompact
    className="catalog-list__content"
    style={style}
    ref={ref as unknown as Ref<HTMLUListElement>}
  >
    {children}
  </DataList>
));
CatalogDataList.displayName = 'CatalogDataList';

/**
 * Virtuoso wraps every item in an element. `CatalogDataListItem` already renders the `<li>`,
 * so the wrapper must not be one.
 */
const CatalogDataListRow = ({ item: _item, ...props }: ItemProps<ITile>) => {
  return <div {...props} />;
};

const listComponents: Components<ITile> = { List: CatalogDataList, Item: CatalogDataListRow };

export const BaseCatalog: FunctionComponent<BaseCatalogProps> = (props) => {
  const { tiles, catalogLayout, onTileClick: onTileClickProp, onTagClick } = props;
  const scrollerRef = useRef<HTMLElement | Window | null>(null);

  const onTileClick = useCallback(
    (tile: ITile) => {
      onTileClickProp?.(tile);
    },
    [onTileClickProp],
  );

  const onScrollerRef = useCallback((ref: HTMLElement | Window | null) => {
    scrollerRef.current = ref;
  }, []);

  useEffect(() => {
    // jsdom does not implement Element.prototype.scrollTo
    scrollerRef.current?.scrollTo?.({ top: 0 });
  }, [tiles]);

  const renderListItem = useCallback(
    (_index: number, tile: ITile) => <CatalogDataListItem tile={tile} onClick={onTileClick} onTagClick={onTagClick} />,
    [onTileClick, onTagClick],
  );

  const renderGalleryItem = useCallback(
    (_index: number, tile: ITile) => <Tile tile={tile} onClick={onTileClick} onTagClick={onTagClick} />,
    [onTileClick, onTagClick],
  );

  if (catalogLayout === CatalogLayout.List) {
    return (
      <Virtuoso
        scrollerRef={onScrollerRef}
        id="catalog-list"
        className="catalog-list"
        data={tiles}
        computeItemKey={computeItemKey}
        components={listComponents}
        itemContent={renderListItem}
      />
    );
  }

  return (
    <VirtuosoGrid
      scrollerRef={onScrollerRef}
      id="catalog-list"
      className="catalog-list"
      data={tiles}
      computeItemKey={computeItemKey}
      components={galleryComponents}
      itemClassName="catalog-grid-item"
      itemContent={renderGalleryItem}
    />
  );
};

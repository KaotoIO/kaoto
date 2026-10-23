import { LabelGroup } from '@patternfly/react-core';
import { FunctionComponent } from 'react';

import { CatalogClickableLabel } from './CatalogClickableLabel';
import { getTagColor } from './tag-color-resolver';

interface ICatalogTagsPanelProps {
  tags: string[];
  onTagClick: (_event: unknown, value: string) => void;
}

export const CatalogTagsPanel: FunctionComponent<ICatalogTagsPanelProps> = (props) => {
  return (
    <LabelGroup isCompact aria-label="data-list-item-tags">
      {props.tags.map((tag) => (
        <CatalogClickableLabel
          key={tag}
          color={getTagColor(tag)}
          data-testid={'tag-' + tag}
          onMouseDown={(ev) => {
            ev.preventDefault();
          }}
          onClick={(ev) => {
            ev.stopPropagation(); // ignore root click, e.g. click on tile
            props.onTagClick(ev, tag);
          }}
        >
          {tag}
        </CatalogClickableLabel>
      ))}
    </LabelGroup>
  );
};

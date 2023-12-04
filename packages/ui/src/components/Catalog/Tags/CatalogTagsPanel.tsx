import { Label, LabelGroup } from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import { getTagColor } from './tag-color-resolver';

interface ICatalogTagsPanelProps {
  tags: string[];
  onTagClick: (_event: unknown, value: string) => void;
}

export const CatalogTagsPanel: FunctionComponent<ICatalogTagsPanelProps> = (props) => {
  return (
    <LabelGroup isCompact aria-label="data-list-item-tags">
      {props.tags.map((tag) => (
        <Label
          isCompact
          key={tag}
          color={getTagColor(tag)}
          render={({ className, content }) => (
            // to force PF to render label as button with animation
            <a
              className={className}
              data-testid={'tag-' + tag}
              onClick={(ev) => {
                ev.stopPropagation(); // ignore root click, e.g. click on tile
                props.onTagClick(ev, tag);
              }}
            >
              {content}
            </a>
          )}
        >
          {tag}
        </Label>
      ))}
    </LabelGroup>
  );
};

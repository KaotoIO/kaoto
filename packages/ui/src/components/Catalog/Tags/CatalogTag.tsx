import { Label } from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import { getTagColor } from './tag-color-resolver';

interface ICatalogTagProps {
  tag: string;
  className?: string;
  variant?: 'outline' | 'filled';
  textMaxWidth?: string;
}

export const CatalogTag: FunctionComponent<ICatalogTagProps> = (props) => {
  return (
    <Label
      textMaxWidth={props.textMaxWidth ?? undefined}
      isCompact
      className={props.className ?? ''}
      variant={props.variant ?? 'filled'}
      color={getTagColor(props.tag)}
    >
      {props.tag}
    </Label>
  );
};

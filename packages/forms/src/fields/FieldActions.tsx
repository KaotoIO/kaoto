import { OverflowMenu, OverflowMenuItem } from '@carbon/react';
import { FunctionComponent } from 'react';

export interface FieldActionsProps {
  propName: string;
  clearAriaLabel: string;
  toggleRawAriaLabel?: string;
  toggleRawValueWrap?: () => void;
  onRemove: () => void;
  removeLabel?: string;
}

export const FieldActions: FunctionComponent<FieldActionsProps> = ({
  propName,
  clearAriaLabel,
  toggleRawAriaLabel,
  toggleRawValueWrap,
  onRemove,
  removeLabel = 'Clear',
}) => {
  return (
    <OverflowMenu
      aria-label={`${propName}__field-actions`}
      data-testid={`${propName}__field-actions`}
      size="sm"
      flipped
    >
      <OverflowMenuItem
        itemText={removeLabel}
        onClick={onRemove}
        data-testid={`${propName}__clear`}
        title={clearAriaLabel}
      />

      {toggleRawValueWrap && (
        <OverflowMenuItem
          itemText="Raw"
          onClick={toggleRawValueWrap}
          data-testid={`${propName}__toRaw`}
          title={toggleRawAriaLabel}
        />
      )}
    </OverflowMenu>
  );
};

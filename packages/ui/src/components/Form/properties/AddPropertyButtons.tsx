import { Button, Split, SplitItem } from '@patternfly/react-core';
import { FolderPlusIcon, PlusCircleIcon } from '@patternfly/react-icons';

type AddPropertyPopoverProps = {
  path: string[];
  createPlaceholder: (isObject: boolean) => void;
  showLabel?: boolean;
  disabled?: boolean;
};

/**
 * A set of "add string property" and "add object property" buttons which triggers creating a placeholder.
 * @param props
 * @constructor
 */
export function AddPropertyButtons({
  path,
  createPlaceholder,
  showLabel = false,
  disabled = false,
}: AddPropertyPopoverProps) {
  return (
    <Split>
      <SplitItem>
        <Button
          title="Add string property"
          data-testid={`properties-add-string-property-${path.join('-')}-btn`}
          variant={'link'}
          icon={<PlusCircleIcon />}
          isDisabled={disabled}
          onClick={() => createPlaceholder(false)}
        >
          {showLabel && 'Add string property'}
        </Button>
      </SplitItem>

      <SplitItem>
        <Button
          title="Add object property"
          data-testid={`properties-add-object-property-${path.join('-')}-btn`}
          variant={'link'}
          icon={<FolderPlusIcon />}
          isDisabled={disabled}
          onClick={() => createPlaceholder(true)}
        >
          {showLabel && 'Add object property'}
        </Button>
      </SplitItem>
    </Split>
  );
}

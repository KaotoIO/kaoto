import { Button, Split, SplitItem, Tooltip } from '@patternfly/react-core';
import { FolderPlusIcon, PlusCircleIcon } from '@patternfly/react-icons';

type AddPropertyPopoverProps = {
  showLabel?: boolean;
  path: string[];
  disabled?: boolean;
  createPlaceholder: (isObject: boolean) => void;
};

/**
 * A set of "add string property" and "add object property" buttons which triggers creating a placeholder.
 * @param props
 * @constructor
 */
export function AddPropertyButtons({
  showLabel = false,
  path,
  disabled = false,
  createPlaceholder,
}: AddPropertyPopoverProps) {
  return (
    <Split>
      <SplitItem>
        <Tooltip content="Add string property">
          <Button
            data-testid={`properties-add-string-property-${path.join('-')}-btn`}
            variant={'link'}
            icon={<PlusCircleIcon />}
            isDisabled={disabled}
            onClick={() => createPlaceholder(false)}
          >
            {showLabel && 'Add string property'}
          </Button>
        </Tooltip>
      </SplitItem>
      <SplitItem>
        <Tooltip content="Add object property">
          <Button
            data-testid={`properties-add-object-property-${path.join('-')}-btn`}
            variant={'link'}
            icon={<FolderPlusIcon />}
            isDisabled={disabled}
            onClick={() => createPlaceholder(true)}
          >
            {showLabel && 'Add object property'}
          </Button>
        </Tooltip>
      </SplitItem>
    </Split>
  );
}

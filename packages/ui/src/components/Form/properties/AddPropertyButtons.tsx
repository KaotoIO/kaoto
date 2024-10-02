import { Button, Split, SplitItem, Tooltip } from '@patternfly/react-core';
import { FolderPlusIcon, PlusCircleIcon } from '@patternfly/react-icons';

type AddPropertyPopoverProps = {
  path: string[];
  createPlaceholder: (isObject: boolean) => void;
  canAddObjectProperties?: boolean;
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
  canAddObjectProperties = true,
  showLabel = false,
  disabled = false,
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

      {canAddObjectProperties && (
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
      )}
    </Split>
  );
}

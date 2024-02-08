import { FunctionComponent, useCallback, useContext } from 'react';
import { Button, ToolbarItem, Tooltip } from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import { DataMapperContext } from '../../providers';
import { Mapping } from '../../models';

export const AddMappingToolbarItem: FunctionComponent = () => {
  const { mappings, setSelectedMappingIndex, setMappings } = useContext(DataMapperContext)!;
  const onClick = useCallback(() => {
    const newMapping = new Mapping();
    mappings.push(newMapping);
    setMappings(mappings);
    setSelectedMappingIndex(mappings.indexOf(newMapping));
  }, [mappings, setMappings, setSelectedMappingIndex]);

  return (
    <ToolbarItem>
      <Tooltip position={'auto'} enableFlip={true} content={<div>Add a new mapping</div>}>
        <Button variant={'plain'} aria-label="Add a new mapping" onClick={onClick} data-testid="add-new-mapping-button">
          <PlusIcon />
        </Button>
      </Tooltip>
    </ToolbarItem>
  );
};

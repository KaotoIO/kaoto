import { FunctionComponent, useCallback, useContext } from 'react';
import { Document } from '../index';
import { DataMapperContext } from '../../providers';
import { Button, Tooltip } from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import { ConstantsTree } from './ConstantsTree';

export const ConstantsDocument: FunctionComponent = () => {
  const { constants } = useContext(DataMapperContext)!;
  const onCreateConstant = useCallback(() => {
    alert('not yet implemented');
  }, []);

  return (
    <Document
      title={'Constants'}
      startExpanded={constants?.fields.length > 0}
      actions={[
        <Tooltip
          position={'top'}
          enableFlip={true}
          content={<div>Create a constant for use in mapping</div>}
          key={'create-constant'}
          entryDelay={750}
          exitDelay={100}
        >
          <Button
            onClick={onCreateConstant}
            variant={'plain'}
            aria-label="Create a constant for use in mapping"
            data-testid="create-constant-button"
          >
            <PlusIcon />
          </Button>
        </Tooltip>,
      ]}
      noPadding={!!constants}
    >
      {constants?.fields.length > 0 ? (
        <ConstantsTree
          onEditConstant={onEditConstant}
          onDeleteConstant={onDeleteConstant}
          canDrop={canDrop}
          onDrop={onDrop}
          onShowMappingDetails={onShowMappingDetails}
          canAddFieldToSelectedMapping={canAddFieldToSelectedMapping}
          onAddToSelectedMapping={onAddToSelectedMapping}
          canRemoveFromSelectedMapping={canRemoveFromSelectedMapping}
          onRemoveFromSelectedMapping={onRemoveFromSelectedMapping}
          canStartMapping={canStartMapping}
          onStartMapping={onStartMapping}
          fields={constants.fields}
          renderPreview={renderPreview}
        />
      ) : (
        <p>No constants</p>
      )}
    </Document>
  );
};

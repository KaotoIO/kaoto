import { Document } from '.';
import { FunctionComponent, useCallback, useContext } from 'react';
import { DataMapperContext } from '../../providers';
import { Button, Tooltip } from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import { PropertiesTree } from './PropertiesTree';
export const TargetPropertiesDocument: FunctionComponent = () => {
  const { targetProperties } = useContext(DataMapperContext)!;
  const onCreateProperty = useCallback(() => {
    alert('not yet implemented');
  }, []);

  return (
    <Document
      title={'Properties'}
      startExpanded={targetProperties?.fields.length > 0}
      actions={[
        <Tooltip
          position={'top'}
          enableFlip={true}
          content={<div>Create a target property for use in mapping</div>}
          key={'create-target-property'}
          entryDelay={750}
          exitDelay={100}
        >
          <Button
            onClick={onCreateProperty}
            variant={'plain'}
            aria-label="Create a target property for use in mapping"
            data-testid="create-target-property-button"
          >
            <PlusIcon />
          </Button>
        </Tooltip>,
      ]}
      noPadding={!!targetProperties}
    >
      {targetProperties?.fields.length > 0 ? (
        <PropertiesTree
          acceptDropType={acceptDropType}
          draggableType={draggableType}
          isSource={isSource}
          onEditProperty={onEditProperty}
          onDeleteProperty={onDeleteProperty}
          canDrop={canDrop}
          onDrop={onDrop}
          onShowMappingDetails={onShowMappingDetails}
          canAddFieldToSelectedMapping={canAddFieldToSelectedMapping}
          onAddToSelectedMapping={onAddToSelectedMapping}
          canRemoveFromSelectedMapping={canRemoveFromSelectedMapping}
          onRemoveFromSelectedMapping={onRemoveFromSelectedMapping}
          canStartMapping={canStartMapping}
          onStartMapping={onStartMapping}
          fields={targetProperties.fields}
          showTypes={showTypes}
          renderPreview={renderPreviewResult}
        />
      ) : (
        'No target properties'
      )}
    </Document>
  );
};

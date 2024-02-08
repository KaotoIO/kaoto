import { FunctionComponent, useCallback, useContext } from 'react';
import { Document } from '../index';
import { Button, Tooltip } from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import { PropertiesTree } from './PropertiesTree';
import { DataMapperContext } from '../../providers';

export const SourcePropertiesDocument: FunctionComponent = () => {
  const { sourceProperties } = useContext(DataMapperContext)!;
  const onCreateProperty = useCallback(() => {
    alert('not yet implemented');
  }, []);

  return (
    <Document
      title={'Properties'}
      startExpanded={sourceProperties?.fields.length > 0}
      actions={[
        <Tooltip
          position={'top'}
          enableFlip={true}
          content={<div>Create a source property for use in mapping</div>}
          key={'create-property'}
          entryDelay={750}
          exitDelay={100}
        >
          <Button
            onClick={onCreateProperty}
            variant={'plain'}
            aria-label="Create a source property for use in mapping"
            data-testid="create-source-property-button"
          >
            <PlusIcon />
          </Button>
        </Tooltip>,
      ]}
      noPadding={!!sourceProperties}
    >
      {sourceProperties?.fields.length > 0 ? (
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
          fields={sourceProperties.fields}
          showTypes={showTypes}
          renderPreview={renderPreview}
        />
      ) : (
        'No source properties'
      )}
    </Document>
  );
};

import {
  Button,
  DataList,
  DataListAction,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
} from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import { FunctionComponent, memo } from 'react';

import { getFileName } from './AttachSchema/utils';

export interface SchemaFileListProps {
  existingFiles: string[];
  pendingUploads: string[];
  onRemove: (filePath: string) => void;
}

export const SchemaFileList: FunctionComponent<SchemaFileListProps> = memo(
  ({ existingFiles, pendingUploads, onRemove }) => {
    if (existingFiles.length === 0 && pendingUploads.length === 0) {
      return null;
    }

    return (
      <DataList aria-label="Document schema files" data-testid="uploaded-schema-list" isCompact>
        {existingFiles.map((filePath) => {
          const displayName = getFileName(filePath);
          return (
            <DataListItem key={filePath} aria-labelledby={`schema-file-${displayName}`}>
              <DataListItemRow>
                <DataListItemCells
                  dataListCells={[
                    <DataListCell key="name">
                      <span id={`schema-file-${displayName}`} data-testid={`existing-schema-item-${displayName}`}>
                        {displayName}
                      </span>
                    </DataListCell>,
                  ]}
                />
              </DataListItemRow>
            </DataListItem>
          );
        })}
        {pendingUploads.map((filePath) => {
          const displayName = getFileName(filePath);
          return (
            <DataListItem key={filePath} aria-labelledby={`schema-file-${displayName}`}>
              <DataListItemRow>
                <DataListItemCells
                  dataListCells={[
                    <DataListCell key="name">
                      <span id={`schema-file-${displayName}`} data-testid={`uploaded-schema-item-${displayName}`}>
                        {displayName}
                      </span>
                    </DataListCell>,
                  ]}
                />
                <DataListAction
                  aria-labelledby={`schema-file-${displayName}`}
                  aria-label={`Remove ${displayName}`}
                  id={`action-${displayName}`}
                >
                  <Button
                    variant="plain"
                    aria-label={`Remove ${displayName}`}
                    data-testid={`remove-schema-item-${displayName}`}
                    onClick={() => onRemove(filePath)}
                    icon={<TrashIcon />}
                  />
                </DataListAction>
              </DataListItemRow>
            </DataListItem>
          );
        })}
      </DataList>
    );
  },
);

SchemaFileList.displayName = 'SchemaFileList';

// Made with Bob

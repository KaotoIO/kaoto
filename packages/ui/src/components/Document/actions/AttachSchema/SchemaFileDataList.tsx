import './AttachSchema.scss';

import {
  Badge,
  Button,
  DataList,
  DataListAction,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon, ExclamationTriangleIcon, TrashIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useMemo, useState } from 'react';

import { getFileName } from './utils';

export interface SchemaFileItem {
  filePath?: string;
  status: 'success' | 'warning' | 'error';
  messages: string[];
}

type SchemaFileDataListProps = {
  items: SchemaFileItem[];
  onRemoveFile: (filePath: string) => void;
};

const STATUS_ICONS = {
  success: <CheckCircleIcon color="var(--pf-t--global--icon--color--status--success--default)" />,
  warning: <ExclamationTriangleIcon color="var(--pf-t--global--icon--color--status--warning--default)" />,
  error: <ExclamationCircleIcon color="var(--pf-t--global--icon--color--status--danger--default)" />,
};

const FILTER_OPTIONS: { status: SchemaFileItem['status']; label: string }[] = [
  { status: 'error', label: 'Error' },
  { status: 'warning', label: 'Warning' },
  { status: 'success', label: 'Success' },
];

export const SchemaFileDataList: FunctionComponent<SchemaFileDataListProps> = ({ items, onRemoveFile }) => {
  const [activeFilters, setActiveFilters] = useState<Set<SchemaFileItem['status']>>(
    new Set(['error', 'warning', 'success']),
  );

  const toggleFilter = useCallback((status: SchemaFileItem['status']) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

  const counts = useMemo(() => {
    const result = { error: 0, warning: 0, success: 0 };
    for (const item of items) {
      result[item.status]++;
    }
    return result;
  }, [items]);

  const filteredItems = useMemo(() => items.filter((item) => activeFilters.has(item.status)), [items, activeFilters]);
  const effectiveFilterOptions = useMemo(() => FILTER_OPTIONS.filter(({ status }) => counts[status] > 0), [counts]);

  const summary = useMemo(() => {
    const parts: string[] = [];
    if (counts.error > 0) {
      parts.push(`${counts.error} error${counts.error > 1 ? 's' : ''}`);
    }
    if (counts.warning > 0) {
      parts.push(`${counts.warning} warning${counts.warning > 1 ? 's' : ''}`);
    }
    if (parts.length > 0) {
      return {
        text: `${parts.join(' and ')} in schema file resolution`,
        variant: counts.error > 0 ? ('error' as const) : ('warning' as const),
      };
    }
    return { text: 'Schema validation successful', variant: 'success' as const };
  }, [counts]);

  if (items.length === 0) return null;

  return (
    <>
      <ToggleGroup aria-label="Filter schema files by status" data-testid="attach-schema-file-filter">
        {effectiveFilterOptions.map(({ status, label }) => (
          <ToggleGroupItem
            key={status}
            icon={STATUS_ICONS[status]}
            text={
              <>
                <span>{label}</span> <Badge isRead>{counts[status]}</Badge>
              </>
            }
            buttonId={`toggle-filter-${status}`}
            data-testid={`attach-schema-filter-${status}`}
            isSelected={activeFilters.has(status)}
            onChange={() => toggleFilter(status)}
          />
        ))}
      </ToggleGroup>
      <DataList
        aria-label="Schema file list"
        data-testid="attach-schema-file-list"
        isCompact
        className="attach-schema-file-list"
      >
        {filteredItems.map((item, idx) => {
          const key = item.filePath ?? `global-${item.status}-${idx}`;
          const displayName = item.filePath ? getFileName(item.filePath) : item.messages[0];
          const labelId = item.filePath ? `file-${displayName}` : `global-${item.status}-msg-${idx}`;

          return (
            <DataListItem key={key} aria-labelledby={labelId}>
              <DataListItemRow>
                <DataListItemCells
                  dataListCells={[
                    <DataListCell key="icon" isFilled={false}>
                      {STATUS_ICONS[item.status]}
                    </DataListCell>,
                    <DataListCell key="name">
                      <span
                        id={labelId}
                        data-testid={
                          item.filePath
                            ? `attach-schema-file-item-${displayName}`
                            : `attach-schema-${item.status}-${idx}`
                        }
                      >
                        {displayName}
                      </span>
                      {item.filePath && item.messages.length > 0 && (
                        <HelperText>
                          {item.messages.map((msg) => (
                            <HelperTextItem key={item.filePath} variant={item.status}>
                              {msg}
                            </HelperTextItem>
                          ))}
                        </HelperText>
                      )}
                    </DataListCell>,
                  ]}
                />
                {item.filePath && (
                  <DataListAction
                    aria-labelledby={labelId}
                    aria-label={`Remove ${displayName}`}
                    id={`action-${displayName}`}
                  >
                    <Button
                      variant="plain"
                      aria-label={`Remove ${displayName}`}
                      data-testid={`attach-schema-file-remove-${displayName}`}
                      onClick={() => onRemoveFile(item.filePath!)}
                      icon={<TrashIcon />}
                    />
                  </DataListAction>
                )}
              </DataListItemRow>
            </DataListItem>
          );
        })}
      </DataList>
      <FormHelperText>
        <HelperText>
          <HelperTextItem variant={summary.variant} data-testid="attach-schema-file-issues-summary">
            {summary.text}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </>
  );
};

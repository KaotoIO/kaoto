import { wrapField } from '@kaoto-next/uniforms-patternfly';
import { Badge, ExpandableSection, Stack, StackItem } from '@patternfly/react-core';
import { Table, TableVariant, Tbody, Td, TdProps, Th, Thead, Tr } from '@patternfly/react-table';
import { ReactNode, useContext, useMemo, useState } from 'react';
import { connectField } from 'uniforms';
import { CanvasFormTabsContext } from '../../../providers';
import { getJoinPath, isDefined } from '../../../utils';
import { AddPropertyButtons } from './AddPropertyButtons';
import { IPropertiesField, PlaceholderState } from './properties-field.models';
import './PropertiesField.scss';
import { PropertiesFieldEmptyState } from './PropertiesFieldEmptyState';
import { PropertyRow } from './PropertyRow';

/**
 * The uniforms custom field for editing generic properties where it has type "object" in the schema,
 * but it doesn't have "properties" declared.
 * @param props
 * @constructor
 */
export const PropertiesField = connectField((props: IPropertiesField) => {
  const propertiesModel = props.value;
  const [isFieldExpanded, setFieldExpanded] = useState<boolean>(Object.keys(propertiesModel).length > 0);
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const [placeholderState, setPlaceholderState] = useState<PlaceholderState | null>(null);
  const canvasFormTabsContext = useContext(CanvasFormTabsContext);
  const canAddObjectProperties = useMemo(() => !isDefined(canvasFormTabsContext), [canvasFormTabsContext]);

  function handleModelChange() {
    setPlaceholderState(null);
    props.onChange(propertiesModel, props.name);
  }

  function handleCreatePlaceHolder(state: PlaceholderState) {
    setPlaceholderState({ ...state });
    if (state.parentNodeId && state.parentNodeId.length > 0) {
      expandedNodes.includes(state.parentNodeId) || setExpandedNodes([...expandedNodes, state.parentNodeId]);
    }
  }

  function renderRows(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [node, ...remainingNodes]: [string, any][],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parentModel: any,
    parentPath: string[] = [],
    level = 1,
    posinset = 1,
    rowIndex = 0,
    isHidden = false,
  ): ReactNode[] {
    if (!node) {
      // placeholder is rendered as a last sibling
      const placeholderTreeRow: TdProps['treeRow'] = {
        rowIndex,
        onCollapse: () => {},
        props: {
          isRowSelected: true,
          isExpanded: false,
          isHidden: false,
          'aria-level': level,
          'aria-posinset': posinset,
          'aria-setsize': 0,
        },
      };

      return placeholderState && placeholderState.parentNodeId === getJoinPath(parentPath)
        ? [
            <PropertyRow
              isPlaceholder
              key="placeholder"
              propertyName={props.name}
              nodeName=""
              nodeValue={placeholderState.isObject ? {} : ''}
              path={parentPath}
              parentModel={parentModel}
              treeRow={placeholderTreeRow}
              isObject={placeholderState.isObject}
              onChangeModel={handleModelChange}
              createPlaceholder={() => {}}
            />,
          ]
        : [];
    }

    const nodeName = node[0];
    const nodeValue = node[1];
    const path = parentPath.slice();
    path.push(nodeName);
    const nodeId = getJoinPath(path);
    const isExpanded = expandedNodes.includes(nodeId);

    const childRows =
      typeof nodeValue === 'object'
        ? renderRows(Object.entries(nodeValue), nodeValue, path, level + 1, 1, rowIndex + 1, !isExpanded || isHidden)
        : [];

    const siblingRows = renderRows(
      remainingNodes,
      parentModel,
      parentPath,
      level,
      posinset + 1,
      rowIndex + 1 + childRows.length,
      isHidden,
    );

    const treeRow: TdProps['treeRow'] = {
      onCollapse: () =>
        setExpandedNodes((prevExpanded) => {
          const otherExpandedNodeIds = prevExpanded.filter((id) => id !== nodeId);
          return isExpanded ? otherExpandedNodeIds : [...otherExpandedNodeIds, nodeId];
        }),
      rowIndex,
      props: {
        isExpanded,
        isHidden,
        'aria-level': level,
        'aria-posinset': posinset,
        'aria-setsize': typeof nodeValue === 'object' ? Object.keys(nodeValue).length : 0,
      },
    };

    return [
      <PropertyRow
        key={`${props.name}-${getJoinPath(path)}`}
        propertyName={props.name}
        nodeName={nodeName}
        nodeValue={nodeValue}
        path={path}
        parentModel={parentModel}
        treeRow={treeRow}
        isObject={typeof nodeValue === 'object'}
        onChangeModel={handleModelChange}
        createPlaceholder={(isObject) => {
          handleCreatePlaceHolder({
            isObject: isObject,
            parentNodeId: getJoinPath(path),
          });
        }}
      />,
      ...childRows,
      ...siblingRows,
    ];
  }

  return wrapField(
    { ...props, label: '' },
    <ExpandableSection
      toggleContent={
        <>
          <span>{props.label} </span>
          <Badge isRead>{Object.keys(propertiesModel).length}</Badge>
        </>
      }
      toggleId={`expandable-section-toggle-${props.name}`}
      contentId="expandable-section-content"
      onToggle={(_event, isExpanded) => setFieldExpanded(isExpanded)}
      isExpanded={isFieldExpanded}
      data-testid={`expandable-section-${props.name}`}
    >
      <Stack hasGutter>
        <StackItem isFilled>
          <Table
            borders
            isTreeTable
            isStickyHeader
            className="properties-field"
            aria-label={props.name}
            variant={TableVariant.compact}
          >
            <Thead className="properties-field__head">
              <Tr key={`${props.name}-header`}>
                <Th width={40} modifier="nowrap">
                  NAME
                </Th>
                <Th width={40} modifier="nowrap">
                  VALUE
                </Th>
                <Td modifier="nowrap" isActionCell className="properties-field__row__action" data-column-type="action">
                  <AddPropertyButtons
                    path={[]}
                    disabled={props.disabled}
                    canAddObjectProperties={canAddObjectProperties}
                    createPlaceholder={(isObject) =>
                      handleCreatePlaceHolder({
                        isObject,
                        parentNodeId: '',
                      })
                    }
                  />
                </Td>
              </Tr>
            </Thead>

            <Tbody className="properties-field__body">
              {Object.keys(propertiesModel).length > 0 || placeholderState
                ? renderRows(Object.entries(propertiesModel), propertiesModel)
                : !props.disabled && (
                    <Tr key={`${props.name}-empty`}>
                      <Td modifier="truncate" colSpan={3}>
                        <PropertiesFieldEmptyState
                          name={props.name}
                          disabled={props.disabled}
                          canAddObjectProperties={canAddObjectProperties}
                          createPlaceholder={(isObject) =>
                            handleCreatePlaceHolder({
                              isObject: isObject,
                              parentNodeId: '',
                            })
                          }
                        />
                      </Td>
                    </Tr>
                  )}
            </Tbody>
          </Table>
        </StackItem>
      </Stack>
    </ExpandableSection>,
  );
});

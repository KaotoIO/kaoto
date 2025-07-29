import { Button, Icon, SearchInput } from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon, TrashIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { FunctionComponent, MouseEvent, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { ValidationResult } from '../../../../models';
import { BaseVisualCamelEntity } from '../../../../models/visualization/base-visual-entity';
import {
  ACTION_ID_CONFIRM,
  ActionConfirmationModalContext,
} from '../../../../providers/action-confirmation-modal.provider';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { VisibleFlowsContext } from '../../../../providers/visible-flows.provider';
import { InlineEdit } from '../../../InlineEdit';
import { RouteIdValidator } from '../../../InlineEdit/routeIdValidator';
import './FlowsList.scss';
import { FlowsListEmptyState } from './FlowsListEmptyState';

interface IFlowsList {
  onClose?: () => void;
}

export const FlowsList: FunctionComponent<IFlowsList> = (props) => {
  const { visualEntities, camelResource, updateEntitiesFromCamelResource } = useContext(EntitiesContext)!;
  const { visibleFlows, allFlowsVisible, visualFlowsApi } = useContext(VisibleFlowsContext)!;
  const deleteModalContext = useContext(ActionConfirmationModalContext);
  const [searchString, setSearchString] = useState<string>('');

  const isListEmpty = visualEntities.length === 0;

  const columnNames = useRef({
    id: 'Route Id',
    isVisible: 'Visibility',
    delete: 'Delete',
  });

  const filteredIds = useMemo(() => {
    return visualEntities.filter((flow) => flow.id.includes(searchString)).map((flow) => flow.id);
  }, [visualEntities, searchString]);

  const onSelectFlow = useCallback(
    (flowId: string): void => {
      visualFlowsApi.hideFlows();
      visualFlowsApi.toggleFlowVisible(flowId);
      props.onClose?.();
    },
    [props, visualFlowsApi],
  );

  const routeIdValidator = useCallback(
    (value: string): ValidationResult => {
      return RouteIdValidator.validateUniqueName(value, visualEntities);
    },
    [visualEntities],
  );

  const areFlowsVisible = useCallback(() => {
    if (searchString === '') return allFlowsVisible;

    return visualEntities
      .filter((entity) => entity.id.includes(searchString))
      .every((entity) => visibleFlows[entity.id]);
  }, [searchString, allFlowsVisible, visualEntities, visibleFlows]);

  const onToggleAll = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (areFlowsVisible()) {
        visualFlowsApi.hideFlows(filteredIds.length > 0 ? filteredIds : undefined);
      } else {
        visualFlowsApi.showFlows(filteredIds.length > 0 ? filteredIds : undefined);
      }
      event.stopPropagation();
    },
    [visualEntities, areFlowsVisible, searchString, visualFlowsApi],
  );

  const onDeleteAll = useCallback(
    async (_event: MouseEvent<HTMLButtonElement>) => {
      props.onClose?.();
      const isDeleteConfirmed = await deleteModalContext?.actionConfirmation({
        title: 'Do you want to delete the filtered routes ?',
        text: 'All steps will be lost.',
      });
      if (isDeleteConfirmed !== ACTION_ID_CONFIRM) return;
      if (filteredIds.length === 0) {
        return;
      }
      camelResource.removeEntity(filteredIds);
      updateEntitiesFromCamelResource();
    },
    [searchString, visualEntities, camelResource],
  );
  return isListEmpty ? (
    <FlowsListEmptyState data-testid="flows-list-empty-state" />
  ) : (
    <div id="flows-list">
      <Table className="flows-list-table" variant="compact" data-testid="flows-list-table">
        <Thead noWrap>
          <Tr>
            <Th>
              <SearchInput
                label={columnNames.current.id}
                aria-label="search"
                value={searchString}
                onClear={(event) => {
                  setSearchString('');
                  event.stopPropagation();
                }}
                onChange={(_event, value) => {
                  setSearchString(value);
                }}
              />
            </Th>
            <Th>
              <Button
                title={allFlowsVisible ? 'Hide all flows' : 'Show all flows'}
                data-testid="toggle-btn-all-flows"
                onClick={onToggleAll}
                isDisabled={filteredIds.length === 0}
                icon={
                  <Icon isInline>
                    {areFlowsVisible() ? (
                      <EyeIcon data-testid="toggle-btn-hide-all" />
                    ) : (
                      <EyeSlashIcon data-testid="toggle-btn-show-all" />
                    )}
                  </Icon>
                }
                variant="plain"
              />
            </Th>
            <Th>
              <Button
                title="Delete all flows"
                data-testid="delete-filtered-btn"
                icon={<TrashIcon />}
                variant="plain"
                onClick={onDeleteAll}
                isDisabled={filteredIds.length === 0}
              />
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {visualEntities
            .filter((flow) => flow.id.includes(searchString))
            .map((flow: BaseVisualCamelEntity) => (
              <Tr key={flow.id} data-testid={`flows-list-row-${flow.id}`}>
                <Td dataLabel={columnNames.current.id}>
                  <InlineEdit
                    editTitle={`Rename ${flow.id}`}
                    textTitle={`Focus on ${flow.id}`}
                    data-testid={`goto-btn-${flow.id}`}
                    value={flow.id}
                    validator={routeIdValidator}
                    onClick={() => {
                      onSelectFlow(flow.id);
                    }}
                    onChange={(name) => {
                      visualFlowsApi.renameFlow(flow.id, name);
                      flow.setId(name);
                      updateEntitiesFromCamelResource();
                    }}
                  />
                  {/*TODO add description*/}
                </Td>

                <Td dataLabel={columnNames.current.isVisible}>
                  <Button
                    data-testid={`toggle-btn-${flow.id}`}
                    icon={
                      visibleFlows[flow.id] ? (
                        <Icon isInline>
                          <EyeIcon title={`Hide ${flow.id}`} data-testid={`toggle-btn-${flow.id}-visible`} />
                        </Icon>
                      ) : (
                        <Icon isInline>
                          <EyeSlashIcon title={`Show ${flow.id}`} data-testid={`toggle-btn-${flow.id}-hidden`} />
                        </Icon>
                      )
                    }
                    variant="plain"
                    onClick={(event) => {
                      visualFlowsApi.toggleFlowVisible(flow.id);
                      /** Required to avoid closing the Dropdown after clicking in the icon */
                      event.stopPropagation();
                    }}
                  />
                </Td>

                <Td dataLabel={columnNames.current.delete}>
                  <Button
                    title={`Delete ${flow.id}`}
                    data-testid={`delete-btn-${flow.id}`}
                    icon={<TrashIcon />}
                    variant="plain"
                    onClick={async (_event) => {
                      //close the dropdown if it is open to not to interfere with the delete modal
                      props.onClose?.();
                      const isDeleteConfirmed = await deleteModalContext?.actionConfirmation({
                        title:
                          "Do you want to delete the '" +
                          flow.toVizNode().nodes[0].getId() +
                          "' " +
                          flow.toVizNode().nodes[0].getNodeTitle() +
                          '?',
                        text: 'All steps will be lost.',
                      });
                      if (isDeleteConfirmed !== ACTION_ID_CONFIRM) return;

                      camelResource.removeEntity([flow.id]);
                      updateEntitiesFromCamelResource();
                    }}
                  />
                </Td>
              </Tr>
            ))}
        </Tbody>
      </Table>
    </div>
  );
};

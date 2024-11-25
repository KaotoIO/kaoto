import { Button, Icon } from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon, TrashIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { FunctionComponent, MouseEvent, useCallback, useContext, useRef } from 'react';
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

  const isListEmpty = visualEntities.length === 0;

  const columnNames = useRef({
    id: 'Route Id',
    isVisible: 'Visibility',
    delete: 'Delete',
  });

  const onSelectFlow = useCallback(
    (flowId: string): void => {
      visualFlowsApi.hideAllFlows();
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

  const onToggleAll = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (allFlowsVisible) {
        visualFlowsApi.hideAllFlows();
      } else {
        visualFlowsApi.showAllFlows();
      }
      event.stopPropagation();
    },
    [allFlowsVisible, visualFlowsApi],
  );

  return isListEmpty ? (
    <FlowsListEmptyState data-testid="flows-list-empty-state" />
  ) : (
    <Table className="flows-list-table" variant="compact" data-testid="flows-list-table">
      <Thead>
        <Tr>
          <Th>{columnNames.current.id}</Th>
          <Th>
            <Button
              title={allFlowsVisible ? 'Hide all flows' : 'Show all flows'}
              data-testid="toggle-btn-all-flows"
              onClick={onToggleAll}
              icon={
                <Icon isInline>
                  {allFlowsVisible ? (
                    <EyeIcon data-testid="toggle-btn-hide-all" />
                  ) : (
                    <EyeSlashIcon data-testid="toggle-btn-show-all" />
                  )}
                </Icon>
              }
              variant="plain"
            />
          </Th>
          <Th>{columnNames.current.delete}</Th>
        </Tr>
      </Thead>
      <Tbody>
        {visualEntities.map((flow: BaseVisualCamelEntity) => (
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
                onClick={async (event) => {
                  const isDeleteConfirmed = await deleteModalContext?.actionConfirmation({
                    title: 'Permanently delete flow?',
                    text: 'All steps will be lost.',
                  });

                  if (isDeleteConfirmed !== ACTION_ID_CONFIRM) return;

                  camelResource.removeEntity(flow.id);
                  updateEntitiesFromCamelResource();
                  /** Required to avoid closing the Dropdown after clicking in the icon */
                  event.stopPropagation();
                }}
              />
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

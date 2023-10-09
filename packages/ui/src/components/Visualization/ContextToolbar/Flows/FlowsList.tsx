import './FlowsList.css';

import { Button, Icon } from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon, TrashIcon } from '@patternfly/react-icons';

import { FunctionComponent, useCallback, useContext, useRef } from 'react';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { FlowsListEmptyState } from './FlowsListEmptyState';
import { InlineEdit } from '../../../InlineEdit';

import { BaseVisualCamelEntity } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';

interface IFlowsList {
  onClose?: () => void;
}

export const FlowsList: FunctionComponent<IFlowsList> = (props) => {
  const { visualEntities, visibleFlows, visualFlowsApi } = useContext(EntitiesContext)!;

  const { isListEmpty, flows, setFlowName, deleteFlow } = {
    isListEmpty: visualEntities.length === 0,
    flows: visualEntities,
    setFlowName: (id: string, name: string) => {
      console.log('setting the name ', id, name);
    },
    deleteFlow: (id: string) => {
      console.log('delete flow ', id);
    },
  };

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
    [visualFlowsApi],
  );

  return isListEmpty ? (
    <FlowsListEmptyState data-testid="flows-list-empty-state" />
  ) : (
    <Table className="FlowsListTable" variant="compact" data-testid="flows-list-table">
      <Thead>
        <Tr>
          <Th>{columnNames.current.id}</Th>
          <Th>{columnNames.current.isVisible}</Th>
          <Th>{columnNames.current.delete}</Th>
        </Tr>
      </Thead>
      <Tbody>
        {flows.map((flow: BaseVisualCamelEntity) => (
          <Tr key={flow.id} data-testid={`flows-list-row-${flow.id}`}>
            <Td dataLabel={columnNames.current.id}>
              <InlineEdit
                data-testid={`goto-btn-${flow.id}`}
                value={flow.id}
                //  validator={ValidationService.validateUniqueName}
                onClick={() => {
                  onSelectFlow(flow.id);
                }}
                onChange={(name) => {
                  setFlowName(flow.id, name);
                }}
              />
              //TODO add description
              <p>{''}</p>
            </Td>

            <Td dataLabel={columnNames.current.isVisible}>
              <Button
                data-testid={`toggle-btn-${flow.id}`}
                icon={
                  visibleFlows[flow.id] ? (
                    <Icon isInline>
                      <EyeIcon data-testid={`toggle-btn-${flow.id}-visible`} />
                    </Icon>
                  ) : (
                    <Icon isInline>
                      <EyeSlashIcon data-testid={`toggle-btn-${flow.id}-hidden`} />
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
                data-testid={`delete-btn-${flow.id}`}
                icon={<TrashIcon />}
                variant="plain"
                onClick={(event) => {
                  deleteFlow(flow.id);
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

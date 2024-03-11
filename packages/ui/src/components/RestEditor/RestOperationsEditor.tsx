/* eslint-disable no-console */
import React, { useState } from 'react';
import { Table, Thead, Tr, Th, Tbody, Td, ActionsColumn, IAction } from '@patternfly/react-table';
import { ActionGroup, Button, ExpandableSection, Label } from '@patternfly/react-core';
import { Form } from 'react-router-dom';

interface RestOperation {
  method: string;
  path: string;
}

export const RestOperationsEditor: React.FunctionComponent = () => {
  // In real usage, this data would come from some external source like an API via props.
  const repositories: RestOperation[] = [
    { method: 'get', path: '/pets/{id}' },
    { method: 'put', path: '/pets/{id}' },
    { method: 'post', path: '/pets/{id}' },
    { method: 'delete', path: '/pets/{id}' },
  ];

  const columnNames = {
    method: 'Method ',
    path: 'Path ',
  };

  const defaultActions = (repo: RestOperation): IAction[] => [
    {
      title: 'Edit',
      onClick: () => console.log(`clicked on Some action, on row ${repo.method}`),
    },
    {
      title: 'Delete',
      onClick: () => console.log(`clicked on Third action, on row ${repo.method}`),
    },
  ];

  const [isExpanded, setIsExpanded] = useState(true);

  const onToggle = (_event: React.MouseEvent, isExpanded: boolean) => {
    setIsExpanded(isExpanded);
  };

  const getColorForMethod = (method: string): string => {
    switch (method) {
      case 'verb':
      case 'patch':
      case 'head':
        return 'gray';
      case 'get':
        return 'blue';
      case 'put':
        return 'green';
      case 'post':
        return 'orange';
      case 'delete':
        return 'red';
      default:
        return 'white';
    }
  };

  return (
    <React.Fragment>
      <ExpandableSection
        toggleText={'Rest Operations'}
        onToggle={onToggle}
        isExpanded={isExpanded}
        displaySize="lg"
        isWidthLimited
      >
        <Table aria-label="Rest Operations table">
          <Thead>
            <Tr>
              <Th>{columnNames.method}</Th>
              <Th>{columnNames.path}</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {repositories.map((repo) => {
              const rowActions: IAction[] | null = defaultActions(repo);
              return (
                <Tr key={repo.method}>
                  <Td dataLabel={columnNames.method}>
                    <Label variant='filled' color={getColorForMethod(repo.method)}>{repo.method}</Label>
                  </Td>
                  <Td dataLabel={columnNames.path}>{repo.path}</Td>
                  <Td isActionCell>
                    {rowActions ? <ActionsColumn items={rowActions} actionsToggle={undefined} /> : null}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
        <br />
        <Form>
          <ActionGroup>
            <Button variant="primary">Create</Button>
          </ActionGroup>
        </Form>
      </ExpandableSection>
    </React.Fragment>
  );
};

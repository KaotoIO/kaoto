/* eslint-disable no-console */
import React, { useState } from 'react';
import { Table, Thead, Tr, Th, Tbody, Td, ActionsColumn, IAction } from '@patternfly/react-table';
import { ActionGroup, Button, ExpandableSection } from '@patternfly/react-core';
import { Form } from 'react-router-dom';

interface RestService {
  name: string;
}

export const RestServicesEditor: React.FunctionComponent = () => {
  // In real usage, this data would come from some external source like an API via props.
  const repositories: RestService[] = [{ name: '/greeter' }, { name: '/pets' }];

  const columnNames = {
    name: 'Path',
  };

  const defaultActions = (repo: RestService): IAction[] => [
    {
      title: 'Edit',
      onClick: () => console.log(`clicked on Some action, on row ${repo.name}`)
    },
    {
      title: 'Delete',
      onClick: () => console.log(`clicked on Third action, on row ${repo.name}`)
    },
  ];

  const [isExpanded, setIsExpanded] = useState(true);

  const onToggle = (_event: React.MouseEvent, isExpanded: boolean) => {
    setIsExpanded(isExpanded);
  };

  return (
    <React.Fragment>
      <ExpandableSection
        toggleText={'Rest Services'}
        onToggle={onToggle}
        isExpanded={isExpanded}
        displaySize="lg"
        isWidthLimited
      >
        <Table aria-label="Rest Services table">
          <Thead>
            <Tr>
              <Th>{columnNames.name}</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {repositories.map((repo) => {
              const rowActions: IAction[] | null = defaultActions(repo);
              return (
                <Tr key={repo.name}>
                  <Td dataLabel={columnNames.name}>{repo.name}</Td>
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

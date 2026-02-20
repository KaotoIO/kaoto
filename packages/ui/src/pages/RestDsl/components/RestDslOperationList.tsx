import './RestDslOperationList.scss';

import { Button, List, ListItem } from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

import { CamelRestVisualEntity } from '../../../models/visualization/flows/camel-rest-visual-entity';
import { RestEditorSelection, RestVerb } from '../restDslTypes';

type RestOperationListProps = {
  restEntity: CamelRestVisualEntity;
  restDefinition: Record<string, unknown>;
  restMethods: RestVerb[];
  selection: RestEditorSelection | undefined;
  onSelectOperation: (restId: string, verb: RestVerb, index: number) => void;
  onDeleteOperation: (restEntity: CamelRestVisualEntity, verb: RestVerb, index: number) => void;
  getListItemClass: (selection: RestEditorSelection | undefined, target: RestEditorSelection) => string;
};

export const RestDslOperationList: FunctionComponent<RestOperationListProps> = ({
  restEntity,
  restDefinition,
  restMethods,
  selection,
  onSelectOperation,
  onDeleteOperation,
  getListItemClass,
}) => {
  const items = restMethods.flatMap((verb) => {
    const operations = restDefinition[verb] as Array<{ path?: string; id?: string }> | undefined;
    if (!operations || operations.length === 0) return [];

    return operations.map((operation, index) => {
      const operationPath = operation?.path || operation?.id || '/';
      const isSelected =
        selection?.kind === 'operation' &&
        selection.restId === restEntity.id &&
        selection.verb === verb &&
        selection.index === index;

      return (
        <ListItem key={`${restEntity.id}-${verb}-${index}`}>
          <div className="rest-dsl-operation-row">
            <Button
              variant="plain"
              className={getListItemClass(selection, {
                kind: 'operation',
                restId: restEntity.id,
                verb,
                index,
              })}
              onClick={() => onSelectOperation(restEntity.id, verb, index)}
              aria-label={`Select ${verb.toUpperCase()} operation ${operationPath}`}
              aria-pressed={isSelected}
            >
              <span className={`rest-dsl-operation-verb rest-dsl-operation-verb-${verb}`}>{verb.toUpperCase()}</span>
              <span className="rest-dsl-operation-path">{operationPath}</span>
            </Button>
            <Button
              variant="plain"
              size="sm"
              icon={<TrashIcon />}
              aria-label="Delete Operation"
              onClick={() => onDeleteOperation(restEntity, verb, index)}
            />
          </div>
        </ListItem>
      );
    });
  });

  return <List className="rest-dsl-nav-list rest-dsl-nav-list-nested">{items}</List>;
};

import { FunctionComponent, useContext } from 'react';
import { Chip, ToolbarItem } from '@patternfly/react-core';

import { sourceSchemaConfig } from '../../../models/camel';
import { FlowsMenu } from './Flows/FlowsMenu';
import { EntitiesContext } from '../../../providers/entities.provider';
import { NewFlow } from './FlowType/NewFlow';

export const ContextToolbar: FunctionComponent = () => {
  const { currentSchemaType } = useContext(EntitiesContext)!;
  return [
    <ToolbarItem key={'toolbar-current-dsl'}>
      <Chip data-testid="toolbar-current-dsl" isReadOnly>
        {sourceSchemaConfig.config[currentSchemaType].name || 'None'}
      </Chip>
    </ToolbarItem>,
    <ToolbarItem key={'toolbar-new-route'}>
      <NewFlow />
    </ToolbarItem>,
    <ToolbarItem key={'toolbar-flows-list'}>
      <FlowsMenu />
    </ToolbarItem>,
  ];
};

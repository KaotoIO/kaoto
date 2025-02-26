import { DesignPage } from './DesignPage';
import { FunctionComponent, useContext } from 'react';
import { EntitiesContext } from '../../providers';
import { SerializerType } from '../../serializers';
import { ToolbarItem } from '@patternfly/react-core';
import { DSLSelector } from '../../components/Visualization/ContextToolbar/DSLSelector/DSLSelector';

const DesignPageWrapper: FunctionComponent = () => {
  const { camelResource } = useContext(EntitiesContext)!;

  const additionalControls =
    camelResource.getSerializerType() === SerializerType.XML
      ? []
      : [
          <ToolbarItem key="toolbar-dsl-selector">
            <DSLSelector />
          </ToolbarItem>,
        ];
  return <DesignPage additionalToolbarControls={additionalControls} />;
};

export const element = <DesignPageWrapper />;

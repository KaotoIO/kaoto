import { Modal } from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import {
  camelComponentApisToTable,
  camelComponentPropertiesToTable,
  camelProcessorPropertiesToTable,
  kameletToPropertiesTable,
} from '../../camel-utils/camel-to-table.adapter';
import { CatalogKind, ICamelComponentDefinition, ICamelProcessorDefinition, IKameletDefinition } from '../../models';
import { ITile } from '../Catalog';
import { EmptyTableState } from './EmptyTableState';
import { IPropertiesTab } from './PropertiesModal.models';
import './PropertiesModal.scss';
import { PropertiesTabs } from './PropertiesTabs';
import { transformPropertiesIntoTab } from './camel-properties-to-tab';

interface IPropertiesModalProps {
  tile: ITile;
  onClose: () => void;
  isModalOpen: boolean;
}

const transformCamelComponentIntoTab = (
  tabsToRender: IPropertiesTab[],
  componentDef: ICamelComponentDefinition,
): void => {
  let tab = transformPropertiesIntoTab(
    [
      {
        transformFunction: camelComponentPropertiesToTable,
        propertiesObject: componentDef.componentProperties,
      },
    ],
    'Component Options',
  );
  if (tab) tabsToRender.push(tab);

  // properties, contains 2 subtables divided according to Kind
  tab = transformPropertiesIntoTab(
    [
      {
        transformFunction: camelComponentPropertiesToTable,
        propertiesObject: componentDef.properties,
        filter: {
          filterKey: 'kind',
          filterValue: 'path',
        },
        tableCaption: 'path parameters',
      },
      {
        transformFunction: camelComponentPropertiesToTable,
        propertiesObject: componentDef.properties,
        filter: {
          filterKey: 'kind',
          filterValue: 'parameter',
        },
        tableCaption: 'query parameters',
      },
    ],
    'Endpoint Options',
  );
  if (tab) tabsToRender.push(tab);

  // headers, only if exists
  if (componentDef.headers) {
    let tab = transformPropertiesIntoTab(
      [
        {
          transformFunction: camelComponentPropertiesToTable,
          propertiesObject: componentDef.headers,
        },
      ],
      'Message Headers',
    );
    if (tab) tabsToRender.push(tab);
  }

  // apis, only if exists
  if (componentDef.apis) {
    let tab = transformPropertiesIntoTab(
      [
        {
          transformFunction: camelComponentApisToTable,
          propertiesObject: componentDef.apis,
        },
      ],
      'APIs',
    );
    if (tab) tabsToRender.push(tab);
  }
};

const transformCamelProcessorComponentIntoTab = (
  tabsToRender: IPropertiesTab[],
  processorDef: ICamelProcessorDefinition,
): void => {
  let tab = transformPropertiesIntoTab(
    [
      {
        transformFunction: camelProcessorPropertiesToTable,
        propertiesObject: processorDef.properties,
      },
    ],
    'Options',
  );
  if (tab) tabsToRender.push(tab);
};

const transformKameletComponentIntoTab = (tabsToRender: IPropertiesTab[], kameletDef: IKameletDefinition): void => {
  let tab = transformPropertiesIntoTab(
    [
      {
        transformFunction: kameletToPropertiesTable,
        propertiesObject: kameletDef,
      },
    ],
    'Options',
  );
  if (tab) tabsToRender.push(tab);
};

export const PropertiesModal: FunctionComponent<IPropertiesModalProps> = (props) => {
  let tabs: IPropertiesTab[] = [];
  switch (props.tile.type) {
    case CatalogKind.Component: {
      transformCamelComponentIntoTab(tabs, props.tile.rawObject as ICamelComponentDefinition);
      break;
    }
    case CatalogKind.Processor: {
      transformCamelProcessorComponentIntoTab(tabs, props.tile.rawObject as ICamelProcessorDefinition);
      break;
    }
    case CatalogKind.Kamelet: {
      transformKameletComponentIntoTab(tabs, props.tile.rawObject as IKameletDefinition);
      break;
    }
    default:
      throw Error('Unknown CatalogKind during rendering modal: ' + props.tile.type);
  }

  return (
    <Modal
      className="properties-modal"
      title={props.tile.title}
      isOpen={props.isModalOpen}
      position="top"
      onClose={props.onClose}
      ouiaId="BasicModal"
    >
      <p data-testid="properties-modal-description">{props.tile.description}</p>
      {tabs.length == 0 && <EmptyTableState name={props.tile.name}></EmptyTableState>}
      {tabs.length != 0 && <PropertiesTabs tabs={tabs}></PropertiesTabs>}
    </Modal>
  );
};

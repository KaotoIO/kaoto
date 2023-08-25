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
import './PropertiesModal.scss';
import { IPropertiesTab, PropertiesTabs } from './PropertiesTabs';
import { EmptyTableState } from './EmptyTableState';
import { IPropertiesTable } from './PropertiesModal.models';

interface IPropertiesModalProps {
  tile: ITile;
  onClose: () => void;
  isModalOpen: boolean;
}

// TODO change this horrible switch
const prepareDataForTabs = (tile: ITile): IPropertiesTab[] => {
  let tabs: IPropertiesTab[] = [];
  switch (tile.type) {
    case CatalogKind.Component: {
      // component properties
      let table = camelComponentPropertiesToTable((tile.rawObject as ICamelComponentDefinition).componentProperties);
      if (table.rows.length != 0) {
        tabs.push({
          rootName: 'Component Options (' + table.rows.length + ')',
          tables: [table],
        });
      }


      let subTables: IPropertiesTable[] = [];
      let subTablesRows = 0
      // properties, only if exists
      let subTable = camelComponentPropertiesToTable((tile.rawObject as ICamelComponentDefinition).properties, {
        filterKey: 'kind',
        filterValue: 'path',
      });
      subTable.caption = 'path parameters (' + subTable.rows.length + ')';
      if (subTable.rows.length != 0) {
        subTablesRows += subTable.rows.length
        subTables.push(subTable)
      }
      subTable = camelComponentPropertiesToTable((tile.rawObject as ICamelComponentDefinition).properties, {
        filterKey: 'kind',
        filterValue: 'parameter',
      });
      subTable.caption = 'query parameters (' + subTable.rows.length + ')';
      if (subTable.rows.length != 0) {
        subTablesRows += subTable.rows.length
        subTables.push(subTable)
      }
      if (subTables.length != 0) {
        tabs.push({
          rootName: 'Endpoint Options (' + subTablesRows + ')',
          tables: subTables,
        });
      }

      // headers, only if exists
      if ((tile.rawObject as ICamelComponentDefinition).headers) {
        table = camelComponentPropertiesToTable((tile.rawObject as ICamelComponentDefinition).headers!);
        if (table.rows.length != 0) {
          tabs.push({
            rootName: 'Message Headers (' + table.rows.length + ')',
            tables: [table],
          });
        }
      }

      // apis, only if exists
      if ((tile.rawObject as ICamelComponentDefinition).apis) {
        table = camelComponentApisToTable((tile.rawObject as ICamelComponentDefinition).apis!);
        if (table.rows.length != 0) {
          tabs.push({
            rootName: 'APIs (' + table.rows.length + ')',
            tables: [table],
          });
        }
      }
      break;
    }
    case CatalogKind.Processor: {
      let table = camelProcessorPropertiesToTable((tile.rawObject as ICamelProcessorDefinition).properties);
      if (table.rows.length != 0) {
        tabs.push({
          rootName: 'Options (' + table.rows.length + ')',
          tables: [table],
        });
      }
      break;
    }
    case CatalogKind.Kamelet: {
      let table = kameletToPropertiesTable(tile.rawObject as IKameletDefinition);
      if (table.rows.length != 0) {
        tabs.push({
          rootName: 'Options (' + table.rows.length + ')',
          tables: [table],
        });
      }
      break;
    }
    default:
      throw Error('Unknown CatalogKind during rendering modal: ' + tile.type);
  }
  return tabs;
};

export const PropertiesModal: FunctionComponent<IPropertiesModalProps> = (props) => {
  let tabs: IPropertiesTab[] = prepareDataForTabs(props.tile);
  return (
    <Modal
      className="properties-modal"
      title={props.tile.title}
      isOpen={props.isModalOpen}
      position="top"
      onClose={props.onClose}
      ouiaId="BasicModal"
    >
      <p data-testid="properties-modal-table-description">{props.tile.description}</p>
      {tabs.length == 0 && <EmptyTableState name={props.tile.name}></EmptyTableState>}
      {tabs.length != 0 && <PropertiesTabs tabs={tabs}></PropertiesTabs>}
    </Modal>
  );
};

import { Modal, Tab, Tabs } from '@patternfly/react-core';
import { FunctionComponent, useState } from 'react';
import {
  camelComponentApisToTable,
  camelComponentPropertiesToTable,
  camelProcessorPropertiesToTable,
  kameletToPropertiesTable,
} from '../../camel-utils/camel-to-table.adapter';
import { CatalogKind, ICamelComponentDefinition, ICamelProcessorDefinition, IKameletDefinition } from '../../models';
import { ITile } from '../Catalog';
import { EmptyTableState } from './EmptyTableState';
import { IPropertiesTable } from './PropertiesModal.models';
import './PropertiesModal.scss';
import { PropertiesTable } from './PropertiesTable';

interface IPropertiesModalProps {
  tile: ITile;
  onClose: () => void;
  isModalOpen: boolean;
}

interface IPropertiesTab {
  rootName: string;
  tables: IPropertiesTable[];
}

export const PropertiesModal: FunctionComponent<IPropertiesModalProps> = (props) => {
  const [activeTabKey, setActiveTabKey] = useState<string | number>(0);
  const handleTabClick = (
    event: React.MouseEvent<any> | React.KeyboardEvent | MouseEvent,
    tabIndex: string | number,
  ) => {
    setActiveTabKey(tabIndex);
  };

  let rootTab: IPropertiesTab[] = [];

  switch (props.tile.type) {
    case CatalogKind.Component: {
      let table = camelComponentPropertiesToTable(
        (props.tile.rawObject as ICamelComponentDefinition).componentProperties,
      );
      rootTab.push({
        rootName: 'Component Options (' + table.rows.length + ')',
        tables: [table],
      });
      let table1 = camelComponentPropertiesToTable((props.tile.rawObject as ICamelComponentDefinition).properties, {
        filterKey: 'kind',
        filterValue: 'path',
      });
      table1.caption = 'path parameters (' + table1.rows.length + ')';
      let table2 = camelComponentPropertiesToTable((props.tile.rawObject as ICamelComponentDefinition).properties, {
        filterKey: 'kind',
        filterValue: 'parameter',
      });
      table2.caption = 'query parameters (' + table2.rows.length + ')';
      rootTab.push({
        rootName: 'Endpoint Options (' + (table1.rows.length + table2.rows.length) + ')',
        tables: [table1, table2],
      });
      // only if exists
      if ((props.tile.rawObject as ICamelComponentDefinition).headers) {
        table = camelComponentPropertiesToTable((props.tile.rawObject as ICamelComponentDefinition).headers!);
        rootTab.push({
          rootName: 'Message Headers (' + table.rows.length + ')',
          tables: [table],
        });
      }
      // only if exists
      if ((props.tile.rawObject as ICamelComponentDefinition).apis) {
        table = camelComponentApisToTable((props.tile.rawObject as ICamelComponentDefinition).apis!);
        rootTab.push({
          rootName: 'APIs (' + table.rows.length + ')',
          tables: [table],
        });
      }
      break;
    }
    case CatalogKind.Processor: {
      let table = camelProcessorPropertiesToTable((props.tile.rawObject as ICamelProcessorDefinition).properties);
      rootTab.push({
        rootName: 'Options (' + table.rows.length + ')',
        tables: [table],
      });
      break;
    }
    case CatalogKind.Kamelet: {
      let table = kameletToPropertiesTable(props.tile.rawObject as IKameletDefinition);
      rootTab.push({
        rootName: 'Options (' + table.rows.length + ')',
        tables: [table],
      });
      break;
    }
    default:
      throw Error('Unknown CatalogKind during rendering modal: ' + props.tile?.type);
  }

  return (
    <Modal
      className="properties-modal"
      title={props.tile.title}
      isOpen={props.isModalOpen}
      position="top"
      onClose={() => {
        setActiveTabKey(0);
        props.onClose();
      }}
      ouiaId="BasicModal"
    >
      <p data-testid="properties-modal-table-description">{props.tile.description}</p>
      <Tabs
        activeKey={activeTabKey}
        onSelect={handleTabClick}
        aria-label="Tabs in the default example"
        isBox={true}
        role="region"
      >
        {rootTab.map((tab, index) => (
          <Tab eventKey={index} title={tab.rootName}>
            {tab.tables.map((table) => (
              <>
                {table.rows.length == 0 && <EmptyTableState componentName={props.tile.name}></EmptyTableState>}
                {table.rows.length > 0 && <PropertiesTable table={table}></PropertiesTable>}
              </>
            ))}
          </Tab>
        ))}
      </Tabs>
    </Modal>
  );
};

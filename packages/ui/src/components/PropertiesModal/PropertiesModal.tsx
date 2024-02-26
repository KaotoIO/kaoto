import { Modal, ModalBoxBody, Tab, Tabs } from '@patternfly/react-core';
import { FunctionComponent, useEffect, useMemo, useState } from 'react';
import { IPropertiesTab } from './PropertiesModal.models';
import {
  transformCamelComponentIntoTab,
  transformCamelProcessorComponentIntoTab,
  transformKameletComponentIntoTab,
} from '../../camel-utils/camel-to-tabs.adapter';
import { CatalogKind, ICamelComponentDefinition, ICamelProcessorDefinition, IKameletDefinition } from '../../models';
import { ITile } from '../Catalog';
import './PropertiesModal.scss';
import { PropertiesTabs } from './PropertiesTabs';
import { EmptyTableState } from './Tables';

interface IPropertiesModalProps {
  tile: ITile;
  onClose: () => void;
  isModalOpen: boolean;
}

export const PropertiesModal: FunctionComponent<IPropertiesModalProps> = (props) => {
  const tabs = useMemo(() => {
    switch (props.tile.type) {
      case CatalogKind.Component: {
        return transformCamelComponentIntoTab(props.tile.rawObject as ICamelComponentDefinition);
      }
      case CatalogKind.Processor: {
        return transformCamelProcessorComponentIntoTab(props.tile.rawObject as ICamelProcessorDefinition);
      }
      case CatalogKind.Kamelet: {
        return transformKameletComponentIntoTab(props.tile.rawObject as IKameletDefinition);
      }
      default:
        throw Error('Unknown CatalogKind during rendering modal: ' + props.tile.type);
    }
  }, [props.tile]);
  const [activeTabKey, setActiveTabKey] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<IPropertiesTab>(tabs[0]);

  useEffect(() => {
    setActiveTabKey(0);
    setActiveTab(tabs[0]);
  }, [tabs]);

  const handleTabClick = (_event: unknown, tabIndex: string | number) => {
    setActiveTab(tabs[tabIndex as number]);
    setActiveTabKey(tabIndex as number);
  };

  const description = (
    <div>
      <p data-testid="properties-modal-description">{props.tile.description}</p>
      <br />
      <Tabs activeKey={activeTabKey} onSelect={handleTabClick} aria-label="Properties tabs" isBox={true} role="region">
        {tabs.map((tab, tab_index) => (
          <Tab data-testid={'tab-' + tab_index} key={tab_index} eventKey={tab_index} title={tab.rootName}></Tab>
        ))}
      </Tabs>
    </div>
  );

  return (
    <Modal
      className="properties-modal"
      title={props.tile.title}
      isOpen={props.isModalOpen}
      onClose={props.onClose}
      ouiaId="BasicModal"
      description={description}
      variant="large"
    >
      <ModalBoxBody className="properties-modal__body">
        {tabs.length === 0 ? (
          <EmptyTableState name={props.tile.name} />
        ) : (
          <PropertiesTabs tab={activeTab!} tab_index={activeTabKey} />
        )}
      </ModalBoxBody>
    </Modal>
  );
};

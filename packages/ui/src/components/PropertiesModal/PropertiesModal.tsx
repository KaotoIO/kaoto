import { Tab, Tabs, capitalize } from '@patternfly/react-core';
import { Modal, ModalBoxBody } from '@patternfly/react-core/deprecated';
import { FunctionComponent, ReactElement, useContext, useEffect, useMemo, useState } from 'react';
import {
  transformCamelComponentIntoTab,
  transformCamelProcessorComponentIntoTab,
  transformKameletComponentIntoTab,
} from '../../camel-utils/camel-to-tabs.adapter';
import { CatalogKind } from '../../models';
import { CatalogContext } from '../../providers';
import { NodeIconResolver, NodeIconType } from '../../utils';
import { ITile } from '../Catalog';
import { IPropertiesTab } from './PropertiesModal.models';
import './PropertiesModal.scss';
import { PropertiesTabs } from './PropertiesTabs';
import { EmptyTableState } from './Tables';

interface IPropertiesModalProps {
  tile: ITile;
  onClose: () => void;
  isModalOpen: boolean;
}

export const PropertiesModal: FunctionComponent<IPropertiesModalProps> = (props) => {
  const catalogService = useContext(CatalogContext);
  const tabs = useMemo(() => {
    switch (props.tile.type) {
      case CatalogKind.Component:
        return transformCamelComponentIntoTab(catalogService.getComponent(CatalogKind.Component, props.tile.name));

      case CatalogKind.Processor:
        return transformCamelProcessorComponentIntoTab(
          catalogService.getComponent(CatalogKind.Processor, props.tile.name),
        );

      case CatalogKind.Entity:
        return transformCamelProcessorComponentIntoTab(
          catalogService.getComponent(CatalogKind.Entity, props.tile.name),
        );

      case CatalogKind.Kamelet:
        return transformKameletComponentIntoTab(catalogService.getComponent(CatalogKind.Kamelet, props.tile.name));

      default:
        throw Error('Unknown CatalogKind during rendering modal: ' + props.tile.type);
    }
  }, [catalogService, props.tile.name, props.tile.type]);
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
  const nodeIconType = capitalize(props.tile.type === 'processor' ? NodeIconType.EIP : props.tile.type);
  const iconName = nodeIconType === NodeIconType.Kamelet ? `kamelet:${props.tile.name}` : props.tile.name;

  const title: ReactElement = (
    <div className="properties-modal__title-div">
      <img
        className={'properties-modal__title-image'}
        src={NodeIconResolver.getIcon(iconName, nodeIconType as NodeIconType)}
        alt={`${props.tile.type} icon`}
      />
      <h1 className="properties-modal__title">{props.tile.title}</h1>
    </div>
  );

  const description = (
    <div>
      <p data-testid="properties-modal-description">{props.tile.description}</p>
      <br />
      <Tabs activeKey={activeTabKey} onSelect={handleTabClick} aria-label="Properties tabs" isBox role="region">
        {tabs.map((tab, tab_index) => (
          <Tab data-testid={'tab-' + tab_index} key={tab_index} eventKey={tab_index} title={tab.rootName}></Tab>
        ))}
      </Tabs>
    </div>
  );

  return (
    <Modal
      className="properties-modal"
      title={title}
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

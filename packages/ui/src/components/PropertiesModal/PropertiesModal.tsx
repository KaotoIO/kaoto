import './PropertiesModal.scss';

import { Modal, ModalBody, ModalHeader, Tab, Tabs } from '@patternfly/react-core';
import { FunctionComponent, ReactElement, useContext, useEffect, useState } from 'react';

import { CatalogContext } from '../../dynamic-catalog/catalog.provider';
import { CatalogKind } from '../../models/catalog-kind';
import { ITile } from '../Catalog';
import { IconResolver } from '../IconResolver';
import { Loading } from '../Loading';
import {
  transformCamelComponentIntoTab,
  transformCamelProcessorComponentIntoTab,
  transformCitrusComponentIntoTab,
  transformKameletComponentIntoTab,
} from './camel-to-tabs.adapter';
import { IPropertiesTab } from './PropertiesModal.models';
import { PropertiesTabs } from './PropertiesTabs';
import { EmptyTableState } from './Tables';

interface IPropertiesModalProps {
  tile: ITile;
  onClose: () => void;
  isModalOpen: boolean;
}

export const PropertiesModal: FunctionComponent<IPropertiesModalProps> = (props) => {
  const catalogRegistry = useContext(CatalogContext);
  const [tabs, setTabs] = useState<IPropertiesTab[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTabKey, setActiveTabKey] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<IPropertiesTab | undefined>(undefined);

  useEffect(() => {
    const fetchTabs = async () => {
      setIsLoading(true);
      let transformedTabs: IPropertiesTab[] = [];

      try {
        switch (props.tile.type) {
          case CatalogKind.Component: {
            const component = await catalogRegistry.getEntity(CatalogKind.Component, props.tile.name);
            transformedTabs = transformCamelComponentIntoTab(component);
            break;
          }

          case CatalogKind.Processor: {
            const processor = await catalogRegistry.getEntity(CatalogKind.Processor, props.tile.name);
            transformedTabs = transformCamelProcessorComponentIntoTab(processor);
            break;
          }

          case CatalogKind.Entity: {
            const entity = await catalogRegistry.getEntity(CatalogKind.Entity, props.tile.name);
            transformedTabs = transformCamelProcessorComponentIntoTab(entity);
            break;
          }

          case CatalogKind.Kamelet: {
            const kamelet = await catalogRegistry.getEntity(CatalogKind.Kamelet, props.tile.name, {
              forceFresh: true,
            });
            transformedTabs = transformKameletComponentIntoTab(kamelet);
            break;
          }

          case CatalogKind.TestAction: {
            const component = await catalogRegistry.getEntity(CatalogKind.TestAction, props.tile.name);
            transformedTabs = transformCitrusComponentIntoTab(component);
            break;
          }

          case CatalogKind.TestContainer: {
            const component = await catalogRegistry.getEntity(CatalogKind.TestContainer, props.tile.name);
            transformedTabs = transformCitrusComponentIntoTab(component);
            break;
          }

          default:
            throw new Error('Unknown CatalogKind during rendering modal: ' + props.tile.type);
        }
      } finally {
        setTabs(transformedTabs);
        setActiveTabKey(0);
        setActiveTab(transformedTabs[0]);
        setIsLoading(false);
      }
    };

    fetchTabs();
  }, [catalogRegistry, props.tile.name, props.tile.type]);

  const handleTabClick = (_event: unknown, tabIndex: string | number) => {
    setActiveTab(tabs[tabIndex as number]);
    setActiveTabKey(tabIndex as number);
  };

  const title: ReactElement = (
    <div className="properties-modal__title-div">
      <IconResolver
        alt={`${props.tile.type} icon`}
        className={'properties-modal__title-image'}
        catalogKind={props.tile.type as CatalogKind}
        name={props.tile.name}
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
      isOpen={props.isModalOpen}
      onClose={props.onClose}
      ouiaId="BasicModal"
      variant="default"
    >
      <ModalHeader title={title} description={description} />
      <ModalBody className="properties-modal__body">
        {isLoading && <Loading>Loading properties...</Loading>}
        {!isLoading && tabs.length === 0 && <EmptyTableState name={props.tile.name} />}
        {!isLoading && tabs.length > 0 && <PropertiesTabs tab={activeTab!} tab_index={activeTabKey} />}
      </ModalBody>
    </Modal>
  );
};

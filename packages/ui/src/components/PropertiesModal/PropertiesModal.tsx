import { Modal } from '@patternfly/react-core';
import { FunctionComponent, useMemo } from 'react';
import {
  transformCamelComponentIntoTab,
  transformCamelProcessorComponentIntoTab,
  transformKameletComponentIntoTab,
} from '../../camel-utils';
import { CatalogKind, ICamelComponentDefinition, ICamelProcessorDefinition, IKameletDefinition } from '../../models';
import { ITile } from '../Catalog';
import { EmptyTableState } from './EmptyTableState';
import './PropertiesModal.scss';
import { PropertiesTabs } from './PropertiesTabs';

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

  return (
    <Modal
      className="properties-modal"
      title={props.tile.title}
      isOpen={props.isModalOpen}
      onClose={props.onClose}
      ouiaId="BasicModal"
    >
      <p data-testid="properties-modal-description">{props.tile.description}</p>
      <br />
      {tabs.length == 0 && <EmptyTableState name={props.tile.name}></EmptyTableState>}
      {tabs.length != 0 && <PropertiesTabs tabs={tabs}></PropertiesTabs>}
    </Modal>
  );
};

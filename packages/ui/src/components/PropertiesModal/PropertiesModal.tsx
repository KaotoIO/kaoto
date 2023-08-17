import { Modal } from '@patternfly/react-core';
import { Caption, Table, Tbody, Thead } from '@patternfly/react-table';
import { FunctionComponent, useState } from 'react';
import { CatalogKind, ICamelComponentDefinition, ICamelProcessorDefinition, IKameletDefinition } from '../../models';
import { ITile } from '../Catalog';
import { CamelComponentTableHeaders, CamelComponentTableRows } from './CamelComponentTable';
import { KameletTableHeaders, KameletTableRows } from './KameletTable';

interface IPropertiesModalProps {
  tile?: ITile;
  onClose: () => void;
  isModalOpen: boolean;
}

export const PropertiesModal: FunctionComponent<IPropertiesModalProps> = (props) => {
  const [numberOfProps, setNumberOfProps] = useState(0);

  function changeTotalNumberCallback(numb: number) {
    setNumberOfProps(numb);
  }

  return (
    <Modal
      title={props.tile == undefined ? 'Properties modal' : props.tile.name}
      isOpen={props.isModalOpen}
      onClose={props.onClose}
      ouiaId="BasicModal"
    >
      <p>{props.tile?.description}</p>
      <Table aria-label="Simple table" variant="compact">
        <Caption>{'Available properties (' + numberOfProps + ')'}</Caption>
        <Thead>
          {props.tile?.type === CatalogKind.Component && <CamelComponentTableHeaders></CamelComponentTableHeaders>}
          {props.tile?.type === CatalogKind.Processor && <CamelComponentTableHeaders></CamelComponentTableHeaders>}
          {props.tile?.type === CatalogKind.Kamelet && <KameletTableHeaders></KameletTableHeaders>}
        </Thead>
        <Tbody>
          {props.tile?.type === CatalogKind.Component && (
            <CamelComponentTableRows
              name={props.tile.name}
              componentDefinition={props.tile.rawObject as ICamelComponentDefinition}
              changeTotalPropertiesCallback={changeTotalNumberCallback}
            ></CamelComponentTableRows>
          )}
          {props.tile?.type === CatalogKind.Processor && (
            <CamelComponentTableRows
              name={props.tile.name}
              componentDefinition={props.tile.rawObject as ICamelProcessorDefinition}
              changeTotalPropertiesCallback={changeTotalNumberCallback}
            ></CamelComponentTableRows>
          )}
          {props.tile?.type === CatalogKind.Kamelet && (
            <KameletTableRows
              name={props.tile.name}
              kameletDefinition={props.tile.rawObject as IKameletDefinition}
              changeTotalPropertiesCallback={changeTotalNumberCallback}
            ></KameletTableRows>
          )}
        </Tbody>
      </Table>
    </Modal>
  );
};

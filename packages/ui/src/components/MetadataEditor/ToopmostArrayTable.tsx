import './MetadataEditor.scss';
import { Button, EmptyState, EmptyStateBody, Tooltip, Truncate } from '@patternfly/react-core';
import { PlusCircleIcon, TrashIcon } from '@patternfly/react-icons';
import {
  InnerScrollContainer,
  OuterScrollContainer,
  Table,
  TableVariant,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';

type TopmostArrayTableProps = {
  model: any[];
  itemSchema: any;
  name: string;
  selected: number;
  onSelected: (index: number) => void;
  onChangeModel: (model: any[]) => void;
};

/**
 * The selectable table view for the topmost array metadata.
 * @param props
 * @constructor
 */
export function TopmostArrayTable(props: TopmostArrayTableProps) {
  function handleTrashClick(index: number) {
    const newMetadata = props.model ? props.model.slice() : [];
    newMetadata.length !== 0 && newMetadata.splice(index, 1);
    props.onChangeModel(newMetadata);
    props.selected === index && props.onSelected(-1);
  }

  function handleAddNew() {
    const newMetadata = props.model ? props.model.slice() : [];
    newMetadata.push({});
    props.onChangeModel(newMetadata);
    props.onSelected(newMetadata.length - 1);
  }

  return (
    <OuterScrollContainer>
      <InnerScrollContainer>
        <Table
          aria-label={props.name}
          variant={TableVariant.compact}
          borders={true}
          isStickyHeader
        >
          <Thead>
            <Tr>
              {props.itemSchema.required &&
                props.itemSchema.required.map((name: string) => (
                  <Th modifier={'nowrap'} key={name}>
                    {name.toUpperCase()}
                  </Th>
                ))}
              <Td modifier="nowrap" key="buttons" isActionCell>
                <Tooltip content={`Add new ${props.name}`}>
                  <Button
                    data-testid={'metadata-add-' + props.name + '-btn'}
                    icon={<PlusCircleIcon />}
                    variant="link"
                    onClick={() => handleAddNew()}
                  ></Button>
                </Tooltip>
              </Td>
            </Tr>
          </Thead>
          <Tbody>
            {!props.model || props.model.length === 0 ? (
              <Tr>
                <Td colSpan={props.itemSchema?.required?.length + 1 || 1}>
                  <EmptyState>
                    <EmptyStateBody>No {props.name}</EmptyStateBody>
                    <Button
                      data-testid={'metadata-add-' + props.name + '-btn'}
                      icon={<PlusCircleIcon />}
                      variant="link"
                      onClick={() => handleAddNew()}
                    >
                      Add new
                    </Button>
                  </EmptyState>
                </Td>
              </Tr>
            ) : (
              props.model.map((item, index) => (
                <Tr
                  key={index}
                  data-testid={'metadata-row-' + index}
                  isSelectable
                  onRowClick={() => props.onSelected(index)}
                  isRowSelected={props.selected === index}
                >
                  {props.itemSchema.required &&
                    props.itemSchema.required.map((name: string) => (
                      <Td key={name}>
                        <Truncate content={item[name]} />
                      </Td>
                    ))}
                  <Td key="buttons" isActionCell>
                    <Tooltip content={`Delete ${props.name}`}>
                      <Button
                        data-testid={'metadata-delete-' + index + '-btn'}
                        icon={<TrashIcon />}
                        variant="link"
                        onClick={() => handleTrashClick(index)}
                      ></Button>
                    </Tooltip>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </InnerScrollContainer>
    </OuterScrollContainer>
  );
}

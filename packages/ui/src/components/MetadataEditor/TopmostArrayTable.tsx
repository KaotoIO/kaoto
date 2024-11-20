import { Button, EmptyState, EmptyStateBody, Truncate } from '@patternfly/react-core';
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
import './MetadataEditor.scss';

type TopmostArrayTableProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemSchema: any;
  name: string;
  selected: number;
  onSelected: (index: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        <Table aria-label={props.name} variant={TableVariant.compact} borders isStickyHeader>
          <Thead>
            <Tr>
              {props.itemSchema.required &&
                props.itemSchema.required.map((name: string) => (
                  <Th modifier={'nowrap'} key={name}>
                    {name.toUpperCase()}
                  </Th>
                ))}
              <Td modifier="nowrap" key="buttons" isActionCell>
                <Button
                  title={`Add new ${props.name}`}
                  data-testid={'metadata-add-' + props.name + '-btn'}
                  icon={<PlusCircleIcon />}
                  variant="link"
                  onClick={() => handleAddNew()}
                />
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
                        <Truncate content={item[name] ?? ''} />
                      </Td>
                    ))}
                  <Td key="buttons" isActionCell>
                    <Button
                      title={`Delete ${props.name}`}
                      data-testid={'metadata-delete-' + index + '-btn'}
                      icon={<TrashIcon />}
                      variant="link"
                      onClick={() => handleTrashClick(index)}
                    />
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

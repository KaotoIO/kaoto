import { PropertyRow } from './PropertyRow';
import { TdProps } from '@patternfly/react-table';
import { fireEvent, render, screen } from '@testing-library/react';

describe('PropertyRow.tsx', () => {
  test('render string property change name and value', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model: any = { foo: 'bar' };
    let onChangeModel = 0;
    const onCreatePlaceholder: boolean[] = [];
    const treeRow: TdProps['treeRow'] = {
      rowIndex: 0,
      onCollapse: () => {},
      props: {
        isRowSelected: true,
        isExpanded: false,
        isHidden: false,
        'aria-level': 0,
        'aria-posinset': 0,
        'aria-setsize': 0,
      },
    };
    render(
      <table>
        <tbody>
          <PropertyRow
            propertyName="beans"
            nodeName="foo"
            nodeValue="bar"
            path={['one', 'two']}
            parentModel={model}
            treeRow={treeRow}
            isObject={false}
            onChangeModel={() => onChangeModel++}
            createPlaceholder={(o) => onCreatePlaceholder.push(o)}
          />
        </tbody>
      </table>,
    );
    const propertyEditBtn = screen.getByTestId('beans-one-two-property-edit-foo-btn');
    fireEvent.click(propertyEditBtn);
    const valueInput = screen.getByTestId('beans-one-two-value-input');
    expect(valueInput).toHaveValue('bar');
    fireEvent.input(valueInput, { target: { value: 'barModified' } });
    const nameInput = screen.getByTestId('beans-one-two-name-input');
    expect(nameInput).toHaveValue('foo');
    fireEvent.input(nameInput, { target: { value: 'fooModified' } });
    const propertyEditConfirmBtn = screen.getByTestId('beans-one-two-property-edit-confirm-foo-btn');
    fireEvent.click(propertyEditConfirmBtn);
    expect(model.fooModified).toBe('barModified');
    expect(onChangeModel).toBe(1);
  });

  test('render string property delete', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model: any = { foo: 'bar' };
    let onChangeModel = 0;
    const onCreatePlaceholder: boolean[] = [];
    const treeRow: TdProps['treeRow'] = {
      rowIndex: 0,
      onCollapse: () => {},
      props: {
        isRowSelected: true,
        isExpanded: false,
        isHidden: false,
        'aria-level': 0,
        'aria-posinset': 0,
        'aria-setsize': 0,
      },
    };
    render(
      <table>
        <tbody>
          <PropertyRow
            propertyName="beans"
            nodeName="foo"
            nodeValue="bar"
            path={['one', 'two']}
            parentModel={model}
            treeRow={treeRow}
            isObject={false}
            onChangeModel={() => onChangeModel++}
            createPlaceholder={(o) => onCreatePlaceholder.push(o)}
          />
        </tbody>
      </table>,
    );
    const deleteBtn = screen.getByTestId('beans-one-two-delete-foo-btn');
    fireEvent.click(deleteBtn);
    expect(Object.keys(model).length).toBe(0);
    expect(onChangeModel).toBe(1);
  });

  test('render object property', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model: any = { foo: {} };
    let onChangeModel = 0;
    const onCreatePlaceholder: boolean[] = [];
    const treeRow: TdProps['treeRow'] = {
      rowIndex: 0,
      onCollapse: () => {},
      props: {
        isRowSelected: true,
        isExpanded: false,
        isHidden: false,
        'aria-level': 0,
        'aria-posinset': 0,
        'aria-setsize': 0,
      },
    };
    render(
      <table>
        <tbody>
          <PropertyRow
            propertyName="beans"
            nodeName="foo"
            nodeValue={{}}
            path={['one', 'two']}
            parentModel={model}
            treeRow={treeRow}
            isObject
            onChangeModel={() => onChangeModel++}
            createPlaceholder={(o) => onCreatePlaceholder.push(o)}
          />
        </tbody>
      </table>,
    );
    screen.getByTestId('properties-add-string-property-one-two-btn');
    screen.getByTestId('properties-add-object-property-one-two-btn');
  });
});

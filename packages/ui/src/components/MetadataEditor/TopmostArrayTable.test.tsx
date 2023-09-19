import { mockModel, mockSchema } from './TestUtil';
import { TopmostArrayTable } from './ToopmostArrayTable';
import { screen } from '@testing-library/dom';
import { fireEvent, render } from '@testing-library/react';

describe('TopmostArrayTable.tsx', () => {
  test('render empty state', () => {
    const model: any[] = [];
    let changedModel: any;
    let selected: number = -1;
    render(
      <TopmostArrayTable
        itemSchema={mockSchema.beans}
        model={model}
        name="beans"
        onChangeModel={(m) => (changedModel = m)}
        onSelected={(n) => (selected = n)}
        selected={0}
      />,
    );
    const deleteBtn = screen.queryByTestId('metadata-delete-0-btn');
    expect(deleteBtn).not.toBeInTheDocument();
    const btns = screen.getAllByTestId('metadata-add-beans-btn');
    expect(btns.length).toBe(2);
    fireEvent.click(btns[1]);
    expect(changedModel.length).toBe(1);
    expect(selected).toBe(0);
  });

  test('render beans', () => {
    let changedModel: any;
    let selected: number = -1;
    render(
      <TopmostArrayTable
        itemSchema={mockSchema.beans}
        model={mockModel.beans}
        name="beans"
        onChangeModel={(m) => (changedModel = m)}
        onSelected={(n) => (selected = n)}
        selected={0}
      />,
    );
    const btn = screen.getByTestId('metadata-delete-0-btn');
    fireEvent.click(btn);
    expect(changedModel.length).toBe(1);
    expect(selected).toBe(0);
  });
});

import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { FlowTypeSelector } from './FlowTypeSelector';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { sourceSchemaConfig, SourceSchemaType } from '../../../../models/camel';
import { CamelRouteVisualEntity } from '../../../../models/visualization/flows';
import { Schema } from '../../../../models';
import { EntitiesContextResult } from '../../../../hooks';

const config = sourceSchemaConfig;
config.config[SourceSchemaType.Integration].schema = { schema: { name: 'Integration', description: 'desc' } } as Schema;
config.config[SourceSchemaType.Pipe].schema = { schema: { name: 'Pipe', description: 'desc' } } as Schema;
config.config[SourceSchemaType.Kamelet].schema = { schema: { name: 'Kamelet', description: 'desc' } } as Schema;
config.config[SourceSchemaType.KameletBinding].schema = {
  name: 'kameletBinding',
  schema: { description: 'desc' },
} as Schema;
config.config[SourceSchemaType.Route].schema = { schema: { name: 'route', description: 'desc' } } as Schema;

let contextValue = {
  currentSchemaType: SourceSchemaType.Integration,
  visualEntities: [{ id: 'entity1' } as CamelRouteVisualEntity, { id: 'entity2' } as CamelRouteVisualEntity],
};

const onSelect = jest.fn();
const renderWithContext = () => {
  return render(
    <EntitiesContext.Provider value={contextValue as unknown as EntitiesContextResult}>
      <FlowTypeSelector onSelect={onSelect} />
    </EntitiesContext.Provider>,
  );
};
describe('FlowTypeSelector.tsx', () => {
  test('component renders', () => {
    const wrapper = renderWithContext();
    const toggle = wrapper.queryByTestId('dsl-list-dropdown');
    expect(toggle).toBeInTheDocument();
  });

  test('should call onSelect when clicking on the MenuToggleAction', async () => {
    const wrapper = renderWithContext();
    const toggle = await wrapper.findByTestId('dsl-list-btn');

    /** Click on button */
    act(() => {
      fireEvent.click(toggle);
    });

    waitFor(() => {
      expect(onSelect).toHaveBeenCalled();
    });
  });

  test('should disable the MenuToggleAction if the current DSL does not support multiple flows and there is an existing flow', async () => {
    contextValue = { ...contextValue, currentSchemaType: SourceSchemaType.KameletBinding };
    const wrapper = renderWithContext();
    const toggle = await wrapper.findByTestId('dsl-list-btn');

    waitFor(() => {
      expect(toggle).toBeDisabled();
    });
  });

  test('should toggle list of DSLs', async () => {
    const wrapper = renderWithContext();
    const toggle = await wrapper.findByTestId('dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    const element = wrapper.getByText('Integration');
    expect(element).toBeInTheDocument();

    /** Close Select */
    act(() => {
      fireEvent.click(toggle);
    });

    expect(element).not.toBeInTheDocument();
  });

  test('should show list of DSLs', async () => {
    const wrapper = renderWithContext();
    const toggle = await wrapper.findByTestId('dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    const element = await wrapper.findByText('Integration');
    expect(element).toBeInTheDocument();
  });

  test('should disable a SelectOption if is already selected and does not support multiple flows', async () => {
    contextValue = { ...contextValue, currentSchemaType: SourceSchemaType.KameletBinding };
    const wrapper = renderWithContext();
    const toggle = await wrapper.findByTestId('dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    const element = await wrapper.findByText('Kamelet Binding (single route only)');
    expect(element).toBeInTheDocument();

    const option = await wrapper.findByTestId('dsl-kameletBinding');
    expect(option).toHaveClass('pf-m-disabled');
  });

  test('should show selected value', async () => {
    const wrapper = renderWithContext();
    const toggle = await wrapper.findByTestId('dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    /** Click on first element */
    act(() => {
      const element = wrapper.getByText('Integration');
      fireEvent.click(element);
    });

    /** Open Select again */
    act(() => {
      fireEvent.click(toggle);
    });

    const element = await wrapper.findByRole('option', { selected: true });
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Integration');
  });

  test('should not have anything selected if "isStatic=true"', async () => {
    const wrapper = renderWithContext();
    const toggle = await wrapper.findByTestId('dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    /** Click on first element */
    act(() => {
      const element = wrapper.getByText('Integration');
      fireEvent.click(element);
    });

    /** Open Select again */
    act(() => {
      fireEvent.click(toggle);
    });

    waitFor(() => {
      const element = wrapper.queryByRole('option', { selected: true });
      expect(element).not.toBeInTheDocument();
    });
  });

  test('should have selected DSL if provided', async () => {
    const wrapper = renderWithContext();
    const toggle = await wrapper.findByTestId('dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    waitFor(() => {
      const element = wrapper.queryByRole('option', { selected: true });
      expect(element).toBeInTheDocument();
      expect(element).toHaveTextContent('Kamelet');
    });
  });

  test('should close Select when pressing ESC', async () => {
    contextValue = { ...contextValue, currentSchemaType: SourceSchemaType.Integration };
    const wrapper = renderWithContext();
    const toggle = await wrapper.findByTestId('dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    const menu = await wrapper.findByRole('listbox');

    expect(menu).toBeInTheDocument();

    /** Press Escape key to close the menu */
    act(() => {
      fireEvent.focus(menu);
      fireEvent.keyDown(menu, { key: 'Escape', code: 'Escape', charCode: 27 });
    });

    expect(menu).not.toBeInTheDocument();

    waitFor(() => {
      const element = wrapper.queryByRole('option', { selected: true });
      expect(element).toBeInTheDocument();
      expect(element).toHaveTextContent('Integration');
    });
  });

  test('should render children components', async () => {
    const wrapper = renderWithContext();

    waitFor(() => {
      const child = wrapper.getByText('This is a child component');
      expect(child).toBeInTheDocument();
    });
  });
});

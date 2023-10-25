import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { FlowTypeSelector } from './FlowTypeSelector';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { sourceSchemaConfig, SourceSchemaType } from '../../../../models/camel';
import { CamelRouteVisualEntity } from '../../../../models/visualization/flows';
import { Schema } from '../../../../models';
import { EntitiesContextResult } from '../../../../hooks';

const config = sourceSchemaConfig;
config.config[SourceSchemaType.Pipe].schema = { name: 'Pipe', schema: { name: 'Pipe', description: 'desc' } } as Schema;
config.config[SourceSchemaType.Route].schema = {
  name: 'route',
  schema: { name: 'route', description: 'desc' },
} as Schema;

const onSelect = jest.fn();
const FlowTypeSelectorWithContext: React.FunctionComponent<{ currentSchemaType?: SourceSchemaType }> = ({
  currentSchemaType,
}) => {
  return (
    <EntitiesContext.Provider
      value={
        {
          currentSchemaType: currentSchemaType ?? SourceSchemaType.Route,
          visualEntities: [{ id: 'entity1' } as CamelRouteVisualEntity, { id: 'entity2' } as CamelRouteVisualEntity],
        } as unknown as EntitiesContextResult
      }
    >
      <FlowTypeSelector onSelect={onSelect} />
    </EntitiesContext.Provider>
  );
};

describe('FlowTypeSelector.tsx', () => {
  test('component renders', () => {
    const wrapper = render(<FlowTypeSelectorWithContext />);
    const toggle = wrapper.queryByTestId('dsl-list-dropdown');
    expect(toggle).toBeInTheDocument();
  });

  test('should call onSelect when clicking on the MenuToggleAction', async () => {
    const wrapper = render(<FlowTypeSelectorWithContext />);
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
    const wrapper = render(<FlowTypeSelectorWithContext currentSchemaType={SourceSchemaType.KameletBinding} />);
    const toggle = await wrapper.findByTestId('dsl-list-btn');

    waitFor(() => {
      expect(toggle).toBeDisabled();
    });
  });

  test('should toggle list of DSLs', async () => {
    const wrapper = render(<FlowTypeSelectorWithContext />);
    const toggle = await wrapper.findByTestId('dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    const element = wrapper.getByText('Camel Route');
    expect(element).toBeInTheDocument();

    /** Close Select */
    act(() => {
      fireEvent.click(toggle);
    });

    expect(element).not.toBeInTheDocument();
  });

  test('should show list of DSLs', async () => {
    const wrapper = render(<FlowTypeSelectorWithContext />);
    const toggle = await wrapper.findByTestId('dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    const element = await wrapper.findByText('Camel Route');
    expect(element).toBeInTheDocument();
  });

  test('should disable a SelectOption if is already selected and does not support multiple flows', async () => {
    const wrapper = render(<FlowTypeSelectorWithContext currentSchemaType={SourceSchemaType.Pipe} />);
    const toggle = await wrapper.findByTestId('dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    const element = await wrapper.findByText('Pipe (single route only)');
    expect(element).toBeInTheDocument();

    const option = await wrapper.findByTestId('dsl-Pipe');
    expect(option).toHaveClass('pf-m-disabled');
  });

  test('should show selected value', async () => {
    const wrapper = render(<FlowTypeSelectorWithContext />);
    const toggle = await wrapper.findByTestId('dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    /** Click on first element */
    act(() => {
      const element = wrapper.getByText('Camel Route');
      fireEvent.click(element);
    });

    /** Open Select again */
    act(() => {
      fireEvent.click(toggle);
    });

    const element = await wrapper.findByRole('option', { selected: true });
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Camel Route');
  });

  test('should not have anything selected if "isStatic=true"', async () => {
    const wrapper = render(<FlowTypeSelectorWithContext />);
    const toggle = await wrapper.findByTestId('dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    /** Click on first element */
    act(() => {
      const element = wrapper.getByText('Camel Route');
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
    const wrapper = render(<FlowTypeSelectorWithContext />);
    const toggle = await wrapper.findByTestId('dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    waitFor(() => {
      const element = wrapper.queryByRole('option', { selected: true });
      expect(element).toBeInTheDocument();
      expect(element).toHaveTextContent('Pipe');
    });
  });

  test('should close Select when pressing ESC', async () => {
    const wrapper = render(<FlowTypeSelectorWithContext />);
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
      expect(element).toHaveTextContent('Camel Route');
    });
  });

  test('should render children components', async () => {
    const wrapper = render(<FlowTypeSelectorWithContext />);
    waitFor(() => {
      const child = wrapper.getByText('This is a child component');
      expect(child).toBeInTheDocument();
    });
  });
});

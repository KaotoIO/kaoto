import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { KaotoSchemaDefinition } from '../../../../models';
import { CamelRouteResource, sourceSchemaConfig, SourceSchemaType } from '../../../../models/camel';
import { CamelRouteVisualEntity } from '../../../../models/visualization/flows';
import { EntitiesContext, EntitiesContextResult } from '../../../../providers/entities.provider';
import { XmlCamelResourceSerializer } from '../../../../serializers';
import { FlowTypeSelector } from './FlowTypeSelector';

const config = sourceSchemaConfig;
config.config[SourceSchemaType.Pipe].schema = {
  name: 'Pipe',
  schema: { name: 'Pipe', description: 'desc' } as KaotoSchemaDefinition['schema'],
} as KaotoSchemaDefinition;
config.config[SourceSchemaType.Kamelet].schema = {
  name: 'Kamelet',
  schema: { name: 'Kamelet', description: 'desc' } as KaotoSchemaDefinition['schema'],
} as KaotoSchemaDefinition;
config.config[SourceSchemaType.Route].schema = {
  name: 'route',
  schema: { name: 'route', description: 'desc' } as KaotoSchemaDefinition['schema'],
} as KaotoSchemaDefinition;

const onSelect = jest.fn();
const FlowTypeSelectorWithContext: React.FunctionComponent<{
  currentSchemaType?: SourceSchemaType;
  xml?: boolean;
}> = ({ currentSchemaType, xml }) => {
  return (
    <EntitiesContext.Provider
      value={
        {
          currentSchemaType: currentSchemaType ?? SourceSchemaType.Route,
          visualEntities: [{ id: 'entity1' } as CamelRouteVisualEntity, { id: 'entity2' } as CamelRouteVisualEntity],
          camelResource: new CamelRouteResource(undefined, xml ? new XmlCamelResourceSerializer() : undefined),
        } as unknown as EntitiesContextResult
      }
    >
      <FlowTypeSelector onSelect={onSelect} />
    </EntitiesContext.Provider>
  );
};

describe('FlowTypeSelector.tsx', () => {
  it('component renders', async () => {
    await act(async () => {
      render(<FlowTypeSelectorWithContext />);
    });

    waitFor(() => {
      const toggle = screen.queryByTestId('viz-dsl-list-dropdown');
      expect(toggle).toBeInTheDocument();
    });
  });

  it('should call onSelect when clicking on the MenuToggleAction', async () => {
    await act(async () => {
      render(<FlowTypeSelectorWithContext />);
    });

    const toggle = await screen.findByTestId('dsl-list-btn');

    /** Click on button */
    act(() => {
      fireEvent.click(toggle);
    });

    waitFor(() => {
      expect(onSelect).toHaveBeenCalled();
    });
  });

  it('should disable the MenuToggleAction if the current DSL does not support multiple flows and there is an existing flow', async () => {
    const wrapper = render(<FlowTypeSelectorWithContext currentSchemaType={SourceSchemaType.KameletBinding} />);
    const toggle = await wrapper.findByTestId('dsl-list-btn');

    waitFor(() => {
      expect(toggle).toBeDisabled();
    });
  });

  it('should toggle list of DSLs', async () => {
    const wrapper = render(<FlowTypeSelectorWithContext />);
    const toggle = await wrapper.findByTestId('viz-dsl-list-dropdown');

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

  it('should show list of DSLs', async () => {
    const wrapper = render(<FlowTypeSelectorWithContext />);
    const toggle = await wrapper.findByTestId('viz-dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    let element = await wrapper.findByText('Kamelet');
    expect(element).toBeInTheDocument();
    element = await wrapper.findByText('Camel Route');
    expect(element).toBeInTheDocument();
  });

  it('should show only Camel Route when XML serializer is in place', async () => {
    const wrapper = render(<FlowTypeSelectorWithContext xml={true} />);
    const toggle = await wrapper.findByTestId('viz-dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    let element = wrapper.queryByText('Kamelet');
    expect(element).toBeNull();
    element = wrapper.queryByText('Camel Route');
    expect(element).toBeInTheDocument();
  });

  it('should disable a SelectOption if is already selected and does not support multiple flows', async () => {
    const wrapper = render(<FlowTypeSelectorWithContext currentSchemaType={SourceSchemaType.Pipe} />);
    const toggle = await wrapper.findByTestId('viz-dsl-list-dropdown');

    /** Open Select */
    act(() => {
      fireEvent.click(toggle);
    });

    const element = await wrapper.findByText('Pipe (single route only)');
    expect(element).toBeInTheDocument();

    const option = await wrapper.findByTestId('dsl-Pipe');
    expect(option).toHaveClass('pf-m-disabled');
  });

  it('should show selected value', async () => {
    const wrapper = render(<FlowTypeSelectorWithContext />);
    const toggle = await wrapper.findByTestId('viz-dsl-list-dropdown');

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

  it('should not have anything selected if "isStatic=true"', async () => {
    const wrapper = render(<FlowTypeSelectorWithContext />);
    const toggle = await wrapper.findByTestId('viz-dsl-list-dropdown');

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

  it('should have selected DSL if provided', async () => {
    const wrapper = render(<FlowTypeSelectorWithContext />);
    const toggle = await wrapper.findByTestId('viz-dsl-list-dropdown');

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

  it('should close Select when pressing ESC', async () => {
    const wrapper = render(<FlowTypeSelectorWithContext />);
    const toggle = await wrapper.findByTestId('viz-dsl-list-dropdown');

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

    waitFor(() => {
      /** The close panel is an async process */
      expect(menu).not.toBeInTheDocument();
    });

    waitFor(() => {
      const element = wrapper.queryByRole('option', { selected: true });
      expect(element).toBeInTheDocument();
      expect(element).toHaveTextContent('Camel Route');
    });
  });

  it('should render children components', async () => {
    const wrapper = render(<FlowTypeSelectorWithContext />);
    waitFor(() => {
      const child = wrapper.getByText('This is a child component');
      expect(child).toBeInTheDocument();
    });
  });
});

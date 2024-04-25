import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { FunctionComponent } from 'react';
import { EntitiesContextResult } from '../../../../../hooks';
import { KaotoSchemaDefinition } from '../../../../../models';
import { SourceSchemaType, sourceSchemaConfig } from '../../../../../models/camel';
import { EntitiesContext } from '../../../../../providers/entities.provider';
import { DSLSelectorToggle } from './DSLSelectorToggle';

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

describe('DSLSelectorToggle.tsx', () => {
  let onSelect: () => void;
  beforeEach(() => {
    onSelect = jest.fn();
  });

  const DSLSelectorWithContext: FunctionComponent<{ currentSchemaType?: SourceSchemaType }> = (props) => {
    const currentSchemaType = props.currentSchemaType ?? SourceSchemaType.Route;
    return (
      <EntitiesContext.Provider key={Date.now()} value={{ currentSchemaType } as unknown as EntitiesContextResult}>
        <DSLSelectorToggle onSelect={onSelect} />
      </EntitiesContext.Provider>
    );
  };

  it('component renders', () => {
    const wrapper = render(<DSLSelectorWithContext />);
    const toggle = wrapper.queryByTestId('dsl-list-dropdown');
    expect(toggle).toBeInTheDocument();
  });

  it('should call onSelect when clicking on the MenuToggleAction', async () => {
    const wrapper = render(<DSLSelectorWithContext />);

    /** Click on toggle */
    const toggle = await wrapper.findByTestId('dsl-list-dropdown');
    act(() => {
      fireEvent.click(toggle);
    });

    /** Click on first element */
    const element = await wrapper.findByText('Pipe');
    act(() => {
      fireEvent.click(element);
    });

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalled();
    });
  });

  it('should disable the MenuToggleAction if the DSL is already selected', async () => {
    const wrapper = render(<DSLSelectorWithContext currentSchemaType={SourceSchemaType.Route} />);

    /** Click on toggle */
    const toggle = await wrapper.findByTestId('dsl-list-dropdown');
    act(() => {
      fireEvent.click(toggle);
    });

    /** Click on first element */
    const element = await wrapper.findByText('Camel Route');
    // act(() => {
    //   fireEvent.click(element);
    // });

    waitFor(() => {
      expect(element).toBeDisabled();
    });
  });

  it('should toggle list of DSLs', async () => {
    const wrapper = render(<DSLSelectorWithContext />);
    const toggle = await wrapper.findByTestId('dsl-list-dropdown');

    /** Click on toggle */
    act(() => {
      fireEvent.click(toggle);
    });

    const element = await wrapper.findByText('Pipe');
    expect(element).toBeInTheDocument();

    /** Close Select */
    act(() => {
      fireEvent.click(toggle);
    });

    waitFor(() => {
      expect(element).not.toBeInTheDocument();
    });
  });

  it('should show selected value', async () => {
    const wrapper = render(<DSLSelectorWithContext />);
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

  it('should have selected DSL if provided', async () => {
    const wrapper = render(<DSLSelectorWithContext />);
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

  it('should close Select when pressing ESC', async () => {
    const wrapper = render(<DSLSelectorWithContext />);
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
});

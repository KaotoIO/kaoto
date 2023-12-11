import { useSchemasStore } from '../../../store';

import { BeanReferenceField } from './BeanReferenceField';
import { fireEvent, render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import * as beansSchema from '@kaoto-next/camel-catalog/camelYamlDsl-beans.json';
import { EntitiesContext } from '../../../providers';
import { EntitiesContextResult } from '../../../hooks';
import { BeansEntity } from '../../../models/visualization/metadata';
import { act } from 'react-dom/test-utils';

jest.mock('uniforms', () => {
  const uniforms = jest.requireActual('uniforms');

  return {
    ...uniforms,
    createAutoField: (fn: () => void) => fn,
    connectField: (fn: () => void) => fn,
  };
});

useSchemasStore.setState({
  schemas: { beans: { name: 'beans', tags: [], version: '0', uri: '', schema: beansSchema } },
});

const beans = {
  beans: [
    {
      name: 'myDataSource',
      type: 'org.apache.commons.dbcp.BasicDataSource',
    },
    {
      name: 'myBean',
      type: 'io.kaoto.MyBean',
    },
  ],
};

const beansEntity = new BeansEntity(beans);
const contextValue = {
  camelResource: {
    getEntities: () => {
      return [beansEntity];
    },
  },
} as unknown as EntitiesContextResult;

describe('BeanReferenceField', () => {
  const mockOnChange = jest.fn();
  const fieldProperties = {
    value: '#myDataSource',
    onChange: mockOnChange,
    field: {
      title: 'some field title',
      $comment: 'class:javax.sql.DataSource',
    },
  };

  beforeAll(() => {
    mockOnChange.mockClear();
  });

  it('should render', async () => {
    await act(async () => {
      render(
        <EntitiesContext.Provider value={contextValue}>
          <BeanReferenceField name="test" label="Bean reference field label" {...fieldProperties} />
        </EntitiesContext.Provider>,
      );
    });
    let options = screen.queryAllByRole('option');
    expect(options).toHaveLength(0);
    const toggleButton = screen.getByRole('button', { name: 'Menu toggle' });
    await act(async () => {
      fireEvent.click(toggleButton);
    });
    options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    const selectedOption = screen.getByRole('option', { selected: true });
    expect(selectedOption).toHaveTextContent('myDataSource');
  });

  it('should update model if the other is selected', async () => {
    await act(async () => {
      render(
        <EntitiesContext.Provider value={contextValue}>
          <BeanReferenceField name="test" label="Bean reference field label" {...fieldProperties} />
        </EntitiesContext.Provider>,
      );
    });
    const toggleButton = screen.getByRole('button', { name: 'Menu toggle' });
    await act(async () => {
      fireEvent.click(toggleButton);
    });
    const myBeanOption = screen.getAllByRole('option').filter((option) => option.innerHTML.includes('myBean'));
    expect(myBeanOption).toHaveLength(1);
    expect(mockOnChange.mock.calls).toHaveLength(0);
    act(() => {
      fireEvent.click(myBeanOption[0]);
    });
    expect(mockOnChange.mock.calls).toHaveLength(1);
    expect(mockOnChange.mock.calls[0][0]).toEqual('#myBean');
  });

  it("should update model even if there's no bean", async () => {
    await act(async () => {
      render(
        <EntitiesContext.Provider value={contextValue}>
          <BeanReferenceField name="test" label="Bean reference field label" {...fieldProperties} />
        </EntitiesContext.Provider>,
      );
    });
    const textbox = screen.getByRole('combobox');
    expect(mockOnChange.mock.calls).toHaveLength(0);
    await act(async () => {
      fireEvent.input(textbox, { target: { value: '#notExistingBean' } });
    });
    expect(mockOnChange.mock.calls).toHaveLength(1);
    expect(mockOnChange.mock.calls[0][0]).toEqual('#notExistingBean');
  });

  it('should filter options when typing', async () => {
    await act(async () => {
      render(
        <EntitiesContext.Provider value={contextValue}>
          <BeanReferenceField name="test" label="Bean reference field label" {...fieldProperties} />
        </EntitiesContext.Provider>,
      );
    });
    const textbox = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.input(textbox, { target: { value: 'myB' } });
    });
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options.filter((o) => o.innerHTML.includes('myDataSource'))).toHaveLength(0);
    expect(options.filter((o) => o.innerHTML.includes('myBean'))).toHaveLength(1);
    expect(options.filter((o) => o.innerHTML.includes('Create new bean "myB"'))).toHaveLength(1);
  });

  it.skip('should render a modal', async () => {
    await act(async () => {
      render(
        <EntitiesContext.Provider value={contextValue}>
          <BeanReferenceField name="test" label="Bean reference field label" {...fieldProperties} />
        </EntitiesContext.Provider>,
      );
    });
    const toggleButton = screen.getByRole('button', { name: 'Menu toggle' });
    await act(async () => {
      fireEvent.click(toggleButton);
    });
    const createNewOption = screen.getAllByRole('option').filter((option) => option.textContent === 'Create new bean');
    expect(createNewOption).toHaveLength(1);
    await act(async () => {
      //  TypeError: Cannot read properties of undefined (reading 'Provider')
      //   at Component (/home/toigaras/workspace/Kaoto/kaoto-next/packages/ui/src/components/Form/CustomAutoForm.tsx:38:41)
      fireEvent.click(createNewOption[0]);
    });
  });
});

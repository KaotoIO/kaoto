import * as beansSchema from '@kaoto-next/camel-catalog/camelYamlDsl-beans.json';
import { AutoField, AutoForm } from '@kaoto-next/uniforms-patternfly';
import { screen } from '@testing-library/dom';
import { fireEvent, render } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { EntitiesContextResult } from '../../../hooks';
import { BeansEntity } from '../../../models/visualization/metadata';
import { EntitiesContext } from '../../../providers';
import { useSchemasStore } from '../../../store';
import { CustomAutoFieldDetector } from '../CustomAutoField';
import { SchemaService } from '../schema.service';
import { BeanReferenceField } from './BeanReferenceField';
import { BeansAwareResource, CamelRouteResource } from '../../../models/camel';

useSchemasStore.setState({
  schemas: { beans: { name: 'beans', tags: [], version: '0', uri: '', schema: beansSchema } },
});

describe('BeanReferenceField', () => {
  const mockSchema = {
    title: 'Single Bean',
    description: 'Single Bean Configuration',
    type: 'object',
    additionalProperties: false,
    properties: {
      beanName: {
        $comment: 'class:javax.sql.DataSource',
        type: 'string',
        description: 'Bean name',
      },
    },
  };
  const schemaService = new SchemaService();
  const schemaBridge = schemaService.getSchemaBridge(mockSchema);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function doGetContextValue(beans?: any) {
    const camelResource = new CamelRouteResource();
    if (beans) {
      const beansEntity = (camelResource as BeansAwareResource).createBeansEntity();
      beansEntity.parent = beans;
    }
    return { camelResource: camelResource } as unknown as EntitiesContextResult;
  }

  function getContextValue() {
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
    return doGetContextValue(beans);
  }

  function getContextWithoutBeans() {
    return doGetContextValue();
  }

  it('should render', async () => {
    await act(async () => {
      render(
        <EntitiesContext.Provider value={getContextValue()}>
          <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
            <AutoForm schema={schemaBridge} model={{}}>
              <BeanReferenceField name="beanName" label="Bean reference field label" {...fieldProperties} />
            </AutoForm>
          </AutoField.componentDetectorContext.Provider>
        </EntitiesContext.Provider>,
      );
    });
    let options = screen.queryAllByRole('option');
    expect(options).toHaveLength(0);

    await act(async () => {
      const toggleButton = screen.getByRole('button', { name: 'Menu toggle' });
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
        <EntitiesContext.Provider value={getContextValue()}>
          <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
            <AutoForm schema={schemaBridge} model={{}}>
              <BeanReferenceField name="beanName" label="Bean reference field label" {...fieldProperties} />
            </AutoForm>
          </AutoField.componentDetectorContext.Provider>
        </EntitiesContext.Provider>,
      );
    });

    await act(async () => {
      const toggleButton = screen.getByRole('button', { name: 'Menu toggle' });
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
        <EntitiesContext.Provider value={getContextValue()}>
          <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
            <AutoForm schema={schemaBridge} model={{}}>
              <BeanReferenceField name="beanName" label="Bean reference field label" {...fieldProperties} />
            </AutoForm>
          </AutoField.componentDetectorContext.Provider>
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
        <EntitiesContext.Provider value={getContextValue()}>
          <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
            <AutoForm schema={schemaBridge} model={{}}>
              <BeanReferenceField name="beanName" label="Bean reference field label" {...fieldProperties} />
            </AutoForm>
          </AutoField.componentDetectorContext.Provider>
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

  it('should render a modal', async () => {
    await act(async () => {
      render(
        <EntitiesContext.Provider value={getContextValue()}>
          <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
            <AutoForm schema={schemaBridge} model={{}}>
              <BeanReferenceField name="beanName" label="Bean reference field label" {...fieldProperties} />
            </AutoForm>
          </AutoField.componentDetectorContext.Provider>
        </EntitiesContext.Provider>,
      );
    });

    await act(async () => {
      const toggleButton = screen.getByRole('button', { name: 'Menu toggle' });
      fireEvent.click(toggleButton);
    });

    const createNewOption = screen.getAllByRole('option').filter((option) => option.textContent === 'Create new bean');
    expect(createNewOption).toHaveLength(1);

    await act(async () => {
      fireEvent.click(createNewOption[0]);
    });

    await act(async () => {
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });
  });

  it('should render a modal with bean name, then creating one fills the reference', async () => {
    const contextValue = getContextValue();
    await act(async () => {
      render(
        <EntitiesContext.Provider value={contextValue}>
          <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
            <AutoForm schema={schemaBridge} model={{}}>
              <BeanReferenceField name="beanName" label="Bean reference field label" {...fieldProperties} />
            </AutoForm>
          </AutoField.componentDetectorContext.Provider>
        </EntitiesContext.Provider>,
      );
    });

    const textbox = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.input(textbox, { target: { value: 'myNewBean' } });
    });

    const createNewOption = screen
      .getAllByRole('option')
      .filter((option) => option.textContent?.includes('Create new bean'));
    expect(createNewOption).toHaveLength(1);
    await act(async () => {
      fireEvent.click(createNewOption[0]);
    });

    const nameInput = screen.getAllByRole('textbox').filter((i) => i.getAttribute('label') === 'Name');
    expect(nameInput).toHaveLength(1);
    expect(nameInput[0]).toHaveValue('myNewBean');
    const typeInput = screen.getAllByRole('textbox').filter((i) => i.getAttribute('label') === 'Type');
    expect(typeInput).toHaveLength(1);
    await act(async () => {
      fireEvent.input(typeInput[0], { target: { value: 'io.kaoto.new.MyNewBean' } });
    });

    const createButton = screen.getAllByRole('button').filter((b) => b.textContent === 'Create');
    expect(createButton).toHaveLength(1);
    await act(async () => {
      fireEvent.click(createButton[0]);
    });

    expect(screen.queryByRole('dialog')).toBeNull();
    const textbox2 = screen.getByRole('combobox');
    expect(textbox2.getAttribute('value')).toEqual('#myNewBean');
    const entity = contextValue.camelResource.getEntities()[0] as BeansEntity;
    expect(Object.keys(entity.parent.beans).length).toBe(3);
  });

  it("should render a modal with bean name, then creating one fills the reference even if beans entity doesn't exist", async () => {
    const contextValue = getContextWithoutBeans();
    await act(async () => {
      render(
        <EntitiesContext.Provider value={contextValue}>
          <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
            <AutoForm schema={schemaBridge} model={{}}>
              <BeanReferenceField name="beanName" label="Bean reference field label" {...fieldProperties} />
            </AutoForm>
          </AutoField.componentDetectorContext.Provider>
        </EntitiesContext.Provider>,
      );
    });

    const textbox = screen.getByRole('combobox');
    await act(async () => {
      fireEvent.input(textbox, { target: { value: 'myNewBean' } });
    });

    const createNewOption = screen
      .getAllByRole('option')
      .filter((option) => option.textContent?.includes('Create new bean'));
    expect(createNewOption).toHaveLength(1);
    await act(async () => {
      fireEvent.click(createNewOption[0]);
    });

    const nameInput = screen.getAllByRole('textbox').filter((i) => i.getAttribute('label') === 'Name');
    expect(nameInput).toHaveLength(1);
    expect(nameInput[0]).toHaveValue('myNewBean');
    const typeInput = screen.getAllByRole('textbox').filter((i) => i.getAttribute('label') === 'Type');
    expect(typeInput).toHaveLength(1);
    await act(async () => {
      fireEvent.input(typeInput[0], { target: { value: 'io.kaoto.new.MyNewBean' } });
    });

    const createButton = screen.getAllByRole('button').filter((b) => b.textContent === 'Create');
    expect(createButton).toHaveLength(1);
    await act(async () => {
      fireEvent.click(createButton[0]);
    });

    expect(screen.queryByRole('dialog')).toBeNull();
    const textbox2 = screen.getByRole('combobox');
    expect(textbox2.getAttribute('value')).toEqual('#myNewBean');
    const entity = contextValue.camelResource.getEntities()[0] as BeansEntity;
    expect(Object.keys(entity.parent.beans).length).toBe(1);
  });
});

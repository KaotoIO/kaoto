import { CatalogLibrary } from '@kaoto/camel-catalog/catalog-index.d.ts';
import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CamelCatalogService, CatalogKind, KaotoSchemaDefinition } from '../../../../../models';
import { TestProvidersWrapper } from '../../../../../stubs';
import { getFirstCatalogMap } from '../../../../../stubs/test-load-catalog';
import { ROOT_PATH } from '../../../../../utils';
import { ModelContextProvider } from '../providers/ModelProvider';
import { SchemaProvider } from '../providers/SchemaProvider';
import { KaotoFormPageObject } from '../testing/KaotoFormPageObject';
import { BeanField } from './BeanField';

describe('BeanField', () => {
  const schema: KaotoSchemaDefinition['schema'] = { title: 'Bean', type: 'string' };

  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);
  });

  it('should render', () => {
    const { Provider } = TestProvidersWrapper();

    const { container } = render(
      <Provider>
        <ModelContextProvider model="#dataSource" onPropertyChange={jest.fn()}>
          <BeanField propName={ROOT_PATH} />
        </ModelContextProvider>
      </Provider>,
    );

    expect(container).toMatchSnapshot();
  });

  it('should set the appropriate placeholder', () => {
    const { Provider } = TestProvidersWrapper();

    const wrapper = render(
      <Provider>
        <ModelContextProvider model={undefined} onPropertyChange={jest.fn()}>
          <SchemaProvider schema={{ type: 'string', default: 'Default Value' }}>
            <BeanField propName={ROOT_PATH} />
          </SchemaProvider>
        </ModelContextProvider>
      </Provider>,
    );

    const input = wrapper.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Default Value');
  });

  it('should clear the input when using the clear button', async () => {
    const onPropertyChangeSpy = jest.fn();
    const { Provider } = TestProvidersWrapper();

    render(
      <Provider>
        <ModelContextProvider model="#dataSource" onPropertyChange={onPropertyChangeSpy}>
          <BeanField propName={ROOT_PATH} />
        </ModelContextProvider>
      </Provider>,
    );

    const formPageObject = new KaotoFormPageObject(screen, act);
    await formPageObject.clearForProperty(ROOT_PATH);

    expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, undefined);
  });

  it('should show the new bean modal when creating a new bean', async () => {
    const onPropertyChangeSpy = jest.fn();
    const { Provider } = TestProvidersWrapper();

    render(
      <Provider>
        <SchemaProvider schema={schema}>
          <ModelContextProvider model={undefined} onPropertyChange={onPropertyChangeSpy}>
            <BeanField propName={ROOT_PATH} />
          </ModelContextProvider>
        </SchemaProvider>
      </Provider>,
    );

    const formPageObject = new KaotoFormPageObject(screen, act);
    await formPageObject.toggleTypeaheadFieldForProperty(ROOT_PATH);
    await formPageObject.inputText('Bean', 'MY_BEAN');
    await formPageObject.selectTypeaheadItem('create-new-with-name');

    const beanModal = screen.getByTestId('NewBeanModal-MY_BEAN');

    expect(beanModal).toBeInTheDocument();
  });

  describe('Typing a bean name and selecting "create new bean"', () => {
    let onPropertyChangeSpy: jest.Mock;
    let formPageObject: KaotoFormPageObject;

    beforeEach(async () => {
      onPropertyChangeSpy = jest.fn();

      const { Provider } = TestProvidersWrapper();

      render(
        <Provider>
          <SchemaProvider schema={schema}>
            <ModelContextProvider model={undefined} onPropertyChange={onPropertyChangeSpy}>
              <BeanField propName={ROOT_PATH} />
            </ModelContextProvider>
          </SchemaProvider>
        </Provider>,
      );

      formPageObject = new KaotoFormPageObject(screen, act);
    });

    const createBean = async (name: string) => {
      await formPageObject.toggleTypeaheadFieldForProperty(ROOT_PATH);
      await formPageObject.inputText('Bean', name);
      await formPageObject.selectTypeaheadItem('create-new-with-name');
    };

    const clickCreateButton = async () => {
      const [createButton] = screen.getAllByRole('button').filter((b) => b.textContent === 'Create');
      await act(async () => {
        fireEvent.click(createButton);
      });
    };

    it('should allow user to create a new bean', async () => {
      await createBean('myNewBean');

      const [nameInput] = screen.getAllByLabelText('Name');
      expect(nameInput).toHaveValue('myNewBean');

      await formPageObject.inputText('Type', 'io.kaoto.new.MyNewBean');
      await clickCreateButton();

      expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
      expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, '#myNewBean');
      expect(screen.queryByTestId('NewBeanModal-myNewBean')).not.toBeInTheDocument();
    });

    it('should refresh the bean list after creating a new bean', async () => {
      await createBean('myNewBean');
      await formPageObject.inputText('Type', 'io.kaoto.new.MyNewBean');
      await clickCreateButton();

      await formPageObject.clearForProperty(ROOT_PATH);
      await createBean('anotherBean');
      await formPageObject.inputText('Type', 'io.kaoto.new.AnotherBean');
      await clickCreateButton();

      await formPageObject.clearForProperty(ROOT_PATH);
      await formPageObject.toggleTypeaheadFieldForProperty(ROOT_PATH);

      const beanOptions = screen.getAllByRole('option');

      expect(beanOptions).toHaveLength(3);
      expect(beanOptions[0]).toHaveTextContent('myNewBean');
      expect(beanOptions[1]).toHaveTextContent('anotherBean');
      expect(beanOptions[2]).toHaveTextContent('Create new bean');
    });

    it('should not update the BeanField when closing the modal', async () => {
      await createBean('myNewBean');

      const [cancelButton] = screen.getAllByRole('button').filter((b) => b.textContent === 'Cancel');
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      expect(onPropertyChangeSpy).not.toHaveBeenCalled();
      expect(screen.queryByTestId('NewBeanModal-myNewBean')).not.toBeInTheDocument();
    });

    it('should not allow to create a bean without a type', async () => {
      await createBean('myNewBean');

      const clearTypeField = screen.getByRole('button', { name: /clear type field/i });
      await act(async () => {
        fireEvent.click(clearTypeField);
      });

      const [createButton] = screen.getAllByRole('button').filter((b) => b.textContent === 'Create');
      await act(async () => {
        fireEvent.click(createButton);
      });

      expect(onPropertyChangeSpy).not.toHaveBeenCalled();
      expect(screen.queryByTestId('NewBeanModal-myNewBean')).toBeInTheDocument();
    });
  });
});

import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { ModelContextProvider, SchemaProvider } from '@kaoto/forms';
import { KaotoFormPageObject } from '@kaoto/forms/testing';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FunctionComponent, ReactElement } from 'react';

import { useEntityContext } from '../../../../../../hooks/useEntityContext/useEntityContext';
import { CamelCatalogService, CatalogKind, KaotoSchemaDefinition } from '../../../../../../models';
import { BeansEntity } from '../../../../../../models/visualization/metadata';
import { EntitiesContextResult } from '../../../../../../providers';
import { DocumentationService } from '../../../../../../services/documentation.service';
import { TestProvidersWrapper } from '../../../../../../stubs';
import { getFirstCatalogMap } from '../../../../../../stubs/test-load-catalog';
import { IVisibleFlows, ROOT_PATH } from '../../../../../../utils';
import { DataSourceBeanField, PrefixedBeanField, UnprefixedBeanField } from './BeanField';

describe('BeanField', () => {
  let onPropertyChangeSpy: jest.Mock;
  let formPageObject: KaotoFormPageObject;

  const beanSchema: KaotoSchemaDefinition['schema'] = { title: 'Bean', type: 'string' };
  const refSchema: KaotoSchemaDefinition['schema'] = { title: 'Ref', type: 'string' };
  const beanReferenceSchema: KaotoSchemaDefinition['schema'] = { title: 'Bean Reference', type: 'string' };

  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);

    onPropertyChangeSpy = jest.fn();
    cleanup();
  });

  const createBeanInComponent = async (
    component: ReactElement,
    beanName: string,
    schemaTitle: string,
    schema: KaotoSchemaDefinition['schema'],
  ) => {
    const { Provider } = TestProvidersWrapper();

    render(
      <Provider>
        <SchemaProvider schema={schema}>
          <ModelContextProvider model={undefined} onPropertyChange={onPropertyChangeSpy}>
            {component}
          </ModelContextProvider>
        </SchemaProvider>
      </Provider>,
    );

    formPageObject = new KaotoFormPageObject(screen, act);

    await formPageObject.toggleTypeaheadFieldForProperty(ROOT_PATH);
    await formPageObject.inputText(schemaTitle, beanName);
    await formPageObject.selectTypeaheadItem('create-new-with-name');

    await formPageObject.inputText('Type', 'io.kaoto.test.TestBean');

    const createButton = screen.getAllByRole('button').find((b) => b.textContent === 'Create');
    await act(async () => {
      fireEvent.click(createButton!);
    });
  };

  const createBean = async (name: string, schemaTitle: string) => {
    await formPageObject.toggleTypeaheadFieldForProperty(ROOT_PATH);
    await formPageObject.inputText(schemaTitle, name);
    await formPageObject.selectTypeaheadItem('create-new-with-name');
  };

  const clickCreateButton = async () => {
    const createButton = screen.getAllByRole('button').find((b) => b.textContent === 'Create');
    await act(async () => {
      fireEvent.click(createButton!);
    });
  };

  describe('PrefixedBeanField', () => {
    it('should render', () => {
      const { Provider } = TestProvidersWrapper();

      const { container } = render(
        <Provider>
          <ModelContextProvider model="#dataSource" onPropertyChange={jest.fn()}>
            <PrefixedBeanField propName={ROOT_PATH} />
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
              <PrefixedBeanField propName={ROOT_PATH} />
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
            <PrefixedBeanField propName={ROOT_PATH} />
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
          <SchemaProvider schema={beanSchema}>
            <ModelContextProvider model={undefined} onPropertyChange={onPropertyChangeSpy}>
              <PrefixedBeanField propName={ROOT_PATH} />
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
  });

  describe('Typing a bean name and selecting "create new bean"', () => {
    beforeEach(async () => {
      onPropertyChangeSpy = jest.fn();

      const { Provider } = TestProvidersWrapper();

      render(
        <Provider>
          <SchemaProvider schema={beanSchema}>
            <ModelContextProvider model={undefined} onPropertyChange={onPropertyChangeSpy}>
              <PrefixedBeanField propName={ROOT_PATH} />
            </ModelContextProvider>
          </SchemaProvider>
        </Provider>,
      );

      formPageObject = new KaotoFormPageObject(screen, act);
    });

    it('should allow user to create a new bean', async () => {
      await createBean('myNewBean', 'Bean');

      const [nameInput] = screen.getAllByLabelText('Name');
      expect(nameInput).toHaveValue('myNewBean');

      await formPageObject.inputText('Type', 'io.kaoto.new.MyNewBean');
      await clickCreateButton();

      expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
      expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, '#myNewBean');
      expect(screen.queryByTestId('NewBeanModal-myNewBean')).not.toBeInTheDocument();
    });

    it('should refresh the bean list after creating a new bean', async () => {
      await createBean('myNewBean', 'Bean');
      await formPageObject.inputText('Type', 'io.kaoto.new.MyNewBean');
      await clickCreateButton();

      await formPageObject.clearForProperty(ROOT_PATH);
      await createBean('anotherBean', 'Bean');
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
      await createBean('myNewBean', 'Bean');

      const cancelButton = screen.getAllByRole('button').find((b) => b.textContent === 'Cancel');
      await act(async () => {
        fireEvent.click(cancelButton!);
      });

      expect(onPropertyChangeSpy).not.toHaveBeenCalled();
      expect(screen.queryByTestId('NewBeanModal-myNewBean')).not.toBeInTheDocument();
    });

    it('should not allow to create a bean without a type', async () => {
      await createBean('myNewBean', 'Bean');

      const fieldActions = screen.getByTestId(`#.type__field-actions`);
      fireEvent.click(fieldActions);

      const clearButton = await screen.findByRole('menuitem', { name: /Clear type field/i });
      fireEvent.click(clearButton);

      const createButton = screen.getAllByRole('button').find((b) => b.textContent === 'Create');
      await act(async () => {
        fireEvent.click(createButton!);
      });

      expect(onPropertyChangeSpy).not.toHaveBeenCalled();
      expect(screen.queryByTestId('NewBeanModal-myNewBean')).toBeInTheDocument();
    });

    it('should appear in document export when bean is added', async () => {
      let entitiesContext: EntitiesContextResult | null = null;
      const CaptureEntitiesWrapper: FunctionComponent = () => {
        entitiesContext = useEntityContext();
        return <PrefixedBeanField propName={ROOT_PATH} />;
      };

      const { Provider } = TestProvidersWrapper();
      cleanup();
      render(
        <Provider>
          <SchemaProvider schema={beanSchema}>
            <ModelContextProvider model={undefined} onPropertyChange={onPropertyChangeSpy}>
              <CaptureEntitiesWrapper />
            </ModelContextProvider>
          </SchemaProvider>
        </Provider>,
      );
      formPageObject = new KaotoFormPageObject(screen, act);

      await createBean('myNewBean', 'Bean');
      const [nameInput] = screen.getAllByLabelText('Name');
      expect(nameInput).toHaveValue('myNewBean');

      await formPageObject.inputText('Type', 'io.kaoto.new.MyNewBean');
      await clickCreateButton();

      const visibleFlows = entitiesContext!.camelResource.getVisualEntities().reduce((acc, entity) => {
        acc[entity.id] = true;
        return acc;
      }, {} as IVisibleFlows);
      const entities = DocumentationService.getDocumentationEntities(entitiesContext!.camelResource, visibleFlows);
      expect(entities.length).toBe(2);
      expect(entities.find((e) => e.entity instanceof BeansEntity)).toBeDefined();
    });
  });

  describe('UnprefixedBeanField', () => {
    it('should render', () => {
      const { Provider } = TestProvidersWrapper();

      const { container } = render(
        <Provider>
          <ModelContextProvider model="dataSource" onPropertyChange={jest.fn()}>
            <UnprefixedBeanField propName={ROOT_PATH} />
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
              <UnprefixedBeanField propName={ROOT_PATH} />
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
          <ModelContextProvider model="dataSource" onPropertyChange={onPropertyChangeSpy}>
            <UnprefixedBeanField propName={ROOT_PATH} />
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
          <SchemaProvider schema={refSchema}>
            <ModelContextProvider model={undefined} onPropertyChange={onPropertyChangeSpy}>
              <UnprefixedBeanField propName={ROOT_PATH} />
            </ModelContextProvider>
          </SchemaProvider>
        </Provider>,
      );

      const formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.toggleTypeaheadFieldForProperty(ROOT_PATH);
      await formPageObject.inputText('Ref', 'MY_BEAN');
      await formPageObject.selectTypeaheadItem('create-new-with-name');

      const beanModal = screen.getByTestId('NewBeanModal-MY_BEAN');

      expect(beanModal).toBeInTheDocument();
    });
  });

  describe('Creating a new bean without prefix', () => {
    beforeEach(async () => {
      onPropertyChangeSpy = jest.fn();

      const { Provider } = TestProvidersWrapper();

      render(
        <Provider>
          <SchemaProvider schema={refSchema}>
            <ModelContextProvider model={undefined} onPropertyChange={onPropertyChangeSpy}>
              <UnprefixedBeanField propName={ROOT_PATH} />
            </ModelContextProvider>
          </SchemaProvider>
        </Provider>,
      );

      formPageObject = new KaotoFormPageObject(screen, act);
    });

    it('should create a bean reference without prefix', async () => {
      await createBean('myNewBean', 'Ref');

      const [nameInput] = screen.getAllByLabelText('Name');
      expect(nameInput).toHaveValue('myNewBean');

      await formPageObject.inputText('Type', 'io.kaoto.new.MyNewBean');
      await clickCreateButton();

      expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
      expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, 'myNewBean');
      expect(screen.queryByTestId('NewBeanModal-myNewBean')).not.toBeInTheDocument();
    });

    it('should refresh the bean list after creating a new bean', async () => {
      await createBean('myNewBean', 'Ref');
      await formPageObject.inputText('Type', 'io.kaoto.new.MyNewBean');
      await clickCreateButton();

      await formPageObject.clearForProperty(ROOT_PATH);
      await createBean('anotherBean', 'Ref');
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
      await createBean('myNewBean', 'Ref');

      const cancelButton = screen.getAllByRole('button').find((b) => b.textContent === 'Cancel');
      await act(async () => {
        fireEvent.click(cancelButton!);
      });

      expect(onPropertyChangeSpy).not.toHaveBeenCalled();
      expect(screen.queryByTestId('NewBeanModal-myNewBean')).not.toBeInTheDocument();
    });
  });

  describe('BeanFieldBase behavior differences', () => {
    it('should create prefixed bean reference when shouldPrefixBeanName=true', async () => {
      await createBeanInComponent(
        <PrefixedBeanField propName={ROOT_PATH} />,
        'testBean',
        'Bean Reference',
        beanReferenceSchema,
      );

      expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
      expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, '#testBean');
    });

    it('should create unprefixed bean reference when shouldPrefixBeanName=false', async () => {
      await createBeanInComponent(
        <UnprefixedBeanField propName={ROOT_PATH} />,
        'testBean',
        'Bean Reference',
        beanReferenceSchema,
      );

      expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
      expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, 'testBean');
    });

    it('should display existing beans correctly in prefixed mode', async () => {
      const { Provider } = TestProvidersWrapper();

      // First create a bean using UnprefixedBeanField to add it to the system
      render(
        <Provider>
          <SchemaProvider schema={beanReferenceSchema}>
            <ModelContextProvider model={undefined} onPropertyChange={jest.fn()}>
              <UnprefixedBeanField propName={ROOT_PATH} />
            </ModelContextProvider>
          </SchemaProvider>
        </Provider>,
      );

      let formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.toggleTypeaheadFieldForProperty(ROOT_PATH);
      await formPageObject.inputText('Bean Reference', 'existingBean');
      await formPageObject.selectTypeaheadItem('create-new-with-name');
      await formPageObject.inputText('Type', 'io.kaoto.test.ExistingBean');

      const createButton = screen.getAllByRole('button').find((b) => b.textContent === 'Create');
      await act(async () => {
        fireEvent.click(createButton!);
      });

      cleanup();

      // Now test that PrefixedBeanField shows the bean with prefix in dropdown
      render(
        <Provider>
          <SchemaProvider schema={beanReferenceSchema}>
            <ModelContextProvider model={undefined} onPropertyChange={jest.fn()}>
              <PrefixedBeanField propName={ROOT_PATH} />
            </ModelContextProvider>
          </SchemaProvider>
        </Provider>,
      );

      formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.toggleTypeaheadFieldForProperty(ROOT_PATH);

      const beanOptions = screen.getAllByRole('option');
      const existingBeanOption = beanOptions.find((option) => option.textContent?.includes('existingBean'));
      expect(existingBeanOption).toHaveTextContent('#existingBean');
    });

    it('should display existing beans correctly in unprefixed mode', async () => {
      const { Provider } = TestProvidersWrapper();

      // First create a bean using PrefixedBeanField to add it to the system
      render(
        <Provider>
          <SchemaProvider schema={beanReferenceSchema}>
            <ModelContextProvider model={undefined} onPropertyChange={jest.fn()}>
              <PrefixedBeanField propName={ROOT_PATH} />
            </ModelContextProvider>
          </SchemaProvider>
        </Provider>,
      );

      let formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.toggleTypeaheadFieldForProperty(ROOT_PATH);
      await formPageObject.inputText('Bean Reference', 'anotherBean');
      await formPageObject.selectTypeaheadItem('create-new-with-name');
      await formPageObject.inputText('Type', 'io.kaoto.test.AnotherBean');

      const createButton = screen.getAllByRole('button').find((b) => b.textContent === 'Create');
      await act(async () => {
        fireEvent.click(createButton!);
      });

      cleanup();

      // Now test that UnprefixedBeanField shows the bean without prefix in dropdown
      render(
        <Provider>
          <SchemaProvider schema={beanReferenceSchema}>
            <ModelContextProvider model={undefined} onPropertyChange={jest.fn()}>
              <UnprefixedBeanField propName={ROOT_PATH} />
            </ModelContextProvider>
          </SchemaProvider>
        </Provider>,
      );

      formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.toggleTypeaheadFieldForProperty(ROOT_PATH);

      const beanOptions = screen.getAllByRole('option');
      const anotherBeanOption = beanOptions.find((option) => option.textContent?.includes('anotherBean'));
      expect(anotherBeanOption).toHaveTextContent('anotherBean');
      expect(anotherBeanOption).not.toHaveTextContent('#anotherBean');
    });
  });

  describe('DataSourceBeanField', () => {
    let onPropertyChangeSpy: jest.Mock;
    let formPageObject: KaotoFormPageObject;

    const dataSourceSchema: KaotoSchemaDefinition['schema'] = { title: 'Data Source', type: 'string' };

    beforeEach(async () => {
      const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
      CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);

      onPropertyChangeSpy = jest.fn();
      cleanup();
    });

    it('should include default items in dropdown options', async () => {
      const { Provider } = TestProvidersWrapper();

      render(
        <Provider>
          <SchemaProvider schema={dataSourceSchema}>
            <ModelContextProvider model={undefined} onPropertyChange={onPropertyChangeSpy}>
              <DataSourceBeanField propName={ROOT_PATH} />
            </ModelContextProvider>
          </SchemaProvider>
        </Provider>,
      );

      formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.toggleTypeaheadFieldForProperty(ROOT_PATH);

      const beanOptions = screen.getAllByRole('option');

      // Should have default items plus create new option
      expect(beanOptions).toHaveLength(3);
      expect(beanOptions[0]).toHaveTextContent('default');
      expect(beanOptions[1]).toHaveTextContent('dataSource');
      expect(beanOptions[2]).toHaveTextContent('Create new bean');
    });

    it('should allow selection of default items', async () => {
      const { Provider } = TestProvidersWrapper();

      render(
        <Provider>
          <SchemaProvider schema={dataSourceSchema}>
            <ModelContextProvider model={undefined} onPropertyChange={onPropertyChangeSpy}>
              <DataSourceBeanField propName={ROOT_PATH} />
            </ModelContextProvider>
          </SchemaProvider>
        </Provider>,
      );

      formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.toggleTypeaheadFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('default');

      expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, 'default');
    });

    it('should find beans to only show DataSource types', async () => {
      const { Provider } = TestProvidersWrapper();

      // First create regular bean and DataSource bean
      render(
        <Provider>
          <SchemaProvider schema={dataSourceSchema}>
            <ModelContextProvider model={undefined} onPropertyChange={jest.fn()}>
              <UnprefixedBeanField propName={ROOT_PATH} />
            </ModelContextProvider>
          </SchemaProvider>
        </Provider>,
      );

      let formPageObject = new KaotoFormPageObject(screen, act);

      // Create regular bean
      await formPageObject.toggleTypeaheadFieldForProperty(ROOT_PATH);
      await formPageObject.inputText('Data Source', 'regularBean');
      await formPageObject.selectTypeaheadItem('create-new-with-name');
      await formPageObject.inputText('Type', 'io.kaoto.test.RegularBean');

      let createButton = screen.getAllByRole('button').find((b) => b.textContent === 'Create');
      await act(async () => {
        fireEvent.click(createButton!);
      });

      cleanup();

      // Create DataSource bean
      render(
        <Provider>
          <SchemaProvider schema={dataSourceSchema}>
            <ModelContextProvider model={undefined} onPropertyChange={jest.fn()}>
              <UnprefixedBeanField propName={ROOT_PATH} />
            </ModelContextProvider>
          </SchemaProvider>
        </Provider>,
      );

      formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.toggleTypeaheadFieldForProperty(ROOT_PATH);
      await formPageObject.inputText('Data Source', 'dataSourceBean');
      await formPageObject.selectTypeaheadItem('create-new-with-name');
      await formPageObject.inputText('Type', 'javax.sql.DataSource');

      createButton = screen.getAllByRole('button').find((b) => b.textContent === 'Create');
      await act(async () => {
        fireEvent.click(createButton!);
      });

      cleanup();

      // Now test DataSourceBeanField only shows DataSource beans
      render(
        <Provider>
          <SchemaProvider schema={dataSourceSchema}>
            <ModelContextProvider model={undefined} onPropertyChange={onPropertyChangeSpy}>
              <DataSourceBeanField propName={ROOT_PATH} />
            </ModelContextProvider>
          </SchemaProvider>
        </Provider>,
      );

      formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.toggleTypeaheadFieldForProperty(ROOT_PATH);

      const beanOptions = screen.getAllByRole('option');

      // Should have: default, dataSource, dataSourceBean, Create new bean
      expect(beanOptions).toHaveLength(4);
      expect(beanOptions.find((option) => option.textContent?.includes('dataSourceBean'))).toBeDefined();
      expect(beanOptions.find((option) => option.textContent?.includes('regularBean'))).toBeUndefined();
    });

    it('should show new bean modal when creating DataSource bean', async () => {
      const { Provider } = TestProvidersWrapper();

      render(
        <Provider>
          <SchemaProvider schema={dataSourceSchema}>
            <ModelContextProvider model={undefined} onPropertyChange={onPropertyChangeSpy}>
              <DataSourceBeanField propName={ROOT_PATH} />
            </ModelContextProvider>
          </SchemaProvider>
        </Provider>,
      );

      formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.toggleTypeaheadFieldForProperty(ROOT_PATH);
      await formPageObject.inputText('Data Source', 'MY_DATASOURCE');
      await formPageObject.selectTypeaheadItem('create-new-with-name');

      const beanModal = screen.getByTestId('NewBeanModal-MY_DATASOURCE');
      expect(beanModal).toBeInTheDocument();
    });
  });
});

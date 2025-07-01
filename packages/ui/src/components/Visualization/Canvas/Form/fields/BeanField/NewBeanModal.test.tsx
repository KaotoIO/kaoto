import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { resolveSchemaWithRef, SuggestionRegistryProvider } from '@kaoto/forms';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { getFirstCatalogMap } from '../../../../../../stubs/test-load-catalog';
import { NewBeanModal, NewBeanModalProps } from './NewBeanModal';

import { KaotoSchemaDefinition } from '../../../../../../models';

describe('NewBeanModal', () => {
  let beanSchema: KaotoSchemaDefinition['schema'];
  let defaultProps: NewBeanModalProps;

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    beanSchema = resolveSchemaWithRef(
      catalogsMap.entitiesCatalog.bean.propertiesSchema!.items!,
      catalogsMap.entitiesCatalog.bean.propertiesSchema!.definitions!,
    );
  });

  beforeEach(() => {
    defaultProps = {
      beanName: 'TestBean',
      javaType: 'java.lang.String',
      propertyTitle: 'Test Property',
      beanSchema,
      onCreateBean: jest.fn(),
      onCancelCreateBean: jest.fn(),
    };
  });

  it('should renders without crashing', () => {
    render(<NewBeanModal {...defaultProps} />, { wrapper: SuggestionRegistryProvider });
    expect(screen.getByTestId('NewBeanModal-TestBean')).toBeInTheDocument();
  });

  it('should not render anything if there is no schema', () => {
    render(<NewBeanModal {...defaultProps} beanSchema={undefined} />, { wrapper: SuggestionRegistryProvider });
    expect(screen.queryByTestId('NewBeanModal-TestBean')).not.toBeInTheDocument();
  });

  it('should call `onCancelCreateBean` when cancel button is clicked', () => {
    render(<NewBeanModal {...defaultProps} />, { wrapper: SuggestionRegistryProvider });
    fireEvent.click(screen.getByTestId('cancel-bean-btn'));
    expect(defaultProps.onCancelCreateBean).toHaveBeenCalled();
  });

  it('should call `onCreateBean` when create button is clicked', async () => {
    render(<NewBeanModal {...defaultProps} />, { wrapper: SuggestionRegistryProvider });
    await act(async () => {
      fireEvent.click(screen.getByTestId('create-bean-btn'));
    });
    expect(defaultProps.onCreateBean).toHaveBeenCalled();
  });

  it('should NOT call `onCreateBean` when create button is clicked but the schema is missing required fields', async () => {
    render(<NewBeanModal {...defaultProps} beanName={undefined} />, { wrapper: SuggestionRegistryProvider });
    await act(async () => {
      fireEvent.click(screen.getByTestId('create-bean-btn'));
    });
    expect(defaultProps.onCreateBean).not.toHaveBeenCalled();
  });

  it('displays the correct title and description', () => {
    render(<NewBeanModal {...defaultProps} javaType="TestType" />, { wrapper: SuggestionRegistryProvider });
    expect(screen.getByText('Create a new Test Property bean')).toBeInTheDocument();
    expect(screen.getByText('Java Type: TestType')).toBeInTheDocument();
  });

  it('updates the bean model when form changes', async () => {
    render(<NewBeanModal {...defaultProps} />, { wrapper: SuggestionRegistryProvider });
    const input = screen.getByLabelText('Name');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'New Bean Name' } });
    });
    expect(input).toHaveValue('New Bean Name');
  });
});

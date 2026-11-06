import { ModelContextProvider, SchemaProvider } from '@kaoto/forms';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { JSONSchema4 } from 'json-schema';

import { DynamicCatalogRegistry } from '../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind, ICitrusComponentDefinition } from '../../../../../../models';
import { InfraImplementationField } from './InfraImplementationField';

describe('InfraImplementationField', () => {
  const schema: JSONSchema4 = {
    title: 'Implementation',
    type: 'string',
    description: 'Optional service implementation detail.',
  };

  const mockCatalog: Record<string, ICitrusComponentDefinition> = {
    kafka: {
      kind: CatalogKind.TestInfraService,
      name: 'kafka',
      title: 'Kafka',
      description: 'Apache Kafka',
    },
    'kafka.strimzi': {
      kind: CatalogKind.TestInfraService,
      name: 'kafka.strimzi',
      title: 'Kafka Strimzi',
      description: 'Apache Kafka with Strimzi operator',
    },
    'kafka.confluent': {
      kind: CatalogKind.TestInfraService,
      name: 'kafka.confluent',
      title: 'Kafka Confluent',
      description: 'Apache Kafka with Confluent platform',
    },
    postgres: {
      kind: CatalogKind.TestInfraService,
      name: 'postgres',
      title: 'Postgres',
      description: 'PostgreSQL relational database',
    },
  };

  beforeEach(() => {
    vi.spyOn(DynamicCatalogRegistry.get(), 'getCatalog').mockReturnValue({
      getAll: vi.fn().mockResolvedValue(mockCatalog),
      get: vi.fn(),
      clearCache: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderField = (model: Record<string, unknown>, onPropertyChange = vi.fn()) => {
    render(
      <SchemaProvider schema={schema}>
        <ModelContextProvider model={model} onPropertyChange={onPropertyChange}>
          <InfraImplementationField propName="implementation" />
        </ModelContextProvider>
      </SchemaProvider>,
    );

    return { onPropertyChange };
  };

  it('should show implementations filtered by the selected service', async () => {
    renderField({ service: 'kafka', implementation: undefined });

    const input = screen.getByRole('combobox', { name: 'Implementation' });
    fireEvent.click(input);

    await waitFor(() => {
      expect(screen.getByText('Strimzi')).toBeInTheDocument();
      expect(screen.getByText('Confluent')).toBeInTheDocument();
    });
  });

  it('should show no suggestions when service has no implementations', async () => {
    renderField({ service: 'postgres', implementation: undefined });

    const input = screen.getByRole('combobox', { name: 'Implementation' });
    fireEvent.click(input);

    await waitFor(() => {
      expect(screen.queryByText('Strimzi')).not.toBeInTheDocument();
    });
  });

  it('should show no suggestions when no service is selected', async () => {
    renderField({ service: undefined, implementation: undefined });

    const input = screen.getByRole('combobox', { name: 'Implementation' });
    fireEvent.click(input);

    expect(screen.queryByText('Strimzi')).not.toBeInTheDocument();
  });

  it('should set implementation value when selecting an item', async () => {
    const { onPropertyChange } = renderField({ service: 'kafka', implementation: undefined });

    const input = screen.getByRole('combobox', { name: 'Implementation' });
    fireEvent.click(input);

    await waitFor(() => {
      expect(screen.getByText('Strimzi')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Strimzi'));

    expect(onPropertyChange).toHaveBeenCalledWith('implementation', 'strimzi');
  });

  it('should render with existing implementation value', async () => {
    renderField({ service: 'kafka', implementation: 'strimzi' });

    await waitFor(() => {
      const input = screen.getByRole('combobox', { name: 'Implementation' });
      expect(input).toHaveValue('Strimzi');
    });
  });

  it('should return empty items when catalog is not available', async () => {
    vi.spyOn(DynamicCatalogRegistry.get(), 'getCatalog').mockReturnValue(undefined);

    renderField({ service: 'kafka', implementation: undefined });

    const input = screen.getByRole('combobox', { name: 'Implementation' });
    fireEvent.click(input);

    expect(screen.queryByText('Strimzi')).not.toBeInTheDocument();
  });
});

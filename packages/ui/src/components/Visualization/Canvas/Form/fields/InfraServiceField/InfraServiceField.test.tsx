import { ModelContextProvider, SchemaProvider } from '@kaoto/forms';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { JSONSchema4 } from 'json-schema';

import { DynamicCatalogRegistry } from '../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind, ICitrusComponentDefinition } from '../../../../../../models';
import { InfraServiceField, parseInfraCatalog } from './InfraServiceField';

describe('parseInfraCatalog', () => {
  it('should group all dotted entries by prefix as service + implementation', () => {
    const catalog: Record<string, ICitrusComponentDefinition> = {
      kafka: { kind: CatalogKind.TestInfraService, name: 'kafka', title: 'Kafka' },
      'kafka.strimzi': { kind: CatalogKind.TestInfraService, name: 'kafka.strimzi', title: 'Kafka Strimzi' },
      'kafka.confluent': { kind: CatalogKind.TestInfraService, name: 'kafka.confluent', title: 'Kafka Confluent' },
      postgres: { kind: CatalogKind.TestInfraService, name: 'postgres', title: 'Postgres' },
      'aws.s3': { kind: CatalogKind.TestInfraService, name: 'aws.s3', title: 'Aws S3' },
      'aws.sqs': { kind: CatalogKind.TestInfraService, name: 'aws.sqs', title: 'Aws Sqs' },
      'google.pub-sub': { kind: CatalogKind.TestInfraService, name: 'google.pub-sub', title: 'Google Pub Sub' },
    };

    const entries = parseInfraCatalog(catalog);

    expect(entries.map((e) => e.serviceName)).toEqual(['aws', 'google', 'kafka', 'postgres']);

    const kafkaEntry = entries.find((e) => e.serviceName === 'kafka')!;
    expect(kafkaEntry.implementations.map((i) => i.implName)).toEqual(['confluent', 'strimzi']);
    expect(kafkaEntry.def.title).toBe('Kafka');

    const awsEntry = entries.find((e) => e.serviceName === 'aws')!;
    expect(awsEntry.implementations.map((i) => i.implName)).toEqual(['s3', 'sqs']);
    expect(awsEntry.def.title).toBe('Aws');
    expect(awsEntry.def.description).toBe('Aws Services');

    const googleEntry = entries.find((e) => e.serviceName === 'google')!;
    expect(googleEntry.implementations.map((i) => i.implName)).toEqual(['pub-sub']);
    expect(googleEntry.def.description).toBe('Google Services');

    const postgresEntry = entries.find((e) => e.serviceName === 'postgres')!;
    expect(postgresEntry.implementations).toEqual([]);
  });
});

describe('InfraServiceField', () => {
  const schema: JSONSchema4 = {
    title: 'Service',
    type: 'string',
    description: 'The Camel infra service name.',
  };

  const mockCatalog: Record<string, ICitrusComponentDefinition> = {
    kafka: {
      kind: CatalogKind.TestInfraService,
      name: 'kafka',
      title: 'Kafka',
      description: 'Apache Kafka, Distributed event streaming platform',
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
    'aws.s3': {
      kind: CatalogKind.TestInfraService,
      name: 'aws.s3',
      title: 'Aws S3',
      description: 'AWS S3 object storage',
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
          <InfraServiceField propName="service" />
        </ModelContextProvider>
      </SchemaProvider>,
    );

    return { onPropertyChange };
  };

  it('should render with empty value', async () => {
    renderField({ service: undefined });

    await waitFor(() => {
      const input = screen.getByRole('textbox', { name: 'Service' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');
    });
  });

  it('should render with existing service value', async () => {
    renderField({ service: 'kafka' });

    await waitFor(() => {
      const input = screen.getByRole('textbox', { name: 'Service' });
      expect(input).toHaveValue('Kafka');
    });
  });

  it('should show base services and inferred service groups as top-level items', async () => {
    renderField({ service: undefined });

    const input = screen.getByRole('textbox', { name: 'Service' });
    fireEvent.click(input);

    await waitFor(() => {
      expect(screen.getByText('Aws')).toBeInTheDocument();
      expect(screen.getByText('Kafka')).toBeInTheDocument();
      expect(screen.getByText('Postgres')).toBeInTheDocument();
    });
  });

  it('should show implementation sub-options for services with implementations', async () => {
    renderField({ service: undefined });

    const input = screen.getByRole('textbox', { name: 'Service' });
    fireEvent.click(input);

    await waitFor(() => {
      expect(screen.getByText('Kafka › Strimzi')).toBeInTheDocument();
      expect(screen.getByText('Kafka › Confluent')).toBeInTheDocument();
    });
  });

  it('should set service and clear implementation when selecting a base service', async () => {
    const { onPropertyChange } = renderField({ service: undefined, implementation: 'strimzi' });

    const input = screen.getByRole('textbox', { name: 'Service' });
    fireEvent.click(input);

    await waitFor(() => {
      expect(screen.getByText('Postgres')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Postgres'));

    expect(onPropertyChange).toHaveBeenCalledWith('service', 'postgres');
    expect(onPropertyChange).toHaveBeenCalledWith('implementation', undefined);
  });

  it('should set service and implementation when selecting an implementation', async () => {
    const { onPropertyChange } = renderField({ service: undefined });

    const input = screen.getByRole('textbox', { name: 'Service' });
    fireEvent.click(input);

    await waitFor(() => {
      expect(screen.getByText('Kafka › Strimzi')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Kafka › Strimzi'));

    expect(onPropertyChange).toHaveBeenCalledWith('service', 'kafka');
    expect(onPropertyChange).toHaveBeenCalledWith('implementation', 'strimzi');
  });

  it('should show inferred service implementations as sub-options', async () => {
    renderField({ service: undefined });

    const input = screen.getByRole('textbox', { name: 'Service' });
    fireEvent.click(input);

    await waitFor(() => {
      expect(screen.getByText('Aws › S3')).toBeInTheDocument();
    });
  });

  it('should set service and implementation when selecting an inferred implementation', async () => {
    const { onPropertyChange } = renderField({ service: undefined });

    const input = screen.getByRole('textbox', { name: 'Service' });
    fireEvent.click(input);

    await waitFor(() => {
      expect(screen.getByText('Aws › S3')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Aws › S3'));

    expect(onPropertyChange).toHaveBeenCalledWith('service', 'aws');
    expect(onPropertyChange).toHaveBeenCalledWith('implementation', 's3');
  });

  it('should split dotted custom input into service and implementation', async () => {
    const { onPropertyChange } = renderField({ service: undefined });

    const input = screen.getByRole('textbox', { name: 'Service' });
    fireEvent.change(input, { target: { value: 'kafka.strimzi' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onPropertyChange).toHaveBeenCalledWith('service', 'kafka');
      expect(onPropertyChange).toHaveBeenCalledWith('implementation', 'strimzi');
    });
  });

  it('should return empty items when catalog is not available', async () => {
    vi.spyOn(DynamicCatalogRegistry.get(), 'getCatalog').mockReturnValue(undefined);

    renderField({ service: undefined });

    const input = screen.getByRole('textbox', { name: 'Service' });
    fireEvent.click(input);

    expect(screen.queryByText('Kafka')).not.toBeInTheDocument();
    expect(screen.queryByText('Postgres')).not.toBeInTheDocument();
  });
});

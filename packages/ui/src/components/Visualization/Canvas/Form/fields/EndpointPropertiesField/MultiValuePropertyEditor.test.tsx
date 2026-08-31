import {
  CanvasFormTabsProvider,
  FormComponentFactoryProvider,
  ModelContextProvider,
  SchemaProvider,
} from '@kaoto/forms';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren, useState } from 'react';
import type { Mock } from 'vitest';

import { CatalogKind, KaotoSchemaDefinition } from '../../../../../../models';
import { MultiValuePropertyService } from './MultiValueProperty.service';
import { MultiValuePropertyEditor } from './MultiValuePropertyEditor';

type OnPropertyChange = Mock<(path: string, value: unknown) => void>;

/**
 * Stateful wrapper that mirrors what a real parent component does:
 * feeds each `onPropertyChange` result back into `ModelContextProvider`
 * as the new model, so sequential interactions see up-to-date state.
 * The spy is still called so assertions on `mockOnPropertyChange` work normally.
 */
const StatefulWrapper: FunctionComponent<
  PropsWithChildren<{
    schema: Record<string, unknown>;
    initialModel: Record<string, unknown>;
    onPropertyChange: OnPropertyChange;
  }>
> = ({ schema, initialModel, onPropertyChange, children }) => {
  const [model, setModel] = useState(initialModel);

  const handleChange = (path: string, value: unknown) => {
    setModel((prev) => ({ ...prev, [path]: value }));
    onPropertyChange(path, value);
  };

  return (
    <CanvasFormTabsProvider tab="All">
      <FormComponentFactoryProvider>
        <SchemaProvider schema={schema}>
          <ModelContextProvider model={model} onPropertyChange={handleChange} disabled={false}>
            {children}
          </ModelContextProvider>
        </SchemaProvider>
      </FormComponentFactoryProvider>
    </CanvasFormTabsProvider>
  );
};

describe('MultiValuePropertyEditor', () => {
  let mockOnPropertyChange: OnPropertyChange;
  let getMultiValuePropertiesSpy: ReturnType<typeof vi.spyOn>;

  const renderComponent = async ({
    schema = quartzLikeSchema,
    model = { parameters: {} },
    onPropertyChange = mockOnPropertyChange,
  }: {
    schema?: KaotoSchemaDefinition['schema'];
    model?: Record<string, unknown>;
    onPropertyChange?: OnPropertyChange;
  } = {}) => {
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      render(
        <StatefulWrapper schema={schema} initialModel={model} onPropertyChange={onPropertyChange}>
          <MultiValuePropertyEditor propName="parameters" required={false} />
        </StatefulWrapper>,
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnPropertyChange = vi.fn();
    getMultiValuePropertiesSpy = vi
      .spyOn(MultiValuePropertyService, 'getMultiValueProperties')
      .mockResolvedValue(quartzMultiValueMap);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should serialize two newly added multivalue groups with their correct prefixes', async () => {
    await renderComponent({ model: { parameters: {} } });

    // Add a row to jobParameters and type key=name, value=daily
    const jobAddButton = await screen.findByTestId('parameters.jobParameters__add');
    fireEvent.click(jobAddButton);

    const jobKeyInput = within(await screen.findByTestId('parameters.jobParameters__key')).getByRole('textbox');
    const jobValueInput = within(await screen.findByTestId('parameters.jobParameters__value')).getByRole('textbox');

    fireEvent.change(jobKeyInput, { target: { value: 'name' } });
    fireEvent.change(jobValueInput, { target: { value: 'daily' } });

    await waitFor(() => {
      expect(mockOnPropertyChange).toHaveBeenCalledWith('parameters', {
        'job.name': 'daily',
      });
    });

    // Add a row to triggerParameters and type key=repeatCount, value=5
    const triggerAddButton = await screen.findByTestId('parameters.triggerParameters__add');
    fireEvent.click(triggerAddButton);

    const triggerKeyInput = within(await screen.findByTestId('parameters.triggerParameters__key')).getByRole('textbox');
    const triggerValueInput = within(await screen.findByTestId('parameters.triggerParameters__value')).getByRole(
      'textbox',
    );
    fireEvent.change(triggerKeyInput, { target: { value: 'repeatCount' } });
    fireEvent.change(triggerValueInput, { target: { value: '5' } });

    await waitFor(() => {
      expect(mockOnPropertyChange).toHaveBeenLastCalledWith('parameters', {
        'job.name': 'daily',
        'trigger.repeatCount': '5',
      });
    });
  });

  it('should remove a deleted multivalue entry and reflect an overridden value in the serialized output', async () => {
    await renderComponent({
      model: {
        parameters: {
          'job.name': 'daily',
          'job.description': 'desc',
          'trigger.repeatCount': '3',
        },
      },
    });

    // Remove the description row from jobParameters
    const removeDescriptionButton = await screen.findByTestId('parameters.jobParameters__remove__description');
    fireEvent.click(removeDescriptionButton);

    await waitFor(() => {
      // After removing description: job.description must be absent, trigger still has original '3'
      expect(mockOnPropertyChange).toHaveBeenNthCalledWith(1, 'parameters', {
        'job.name': 'daily',
        'trigger.repeatCount': '3',
      });
    });

    // Change triggerParameters.repeatCount from '3' to '10'
    const triggerValueInput = within(await screen.findByTestId('parameters.triggerParameters__value')).getByRole(
      'textbox',
    );
    fireEvent.change(triggerValueInput, { target: { value: '10' } });

    await waitFor(() => {
      // After updating repeatCount: job.description stays absent, trigger.repeatCount updated to '10'
      expect(mockOnPropertyChange).toHaveBeenNthCalledWith(2, 'parameters', {
        'job.name': 'daily',
        'trigger.repeatCount': '10',
      });
    });
  });

  it('should correctly serialize both standard and multivalue properties after editing each', async () => {
    await renderComponent({
      model: {
        parameters: {
          cron: '0 0 * * *',
          'job.name': 'daily',
        },
      },
    });

    // Change the plain cron field to '0 1 * * *'
    const cronInput = await screen.findByRole('textbox', { name: 'Cron' });
    fireEvent.change(cronInput, { target: { value: '0 1 * * *' } });

    await waitFor(() => {
      expect(mockOnPropertyChange).toHaveBeenLastCalledWith('parameters', {
        cron: '0 1 * * *',
        'job.name': 'daily',
      });
    });

    // Update jobParameters.name from 'daily' to 'weekly'
    const jobValueInput = within(await screen.findByTestId('parameters.jobParameters__value')).getByRole('textbox');
    fireEvent.change(jobValueInput, { target: { value: 'weekly' } });

    await waitFor(() => {
      expect(mockOnPropertyChange).toHaveBeenLastCalledWith('parameters', {
        cron: '0 1 * * *',
        'job.name': 'weekly',
      });
    });
  });

  it('should render without errors when schema catalog extension fields are missing', async () => {
    getMultiValuePropertiesSpy.mockResolvedValue(new Map());

    await renderComponent({ schema: {} });

    expect(getMultiValuePropertiesSpy).toHaveBeenCalledWith(undefined, undefined);
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('should pass standard properties through unmodified when the schema has no catalog extension fields', async () => {
    await renderComponent({
      schema: schemaWithoutCatalogExtensions,
      model: { parameters: { cron: '0 0 * * *' } },
    });

    expect(getMultiValuePropertiesSpy).toHaveBeenCalledWith(undefined, undefined);

    const cronInput = await screen.findByRole('textbox', { name: 'Cron' });
    fireEvent.change(cronInput, { target: { value: '0 1 * * *' } });

    await waitFor(() => {
      expect(mockOnPropertyChange).toHaveBeenLastCalledWith('parameters', { cron: '0 1 * * *' });
    });
  });

  it('should not call onPropertyChange when the serialized result is undefined', async () => {
    vi.spyOn(MultiValuePropertyService, 'getMultiValueSerializedDefinition').mockReturnValue(undefined);

    await renderComponent({ model: { parameters: { cron: '0 0 * * *' } } });

    const cronInput = await screen.findByRole('textbox', { name: 'Cron' });
    fireEvent.change(cronInput, { target: { value: '0 1 * * *' } });

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Cron' })).toBeInTheDocument();
    });
    expect(mockOnPropertyChange).not.toHaveBeenCalled();
  });

  it('should treat an empty-string value on a string field as a deletion and omit the key from the serialized output', async () => {
    await renderComponent({ model: { parameters: { cron: '0 0 * * *', 'job.name': 'daily' } } });

    const cronInput = await screen.findByRole('textbox', { name: 'Cron' });
    fireEvent.change(cronInput, { target: { value: '' } });

    await waitFor(() => {
      const [path, value] = mockOnPropertyChange.mock.lastCall! as [string, Record<string, unknown>];
      expect(path).toBe('parameters');
      expect(value['cron']).toBeUndefined();
      expect(value['job.name']).toBe('daily');
    });
  });
});

/**
 * Minimal schema that resembles the quartz component, keeping only the
 * properties exercised by these tests:
 *   - cron              → plain string parameter (no prefix)
 *   - jobParameters     → multivalue object, prefix "job."
 *                         sub-properties: name, description
 *   - triggerParameters → multivalue object, prefix "trigger."
 *                         sub-properties: repeatCount, repeatInterval
 *
 * Sub-properties are declared so that ObjectField renders real text inputs
 * that KaotoFormPageObject can interact with.
 */
const quartzLikeSchema: KaotoSchemaDefinition['schema'] = {
  type: 'object',
  title: 'Endpoint Properties',
  properties: {
    cron: {
      title: 'Cron',
      description: 'Specifies a cron expression to define when to trigger.',
      type: 'string',
    },
    jobParameters: {
      title: 'Job Parameters',
      description: 'To configure additional options on the job. This is a multi-value option with prefix: job.',
      type: 'object',
    },
    triggerParameters: {
      title: 'Trigger Parameters',
      description:
        'To configure additional options on the trigger. The parameter timeZone is supported if the cron option is present. Otherwise the parameters repeatInterval and repeatCount are supported. Note: When using repeatInterval values of 1000 or less, the first few events after starting the camel context may be fired more rapidly than expected. . This is a multi-value option with prefix: trigger.',
      type: 'object',
    },
  },
  'x-component-name': 'quartz',
  'x-endpoint-catalog-kind': CatalogKind.Component,
};

/** The map that MultiValuePropertyService.getMultiValueProperties() returns for quartz. */
const quartzMultiValueMap = new Map([
  ['jobParameters', 'job.'],
  ['triggerParameters', 'trigger.'],
]);

/** Same properties as quartzLikeSchema but without catalog extension fields, so getMultiValueProperties receives (undefined, undefined). */
const schemaWithoutCatalogExtensions: KaotoSchemaDefinition['schema'] = {
  type: 'object',
  title: 'Endpoint Properties',
  properties: {
    cron: {
      title: 'Cron',
      description: 'Specifies a cron expression to define when to trigger.',
      type: 'string',
    },
  },
};

import { act, fireEvent, render, screen } from '@testing-library/react';
import { JSONSchema4 } from 'json-schema';

import { ModelContextProvider, SchemaProvider } from '../../providers';
import { KaotoFormPageObject } from '../../testing/KaotoFormPageObject';
import { EditInPlaceField } from './EditInPlaceField';

describe('EditInPlaceField', () => {
  const PROP_NAME = 'uri';
  const schema: JSONSchema4 = {
    title: 'Uri',
    type: 'string',
    description: 'Sets the URI of the endpoint to use',
  };

  const renderField = (model: Record<string, unknown> = {}, onChange = vi.fn()) => {
    render(
      <SchemaProvider schema={schema}>
        <ModelContextProvider model={model} onPropertyChange={onChange}>
          <EditInPlaceField propName={PROP_NAME} />
        </ModelContextProvider>
      </SchemaProvider>,
    );
  };

  it('should render with existing URI value', () => {
    renderField({ uri: 'timer:test' });

    const formPageObject = new KaotoFormPageObject(screen, act);
    const valueElement = formPageObject.getUriInputForProperty(PROP_NAME);
    expect(valueElement).toHaveValue('timer:test');

    const editButton = screen.getByRole('button', { name: /Edit Uri/i });
    expect(editButton).toBeInTheDocument();
  });

  it('should render with empty value', () => {
    renderField({});

    const formPageObject = new KaotoFormPageObject(screen, act);
    const valueElement = formPageObject.getUriInputForProperty(PROP_NAME);
    expect(valueElement).toHaveValue('');
    expect(valueElement).toHaveAttribute('placeholder', "Click to add 'uri'");

    const editButton = screen.getByRole('button', { name: /Edit Uri/i });
    expect(editButton).toBeInTheDocument();
  });

  it('should display placeholder when URI is empty string', () => {
    renderField({ uri: '' });

    const formPageObject = new KaotoFormPageObject(screen, act);
    const valueElement = formPageObject.getUriInputForProperty(PROP_NAME);
    expect(valueElement).toHaveValue('');
    expect(valueElement).toHaveAttribute('placeholder', "Click to add 'uri'");
  });

  it('should call onChange when editing URI value', async () => {
    const onChangeMock = vi.fn();
    renderField({ uri: 'timer:test' }, onChangeMock);

    const formPageObject = new KaotoFormPageObject(screen, act);
    await formPageObject.editUriForProperty(PROP_NAME);

    const input = formPageObject.getUriInputForProperty(PROP_NAME);
    expect(input).toBeDefined();
    fireEvent.change(input!, { target: { value: 'timer:newtest' } });

    await formPageObject.saveUriForProperty(PROP_NAME);

    expect(onChangeMock).toHaveBeenCalledWith('uri', 'timer:newtest');
  });

  it('should call onChange with undefined when clearing URI value', async () => {
    const onChangeMock = vi.fn();
    renderField({ uri: 'timer:test' }, onChangeMock);

    const formPageObject = new KaotoFormPageObject(screen, act);
    await formPageObject.editUriForProperty(PROP_NAME);

    const input = formPageObject.getUriInputForProperty(PROP_NAME);
    expect(input).toBeDefined();
    fireEvent.change(input!, { target: { value: '' } });

    await formPageObject.saveUriForProperty(PROP_NAME);

    expect(onChangeMock).toHaveBeenCalledWith('uri', undefined);
  });

  it('should not call onChange when canceling edit', async () => {
    const onChangeMock = vi.fn();
    renderField({ uri: 'timer:test' }, onChangeMock);

    const formPageObject = new KaotoFormPageObject(screen, act);
    await formPageObject.editUriForProperty(PROP_NAME);

    const input = formPageObject.getUriInputForProperty(PROP_NAME);
    expect(input).toBeDefined();
    fireEvent.change(input!, { target: { value: 'timer:newtest' } });

    await formPageObject.cancelUriForProperty(PROP_NAME);

    expect(onChangeMock).not.toHaveBeenCalled();
  });
});

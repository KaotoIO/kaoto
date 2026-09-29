import { ModelContextProvider, SchemaProvider } from '@kaoto/forms';
import { KaotoFormPageObject } from '@kaoto/forms/testing';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { JSONSchema4 } from 'json-schema';

import { UriField } from './UriField';

describe('UriField', () => {
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
          <UriField propName={PROP_NAME} />
        </ModelContextProvider>
      </SchemaProvider>,
    );
  };

  it('should render with existing URI value', () => {
    renderField({ uri: 'timer:test' });

    const formPageObject = new KaotoFormPageObject(screen, act);
    const valueElement = formPageObject.getUriInputForProperty(PROP_NAME);
    expect(valueElement).toHaveValue('timer:test');

    const editButton = screen.getByTestId('uri--edit');
    expect(editButton).toBeInTheDocument();
  });

  it('should render with empty value', () => {
    renderField({});

    const formPageObject = new KaotoFormPageObject(screen, act);
    const valueElement = formPageObject.getUriInputForProperty(PROP_NAME);
    expect(valueElement).toHaveValue('');
    expect(valueElement).toHaveAttribute('placeholder', "Click to add 'uri'");

    const editButton = screen.getByTestId('uri--edit');
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

    const input = screen.getByTestId('uri--text-input');
    fireEvent.change(input, { target: { value: 'timer:newtest' } });

    await formPageObject.saveUriForProperty(PROP_NAME);

    expect(onChangeMock).toHaveBeenCalledWith('uri', 'timer:newtest');
  });

  it('should call onChange with undefined when clearing URI value', async () => {
    const onChangeMock = vi.fn();
    renderField({ uri: 'timer:test' }, onChangeMock);

    const formPageObject = new KaotoFormPageObject(screen, act);
    await formPageObject.editUriForProperty(PROP_NAME);

    const input = screen.getByTestId('uri--text-input');
    fireEvent.change(input, { target: { value: '' } });

    await formPageObject.saveUriForProperty(PROP_NAME);

    expect(onChangeMock).toHaveBeenCalledWith('uri', undefined);
  });

  it('should not call onChange when canceling edit', async () => {
    const onChangeMock = vi.fn();
    renderField({ uri: 'timer:test' }, onChangeMock);

    const formPageObject = new KaotoFormPageObject(screen, act);
    await formPageObject.editUriForProperty(PROP_NAME);

    const input = screen.getByTestId('uri--text-input');
    fireEvent.change(input, { target: { value: 'timer:newtest' } });

    await formPageObject.cancelUriForProperty(PROP_NAME);

    expect(onChangeMock).not.toHaveBeenCalled();
  });
});

import '@testing-library/jest-dom';

import { ModelContextProvider, SchemaProvider } from '@kaoto/forms';
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

  const renderField = (model: Record<string, unknown> = {}, onChange = jest.fn()) => {
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

    const valueElement = screen.getByTestId('uri');
    expect(valueElement).toHaveTextContent('timer:test');
    expect(screen.queryByText("Click to add 'uri'")).not.toBeInTheDocument();

    const editButton = screen.getByTestId('uri--edit');
    expect(editButton).toBeInTheDocument();
  });

  it('should render with empty value', () => {
    renderField({});

    const placeholder = screen.getByText("Click to add 'uri'");
    expect(placeholder).toBeInTheDocument();

    const editButton = screen.getByTestId('uri--edit');
    expect(editButton).toBeInTheDocument();
  });

  it('should display placeholder when URI is empty string', () => {
    renderField({ uri: '' });

    const placeholder = screen.getByText("Click to add 'uri'");
    expect(placeholder).toBeInTheDocument();
  });

  it('should call onChange when editing URI value', () => {
    const onChangeMock = jest.fn();
    renderField({ uri: 'timer:test' }, onChangeMock);

    const editButton = screen.getByTestId('uri--edit');
    act(() => {
      fireEvent.click(editButton);
    });

    const input = screen.getByTestId('uri--text-input');
    act(() => {
      fireEvent.change(input, { target: { value: 'timer:newtest' } });
    });

    const saveButton = screen.getByTestId('uri--save');
    act(() => {
      fireEvent.click(saveButton);
    });

    expect(onChangeMock).toHaveBeenCalledWith('uri', 'timer:newtest');
  });

  it('should call onChange with undefined when clearing URI value', () => {
    const onChangeMock = jest.fn();
    renderField({ uri: 'timer:test' }, onChangeMock);

    const editButton = screen.getByTestId('uri--edit');
    act(() => {
      fireEvent.click(editButton);
    });

    const input = screen.getByTestId('uri--text-input');
    act(() => {
      fireEvent.change(input, { target: { value: '' } });
    });

    const saveButton = screen.getByTestId('uri--save');
    act(() => {
      fireEvent.click(saveButton);
    });

    expect(onChangeMock).toHaveBeenCalledWith('uri', undefined);
  });

  it('should not call onChange when canceling edit', () => {
    const onChangeMock = jest.fn();
    renderField({ uri: 'timer:test' }, onChangeMock);

    const editButton = screen.getByTestId('uri--edit');
    act(() => {
      fireEvent.click(editButton);
    });

    const input = screen.getByTestId('uri--text-input');
    act(() => {
      fireEvent.change(input, { target: { value: 'timer:newtest' } });
    });

    const cancelButton = screen.getByTestId('uri--cancel');
    act(() => {
      fireEvent.click(cancelButton);
    });

    expect(onChangeMock).not.toHaveBeenCalled();
  });
});

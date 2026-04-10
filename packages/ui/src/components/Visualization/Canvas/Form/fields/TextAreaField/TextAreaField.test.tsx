import { ModelContextProvider, SchemaProvider } from '@kaoto/forms';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { KaotoSchemaDefinition } from '../../../../../../models';
import { ROOT_PATH } from '../../../../../../utils';
import { TextAreaField } from './TextAreaField';

describe('TextAreaField', () => {
  const defaultSchema: KaotoSchemaDefinition['schema'] = {
    title: 'Message Body',
    type: 'string',
    description: 'The message body content',
  };

  it('should render without crashing', () => {
    render(
      <SchemaProvider schema={defaultSchema}>
        <ModelContextProvider model="" onPropertyChange={jest.fn()}>
          <TextAreaField propName={ROOT_PATH} />
        </ModelContextProvider>
      </SchemaProvider>,
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should display the schema title', () => {
    render(
      <SchemaProvider schema={defaultSchema}>
        <ModelContextProvider model="" onPropertyChange={jest.fn()}>
          <TextAreaField propName={ROOT_PATH} />
        </ModelContextProvider>
      </SchemaProvider>,
    );

    expect(screen.getByText('Message Body')).toBeInTheDocument();
  });

  it('should render with initial value', () => {
    const initialValue = 'Hello, World!';

    render(
      <SchemaProvider schema={defaultSchema}>
        <ModelContextProvider model={initialValue} onPropertyChange={jest.fn()}>
          <TextAreaField propName={ROOT_PATH} />
        </ModelContextProvider>
      </SchemaProvider>,
    );

    const textArea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textArea.value).toBe(initialValue);
  });

  it('should call onChange when value changes', async () => {
    const onPropertyChangeSpy = jest.fn();
    const newValue = 'Updated message body';

    render(
      <SchemaProvider schema={defaultSchema}>
        <ModelContextProvider model="" onPropertyChange={onPropertyChangeSpy}>
          <TextAreaField propName={ROOT_PATH} />
        </ModelContextProvider>
      </SchemaProvider>,
    );

    const textArea = screen.getByRole('textbox');

    await act(async () => {
      fireEvent.change(textArea, { target: { value: newValue } });
    });

    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, newValue);
  });

  it('should set the appropriate placeholder from schema default', () => {
    const schemaWithDefault: KaotoSchemaDefinition['schema'] = {
      ...defaultSchema,
      default: 'Default message',
    };

    render(
      <SchemaProvider schema={schemaWithDefault}>
        <ModelContextProvider model="" onPropertyChange={jest.fn()}>
          <TextAreaField propName={ROOT_PATH} />
        </ModelContextProvider>
      </SchemaProvider>,
    );

    const textArea = screen.getByRole('textbox');
    expect(textArea).toHaveAttribute('placeholder', 'Default message');
  });

  it('should render TextArea with 5 rows', () => {
    render(
      <SchemaProvider schema={defaultSchema}>
        <ModelContextProvider model="" onPropertyChange={jest.fn()}>
          <TextAreaField propName={ROOT_PATH} />
        </ModelContextProvider>
      </SchemaProvider>,
    );

    const textArea = screen.getByRole('textbox');
    expect(textArea).toHaveAttribute('rows', '5');
  });

  it('should have correct aria-describedby', () => {
    render(
      <SchemaProvider schema={defaultSchema}>
        <ModelContextProvider model="" onPropertyChange={jest.fn()}>
          <TextAreaField propName={ROOT_PATH} />
        </ModelContextProvider>
      </SchemaProvider>,
    );

    const textArea = screen.getByRole('textbox');
    expect(textArea).toHaveAttribute('aria-describedby', `${ROOT_PATH}-popover`);
  });

  it('should render FieldWrapper with required prop', () => {
    render(
      <SchemaProvider schema={defaultSchema}>
        <ModelContextProvider model="" onPropertyChange={jest.fn()}>
          <TextAreaField propName={ROOT_PATH} required={true} />
        </ModelContextProvider>
      </SchemaProvider>,
    );

    // FieldWrapper should render the title with required indicator
    expect(screen.getByText('Message Body')).toBeInTheDocument();
  });

  it('should handle empty value', () => {
    render(
      <SchemaProvider schema={defaultSchema}>
        <ModelContextProvider model={undefined} onPropertyChange={jest.fn()}>
          <TextAreaField propName={ROOT_PATH} />
        </ModelContextProvider>
      </SchemaProvider>,
    );

    const textArea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textArea.value).toBe('');
  });

  it('should handle multiline text', async () => {
    const onPropertyChangeSpy = jest.fn();
    const multilineText = 'Line 1\nLine 2\nLine 3';

    render(
      <SchemaProvider schema={defaultSchema}>
        <ModelContextProvider model="" onPropertyChange={onPropertyChangeSpy}>
          <TextAreaField propName={ROOT_PATH} />
        </ModelContextProvider>
      </SchemaProvider>,
    );

    const textArea = screen.getByRole('textbox');

    await act(async () => {
      fireEvent.change(textArea, { target: { value: multilineText } });
    });

    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, multilineText);
  });
});

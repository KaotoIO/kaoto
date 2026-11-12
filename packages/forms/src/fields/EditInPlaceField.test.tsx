import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JSONSchema4 } from 'json-schema';

import { ModelContextProvider, SchemaProvider } from '../providers';
import { KaotoFormPageObject } from '../testing/KaotoFormPageObject';
import { EditInPlaceField } from './EditInPlaceField';

describe('EditInPlaceField', () => {
  const PROP_NAME = 'uri';
  const schema: JSONSchema4 = {
    title: 'Uri',
    type: 'string',
    description: 'Sets the URI of the endpoint to use',
  };

  const renderField = (model: Record<string, unknown> = {}, onChange = vi.fn(), errors?: Record<string, string[]>) => {
    render(
      <SchemaProvider schema={schema}>
        <ModelContextProvider model={model} errors={errors} onPropertyChange={onChange}>
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

  describe('when the input loses focus', () => {
    const renderWithOutsideButton = (onChange: (propName: string, value: unknown) => void) =>
      render(
        <>
          <SchemaProvider schema={schema}>
            <ModelContextProvider model={{ uri: 'timer:test' }} onPropertyChange={onChange}>
              <EditInPlaceField propName={PROP_NAME} />
            </ModelContextProvider>
          </SchemaProvider>
          <button type="button">Outside</button>
        </>,
      );

    it('should not save and should discard the draft when clicking outside', async () => {
      const onChangeMock = vi.fn();
      renderWithOutsideButton(onChangeMock);
      const user = userEvent.setup();

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.type(input, 'XYZ');
      await user.click(screen.getByRole('button', { name: 'Outside' }));

      expect(onChangeMock).not.toHaveBeenCalled();
      expect(screen.getByRole('textbox')).toHaveValue('timer:test');
    });

    it('should still save when pressing Enter', async () => {
      const onChangeMock = vi.fn();
      renderWithOutsideButton(onChangeMock);
      const user = userEvent.setup();

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.type(input, 'XYZ{Enter}');

      expect(onChangeMock).toHaveBeenCalledWith('uri', 'timer:testXYZ');
    });
  });

  it('should show the validation errors as invalid', () => {
    renderField({ uri: 'timer:test' }, vi.fn(), { [PROP_NAME]: ['uri is not valid'] });

    const formPageObject = new KaotoFormPageObject(screen, act);
    expect(screen.getByText('uri is not valid')).toBeInTheDocument();
    expect(formPageObject.getUriInputForProperty(PROP_NAME)).toHaveAttribute('aria-invalid', 'true');
  });

  it('should not be invalid when there are no validation errors', () => {
    renderField({ uri: 'timer:test' });

    const formPageObject = new KaotoFormPageObject(screen, act);
    expect(formPageObject.getUriInputForProperty(PROP_NAME)).toHaveAttribute('aria-invalid', 'false');
  });

  it('should allow saving a changed value even if the previous one had errors', async () => {
    const onChangeMock = vi.fn();
    renderField({ uri: 'timer:test' }, onChangeMock, { [PROP_NAME]: ['uri is not valid'] });

    const formPageObject = new KaotoFormPageObject(screen, act);
    await formPageObject.editUriForProperty(PROP_NAME);

    const input = formPageObject.getUriInputForProperty(PROP_NAME);
    fireEvent.change(input!, { target: { value: 'timer:newtest' } });

    expect(screen.queryByText('uri is not valid')).not.toBeInTheDocument();

    await formPageObject.saveUriForProperty(PROP_NAME);

    expect(onChangeMock).toHaveBeenCalledWith('uri', 'timer:newtest');
  });

  describe('when the model changes from outside', () => {
    const renderWithModel = (model: Record<string, unknown>, onChange: (propName: string, value: unknown) => void) => (
      <SchemaProvider schema={schema}>
        <ModelContextProvider model={model} onPropertyChange={onChange}>
          <EditInPlaceField propName={PROP_NAME} />
        </ModelContextProvider>
      </SchemaProvider>
    );

    it('should restore the latest model value when canceling', async () => {
      const onChangeMock = vi.fn();
      const { rerender } = render(renderWithModel({ uri: 'timer:a' }, onChangeMock));
      rerender(renderWithModel({ uri: 'timer:b' }, onChangeMock));

      const formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.editUriForProperty(PROP_NAME);
      fireEvent.change(formPageObject.getUriInputForProperty(PROP_NAME)!, { target: { value: 'timer:c' } });
      await formPageObject.cancelUriForProperty(PROP_NAME);

      expect(formPageObject.getUriInputForProperty(PROP_NAME)).toHaveValue('timer:b');
      expect(onChangeMock).not.toHaveBeenCalled();
    });

    it('should not write the value back when the input loses focus without edits', async () => {
      const onChangeMock = vi.fn();
      const { rerender } = render(renderWithModel({ uri: 'timer:a' }, onChangeMock));
      rerender(renderWithModel({ uri: 'timer:b' }, onChangeMock));

      const formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.editUriForProperty(PROP_NAME);
      fireEvent.blur(formPageObject.getUriInputForProperty(PROP_NAME)!);

      expect(onChangeMock).not.toHaveBeenCalled();
    });
  });
});

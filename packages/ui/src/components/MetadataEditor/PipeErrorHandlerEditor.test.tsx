import { PipeErrorHandlerEditor } from './PipeErrorHandlerEditor';
import { within } from '@testing-library/dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { pipeErrorHandlerJson } from '../../stubs/PipeErrorHandler';

describe('PipeErrorHandlerEditor', () => {
  it('should render', () => {
    const model = {
      log: {
        parameters: {
          maximumRedeliveries: 3,
          redeliveryDelay: 2000,
        },
      },
    };
    render(<PipeErrorHandlerEditor model={model} onChangeModel={() => {}} schema={pipeErrorHandlerJson} />);
    const element = screen.getByTestId('metadata-editor-form-Log ErrorHandler');
    expect(element).toBeTruthy();
    const inputs = screen.getAllByTestId('num-field');
    expect(inputs.length).toBe(2);
    expect(inputs[0].getAttribute('name')).toBe('log.parameters.maximumRedeliveries');
    expect(inputs[1].getAttribute('name')).toBe('log.parameters.redeliveryDelay');
  });

  it('should not render a form if model is empty', () => {
    render(<PipeErrorHandlerEditor model={{}} onChangeModel={() => {}} schema={pipeErrorHandlerJson} />);
    const element = screen.queryByTestId('metadata-editor-form-Log ErrorHandler');
    expect(element).toBeFalsy();
  });

  it('should render a form if sink ErrorHandler is selected', () => {
    let model: Record<string, unknown> = {};
    render(
      <PipeErrorHandlerEditor
        model={{}}
        onChangeModel={(m) => {
          model = m;
        }}
        schema={pipeErrorHandlerJson}
      />,
    );
    const button = screen.getByRole('button');
    fireEvent(button!, new MouseEvent('click', { bubbles: true }));
    const options = screen.getAllByTestId(/pipe-error-handler-select-option.*/);
    options.forEach((option) => {
      if (option.innerHTML.includes('Log ErrorHandler')) {
        const button = within(option).getByRole('option');
        fireEvent(button, new MouseEvent('click', { bubbles: true }));
      }
    });
    const element = screen.getByTestId('metadata-editor-form-Log ErrorHandler');
    expect(element).toBeTruthy();
    expect(model.log).toBeTruthy();
  });
});

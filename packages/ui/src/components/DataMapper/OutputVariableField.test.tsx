import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DataMapperStepService } from '../../services/datamapper-step.service';
import { OutputVariableField } from './OutputVariableField';

describe('OutputVariableField', () => {
  it('should render an empty input without an error or a success state', () => {
    render(<OutputVariableField value="" onChange={vi.fn()} />);

    const input = screen.getByTestId('output-variable-name-input');
    expect(input).toHaveValue('');
    expect(input.closest('.pf-m-success')).toBeNull();
    expect(input.closest('.pf-m-error')).toBeNull();
    expect(screen.queryByTestId('output-variable-name-error')).not.toBeInTheDocument();
  });

  it('should show the success state for a valid name', () => {
    render(<OutputVariableField value="myVar" onChange={vi.fn()} />);

    const input = screen.getByTestId('output-variable-name-input');
    expect(input).toHaveValue('myVar');
    expect(input.closest('.pf-m-success')).not.toBeNull();
    expect(screen.queryByTestId('output-variable-name-error')).not.toBeInTheDocument();
  });

  it('should show the error state and message for a whitespace-only name', () => {
    render(<OutputVariableField value="   " onChange={vi.fn()} />);

    const input = screen.getByTestId('output-variable-name-input');
    expect(input.closest('.pf-m-error')).not.toBeNull();
    expect(input.closest('.pf-m-success')).toBeNull();
    expect(screen.getByTestId('output-variable-name-error')).toHaveTextContent(
      DataMapperStepService.OUTPUT_VARIABLE_NAME_BLANK,
    );
  });

  it('should call onChange with the typed value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<OutputVariableField value="" onChange={onChange} />);

    await user.type(screen.getByTestId('output-variable-name-input'), 'a');

    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('should disable the input when isDisabled is set', () => {
    render(<OutputVariableField value="" onChange={vi.fn()} isDisabled />);

    expect(screen.getByTestId('output-variable-name-input')).toBeDisabled();
  });
});

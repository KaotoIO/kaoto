import { FieldLabelIcon } from './FieldLabelIcon';
import { screen } from '@testing-library/dom';
import { act, fireEvent, render, waitFor } from '@testing-library/react';

describe('FieldLabelIcon.tsx', () => {
  test('component renders if open', async () => {
    render(<FieldLabelIcon description="This is description" />);

    const element = screen.getByTestId('field-label-icon');
    expect(element).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(element);
    });

    await waitFor(() => expect(screen.getByTestId('property-description-popover')).toBeInTheDocument());
  });
});

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { IField } from '../../../models/datamapper/document';
import { ChoiceSelectionModal } from './ChoiceSelectionModal';

describe('ChoiceSelectionModal', () => {
  const createMockChoiceField = (
    members: { name: string; displayName?: string }[],
    selectedMemberIndex?: number,
  ): IField => {
    const fields = members.map((m) => ({
      name: m.name,
      displayName: m.displayName ?? m.name,
      fields: [],
    }));
    return {
      name: 'testChoice',
      displayName: 'Test Choice',
      wrapperKind: 'choice',
      fields,
      selectedMemberIndex,
    } as unknown as IField;
  };

  const getTypeaheadInput = () =>
    screen.getByTestId('choice-member-select-typeahead-select-input').querySelector('input')!;

  it('should render modal with choice field displayName in title', () => {
    const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
    render(<ChoiceSelectionModal isOpen={true} choiceField={choiceField} onSelect={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('Choice: Test Choice')).toBeInTheDocument();
  });

  it('should fall back to field name when displayName is empty', () => {
    const choiceField = {
      name: 'rawChoice',
      displayName: '',
      wrapperKind: 'choice',
      fields: [{ name: 'optA', displayName: 'optA', fields: [] }],
    } as unknown as IField;
    render(<ChoiceSelectionModal isOpen={true} choiceField={choiceField} onSelect={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('Choice: rawChoice')).toBeInTheDocument();
  });

  it('should fall back to "Choice" when both displayName and name are empty', () => {
    const choiceField = {
      name: '',
      displayName: '',
      wrapperKind: 'choice',
      fields: [],
    } as unknown as IField;
    render(<ChoiceSelectionModal isOpen={true} choiceField={choiceField} onSelect={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('Choice: Choice')).toBeInTheDocument();
  });

  it('should show placeholder when no member is pre-selected', () => {
    const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
    render(<ChoiceSelectionModal isOpen={true} choiceField={choiceField} onSelect={jest.fn()} onClose={jest.fn()} />);
    const input = getTypeaheadInput();
    expect(input.getAttribute('placeholder')).toEqual('Select a member...');
  });

  it('should show pre-selected member name in typeahead input', () => {
    const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }], 1);
    render(<ChoiceSelectionModal isOpen={true} choiceField={choiceField} onSelect={jest.fn()} onClose={jest.fn()} />);
    const input = getTypeaheadInput();
    expect(input.getAttribute('value')).toEqual('phone');
  });

  it('should disable Save button when no member is selected', () => {
    const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
    render(<ChoiceSelectionModal isOpen={true} choiceField={choiceField} onSelect={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('should enable Save button when a member is pre-selected', () => {
    const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }], 0);
    render(<ChoiceSelectionModal isOpen={true} choiceField={choiceField} onSelect={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
  });

  it('should call onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
    render(<ChoiceSelectionModal isOpen={true} choiceField={choiceField} onSelect={jest.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onSelect and onClose when Save is clicked with pre-selected member', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }], 1);
    render(<ChoiceSelectionModal isOpen={true} choiceField={choiceField} onSelect={onSelect} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSelect).toHaveBeenCalledWith(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should allow selecting a member from the typeahead and saving', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const choiceField = createMockChoiceField([
      { name: 'email', displayName: 'Email' },
      { name: 'phone', displayName: 'Phone' },
    ]);
    render(<ChoiceSelectionModal isOpen={true} choiceField={choiceField} onSelect={onSelect} onClose={onClose} />);

    const input = getTypeaheadInput();
    act(() => {
      fireEvent.click(input);
    });

    await waitFor(() => {
      expect(screen.getByText('Phone')).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(screen.getByText('Phone'));
    });

    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSelect).toHaveBeenCalledWith(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onSelect when Save is clicked without selection', () => {
    const onSelect = jest.fn();
    const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
    render(<ChoiceSelectionModal isOpen={true} choiceField={choiceField} onSelect={onSelect} onClose={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should show all members when typeahead is opened', async () => {
    const choiceField = createMockChoiceField([
      { name: 'email', displayName: 'Email' },
      { name: 'phone', displayName: 'Phone' },
      { name: 'fax', displayName: 'Fax' },
    ]);
    render(<ChoiceSelectionModal isOpen={true} choiceField={choiceField} onSelect={jest.fn()} onClose={jest.fn()} />);

    const input = getTypeaheadInput();
    act(() => {
      fireEvent.click(input);
    });

    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Fax')).toBeInTheDocument();
    });
  });

  it('should fall back to member name when displayName is empty', () => {
    const choiceField = {
      name: 'testChoice',
      displayName: 'Test Choice',
      wrapperKind: 'choice',
      fields: [
        { name: 'email', displayName: '', fields: [] },
        { name: 'phone', displayName: undefined, fields: [] },
      ],
      selectedMemberIndex: 0,
    } as unknown as IField;
    render(<ChoiceSelectionModal isOpen={true} choiceField={choiceField} onSelect={jest.fn()} onClose={jest.fn()} />);

    const input = getTypeaheadInput();
    expect(input.getAttribute('value')).toEqual('email');
  });

  it('should handle choiceField with undefined fields', () => {
    const choiceField = {
      name: 'emptyChoice',
      displayName: 'Empty',
      wrapperKind: 'choice',
      fields: undefined,
    } as unknown as IField;
    render(<ChoiceSelectionModal isOpen={true} choiceField={choiceField} onSelect={jest.fn()} onClose={jest.fn()} />);

    const input = getTypeaheadInput();
    expect(input.getAttribute('placeholder')).toEqual('Select a member...');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('should update typeahead input after selecting a member', async () => {
    const choiceField = createMockChoiceField([
      { name: 'email', displayName: 'Email' },
      { name: 'phone', displayName: 'Phone' },
    ]);
    render(<ChoiceSelectionModal isOpen={true} choiceField={choiceField} onSelect={jest.fn()} onClose={jest.fn()} />);

    const input = getTypeaheadInput();
    act(() => {
      fireEvent.click(input);
    });

    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(screen.getByText('Email'));
    });

    expect(input.getAttribute('value')).toEqual('Email');
  });
});

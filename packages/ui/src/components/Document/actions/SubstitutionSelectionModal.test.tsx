import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { Types } from '../../../models/datamapper';
import { IField } from '../../../models/datamapper/document';
import { IFieldSubstituteInfo } from '../../../models/datamapper/types';
import { QName } from '../../../xml-schema-ts/QName';
import { SubstitutionSelectionModal } from './SubstitutionSelectionModal';

describe('SubstitutionSelectionModal', () => {
  const createMockAbstractField = (
    candidates: Array<{ qname: string; displayName: string; namespaceURI?: string; localPart?: string }>,
    selectedMemberIndex?: number,
  ): { abstractField: IField; candidatesMap: Record<string, IFieldSubstituteInfo> } => {
    const fields = candidates.map((c) => ({
      name: c.localPart || c.qname.split(':')[1] || c.qname,
      displayName: c.displayName,
      namespaceURI: c.namespaceURI || 'http://example.com',
      fields: [],
    }));

    const candidatesMap: Record<string, IFieldSubstituteInfo> = {};
    candidates.forEach((c) => {
      const localPart = c.localPart || c.qname.split(':')[1] || c.qname;
      const namespaceURI = c.namespaceURI || 'http://example.com';
      candidatesMap[c.qname] = {
        displayName: c.displayName,
        qname: new QName(namespaceURI, localPart),
        type: Types.String,
        typeQName: new QName('http://www.w3.org/2001/XMLSchema', 'string'),
        namedTypeFragmentRefs: [],
      };
    });

    return {
      abstractField: {
        name: 'testAbstract',
        displayName: 'Test Abstract',
        wrapperKind: 'abstract',
        fields,
        selectedMemberIndex,
      } as unknown as IField,
      candidatesMap,
    };
  };

  const getTypeaheadInput = () =>
    screen.getByTestId('substitution-member-select-typeahead-select-input').querySelector('input')!;

  it('should render modal with abstract field displayName in title', () => {
    const { abstractField, candidatesMap } = createMockAbstractField([
      { qname: 'ns:Email', displayName: 'Email' },
      { qname: 'ns:Phone', displayName: 'Phone' },
    ]);
    render(
      <SubstitutionSelectionModal
        isOpen={true}
        abstractField={abstractField}
        candidates={candidatesMap}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('Substitution: Test Abstract')).toBeInTheDocument();
  });

  it('should fall back to field name when displayName is empty', () => {
    const { candidatesMap } = createMockAbstractField([{ qname: 'ns:Email', displayName: 'Email' }]);
    const abstractField = {
      name: 'rawAbstract',
      displayName: '',
      wrapperKind: 'abstract',
      fields: [],
    } as unknown as IField;
    render(
      <SubstitutionSelectionModal
        isOpen={true}
        abstractField={abstractField}
        candidates={candidatesMap}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('Substitution: rawAbstract')).toBeInTheDocument();
  });

  it('should fall back to "Abstract" when both displayName and name are empty', () => {
    const { candidatesMap } = createMockAbstractField([{ qname: 'ns:Email', displayName: 'Email' }]);
    const abstractField = {
      name: '',
      displayName: '',
      wrapperKind: 'abstract',
      fields: [],
    } as unknown as IField;
    render(
      <SubstitutionSelectionModal
        isOpen={true}
        abstractField={abstractField}
        candidates={candidatesMap}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('Substitution: Abstract')).toBeInTheDocument();
  });

  it('should show placeholder when no substitute is pre-selected', () => {
    const { abstractField, candidatesMap } = createMockAbstractField([
      { qname: 'ns:Email', displayName: 'Email' },
      { qname: 'ns:Phone', displayName: 'Phone' },
    ]);
    render(
      <SubstitutionSelectionModal
        isOpen={true}
        abstractField={abstractField}
        candidates={candidatesMap}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    const input = getTypeaheadInput();
    expect(input.getAttribute('placeholder')).toEqual('Select a substitute...');
  });

  it('should show pre-selected substitute name in typeahead input', () => {
    const { abstractField, candidatesMap } = createMockAbstractField(
      [
        { qname: 'ns:Email', displayName: 'Email', localPart: 'Email', namespaceURI: 'http://example.com' },
        { qname: 'ns:Phone', displayName: 'Phone', localPart: 'Phone', namespaceURI: 'http://example.com' },
      ],
      1,
    );
    render(
      <SubstitutionSelectionModal
        isOpen={true}
        abstractField={abstractField}
        candidates={candidatesMap}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    const input = getTypeaheadInput();
    expect(input.getAttribute('value')).toEqual('Phone');
  });

  it('should disable Save button when no substitute is selected', () => {
    const { abstractField, candidatesMap } = createMockAbstractField([
      { qname: 'ns:Email', displayName: 'Email' },
      { qname: 'ns:Phone', displayName: 'Phone' },
    ]);
    render(
      <SubstitutionSelectionModal
        isOpen={true}
        abstractField={abstractField}
        candidates={candidatesMap}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('should enable Save button when a substitute is pre-selected', () => {
    const { abstractField, candidatesMap } = createMockAbstractField(
      [
        { qname: 'ns:Email', displayName: 'Email', localPart: 'Email', namespaceURI: 'http://example.com' },
        { qname: 'ns:Phone', displayName: 'Phone', localPart: 'Phone', namespaceURI: 'http://example.com' },
      ],
      0,
    );
    render(
      <SubstitutionSelectionModal
        isOpen={true}
        abstractField={abstractField}
        candidates={candidatesMap}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
  });

  it('should call onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    const { abstractField, candidatesMap } = createMockAbstractField([
      { qname: 'ns:Email', displayName: 'Email' },
      { qname: 'ns:Phone', displayName: 'Phone' },
    ]);
    render(
      <SubstitutionSelectionModal
        isOpen={true}
        abstractField={abstractField}
        candidates={candidatesMap}
        onSelect={jest.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onSelect and onClose when Save is clicked with pre-selected substitute', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { abstractField, candidatesMap } = createMockAbstractField(
      [
        { qname: 'ns:Email', displayName: 'Email', localPart: 'Email', namespaceURI: 'http://example.com' },
        { qname: 'ns:Phone', displayName: 'Phone', localPart: 'Phone', namespaceURI: 'http://example.com' },
      ],
      1,
    );
    render(
      <SubstitutionSelectionModal
        isOpen={true}
        abstractField={abstractField}
        candidates={candidatesMap}
        onSelect={onSelect}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSelect).toHaveBeenCalledWith('ns:Phone');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should allow selecting a substitute from the typeahead and saving', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { abstractField, candidatesMap } = createMockAbstractField([
      { qname: 'ns:Email', displayName: 'Email' },
      { qname: 'ns:Phone', displayName: 'Phone' },
    ]);
    render(
      <SubstitutionSelectionModal
        isOpen={true}
        abstractField={abstractField}
        candidates={candidatesMap}
        onSelect={onSelect}
        onClose={onClose}
      />,
    );

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

    expect(onSelect).toHaveBeenCalledWith('ns:Phone');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onSelect when Save is clicked without selection', () => {
    const onSelect = jest.fn();
    const { abstractField, candidatesMap } = createMockAbstractField([
      { qname: 'ns:Email', displayName: 'Email' },
      { qname: 'ns:Phone', displayName: 'Phone' },
    ]);
    render(
      <SubstitutionSelectionModal
        isOpen={true}
        abstractField={abstractField}
        candidates={candidatesMap}
        onSelect={onSelect}
        onClose={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should show all candidates when typeahead is opened', async () => {
    const { abstractField, candidatesMap } = createMockAbstractField([
      { qname: 'ns:Email', displayName: 'Email' },
      { qname: 'ns:Phone', displayName: 'Phone' },
      { qname: 'ns:Fax', displayName: 'Fax' },
    ]);
    render(
      <SubstitutionSelectionModal
        isOpen={true}
        abstractField={abstractField}
        candidates={candidatesMap}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

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

  it('should update typeahead input after selecting a substitute', async () => {
    const { abstractField, candidatesMap } = createMockAbstractField([
      { qname: 'ns:Email', displayName: 'Email' },
      { qname: 'ns:Phone', displayName: 'Phone' },
    ]);
    render(
      <SubstitutionSelectionModal
        isOpen={true}
        abstractField={abstractField}
        candidates={candidatesMap}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

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

  it('should handle empty candidates map', () => {
    const abstractField = {
      name: 'emptyAbstract',
      displayName: 'Empty',
      wrapperKind: 'abstract',
      fields: [],
    } as unknown as IField;
    render(
      <SubstitutionSelectionModal
        isOpen={true}
        abstractField={abstractField}
        candidates={{}}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const input = getTypeaheadInput();
    expect(input.getAttribute('placeholder')).toEqual('Select a substitute...');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('should handle abstractField with no selected member when fields exist', () => {
    const { abstractField, candidatesMap } = createMockAbstractField([
      { qname: 'ns:Email', displayName: 'Email', localPart: 'Email', namespaceURI: 'http://example.com' },
    ]);
    abstractField.selectedMemberIndex = undefined;

    render(
      <SubstitutionSelectionModal
        isOpen={true}
        abstractField={abstractField}
        candidates={candidatesMap}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const input = getTypeaheadInput();
    expect(input.getAttribute('placeholder')).toEqual('Select a substitute...');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FunctionComponent, PropsWithChildren } from 'react';
import { vi } from 'vitest';

import { IField } from '../../../models/datamapper/document';
import { DocumentNodeData, FieldNodeData } from '../../../models/datamapper/visualization';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { VisualizationUtilService } from '../../../services/visualization/visualization-util.service';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';
import { FieldNodePopover } from './FieldNodePopover';

describe('FieldNodePopover', () => {
  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <DataMapperProvider>{children}</DataMapperProvider>
  );

  const createFieldNodeData = () => {
    const shipOrderDoc = TestUtil.createSourceOrderDoc();
    const documentNodeData = new DocumentNodeData(shipOrderDoc);
    const field = shipOrderDoc.fields[0]; // Get first field
    return new FieldNodeData(documentNodeData, field);
  };

  it('should not render for non-field nodes (DocumentNodeData)', () => {
    const shipOrderDoc = TestUtil.createSourceOrderDoc();
    const documentNodeData = new DocumentNodeData(shipOrderDoc);

    const { container } = render(<FieldNodePopover nodeData={documentNodeData} />, { wrapper });

    expect(container.firstChild).toBeNull();
  });

  it('should not render when getField returns undefined', () => {
    const fieldNodeData = createFieldNodeData();
    const getFieldSpy = vi.spyOn(VisualizationUtilService, 'getField').mockReturnValue(undefined);

    const { container } = render(<FieldNodePopover nodeData={fieldNodeData} />, { wrapper });

    expect(container.firstChild).toBeNull();
    getFieldSpy.mockRestore();
  });

  it('should render popover button for FieldNodeData', () => {
    const fieldNodeData = createFieldNodeData();

    render(<FieldNodePopover nodeData={fieldNodeData} />, { wrapper });

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should display field type in popover content', async () => {
    const user = userEvent.setup();
    const fieldNodeData = createFieldNodeData();

    render(<FieldNodePopover nodeData={fieldNodeData} />, { wrapper });

    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Category:')).toBeInTheDocument();
    });
    // The actual type will be from the test data (Container for the first field)
    expect(screen.getByText('Container')).toBeInTheDocument();
  });

  it('should display minOccurs and maxOccurs', async () => {
    const user = userEvent.setup();
    const fieldNodeData = createFieldNodeData();

    render(<FieldNodePopover nodeData={fieldNodeData} />, { wrapper });

    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Min Occurs:')).toBeInTheDocument();
    });
    expect(screen.getByText('Max Occurs:')).toBeInTheDocument();
  });

  it('should not display popover when enabled is false', () => {
    const fieldNodeData = createFieldNodeData();

    const { container } = render(<FieldNodePopover nodeData={fieldNodeData} enabled={false} />, { wrapper });

    expect(container.firstChild).toBeNull();
  });

  it('should use default empty namespaceMap when not provided', async () => {
    const user = userEvent.setup();
    const fieldNodeData = createFieldNodeData();

    render(<FieldNodePopover nodeData={fieldNodeData} />, { wrapper });

    const button = screen.getByRole('button');
    await user.click(button);

    // Should render without errors
    await waitFor(() => {
      expect(screen.getByText('Category:')).toBeInTheDocument();
    });
  });

  it('should use provided namespaceMap', async () => {
    const user = userEvent.setup();
    const fieldNodeData = createFieldNodeData();
    const namespaceMap = { 'https://example.com': 'ex' };

    render(<FieldNodePopover nodeData={fieldNodeData} namespaceMap={namespaceMap} />, { wrapper });

    const button = screen.getByRole('button');
    await user.click(button);

    // Should render without errors with the provided namespaceMap
    await waitFor(() => {
      expect(screen.getByText('Category:')).toBeInTheDocument();
    });
  });

  it('should stop event propagation when popover button is clicked', async () => {
    const user = userEvent.setup();
    const fieldNodeData = createFieldNodeData();
    const parentClickHandler = vi.fn();

    render(
      <div onClick={parentClickHandler}>
        <FieldNodePopover nodeData={fieldNodeData} />
      </div>,
      { wrapper },
    );

    const button = screen.getByRole('button', { name: 'More info' });
    await user.click(button);

    // The parent onClick should not be called due to stopPropagation
    expect(parentClickHandler).not.toHaveBeenCalled();
  });

  it('should render popover with field information', async () => {
    const user = userEvent.setup();
    const fieldNodeData = createFieldNodeData();

    render(<FieldNodePopover nodeData={fieldNodeData} />, { wrapper });

    const button = screen.getByRole('button');
    await user.click(button);

    // Verify the popover content is displayed
    await waitFor(() => {
      expect(screen.getByText('Category:')).toBeInTheDocument();
    });
    expect(screen.getByText('Min Occurs:')).toBeInTheDocument();
    expect(screen.getByText('Max Occurs:')).toBeInTheDocument();
  });

  it('should have accessible label on button', () => {
    const fieldNodeData = createFieldNodeData();

    render(<FieldNodePopover nodeData={fieldNodeData} />, { wrapper });

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
  });

  it('should render information icon', () => {
    const fieldNodeData = createFieldNodeData();

    render(<FieldNodePopover nodeData={fieldNodeData} />, { wrapper });

    // The Information icon should be rendered
    const button = screen.getByRole('button');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });
  it('should display field description when present', async () => {
    const user = userEvent.setup();
    const shipOrderDoc = TestUtil.createSourceOrderDoc();
    const documentNodeData = new DocumentNodeData(shipOrderDoc);
    const baseField = shipOrderDoc.fields[0];
    const fieldWithDescription = { ...baseField, description: 'Test description' } as unknown as IField;
    const getFieldSpy = vi.spyOn(VisualizationUtilService, 'getField').mockReturnValue(fieldWithDescription);
    const fieldNodeData = new FieldNodeData(documentNodeData, baseField);

    render(<FieldNodePopover nodeData={fieldNodeData} />, { wrapper });

    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Description:')).toBeInTheDocument();
    });
    expect(screen.getByText('Test description')).toBeInTheDocument();

    getFieldSpy.mockRestore();
  });

  it('should display namespace URI when present', async () => {
    const user = userEvent.setup();
    const shipOrderDoc = TestUtil.createSourceOrderDoc();
    const documentNodeData = new DocumentNodeData(shipOrderDoc);
    const baseField = shipOrderDoc.fields[0];
    const fieldWithNamespace = {
      ...baseField,
      namespaceURI: 'http://example.com/schema',
      namespacePrefix: 'ex',
    } as unknown as IField;
    const getFieldSpy = vi.spyOn(VisualizationUtilService, 'getField').mockReturnValue(fieldWithNamespace);
    const fieldNodeData = new FieldNodeData(documentNodeData, baseField);
    const namespaceMap = { ex: 'http://example.com/schema' };

    render(<FieldNodePopover nodeData={fieldNodeData} namespaceMap={namespaceMap} />, { wrapper });

    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Namespace:')).toBeInTheDocument();
    });
    expect(screen.getByText('http://example.com/schema')).toBeInTheDocument();

    getFieldSpy.mockRestore();
  });

  it('should display namespace URI without prefix when prefix is not in namespaceMap', async () => {
    const user = userEvent.setup();
    const shipOrderDoc = TestUtil.createSourceOrderDoc();
    const documentNodeData = new DocumentNodeData(shipOrderDoc);
    const baseField = shipOrderDoc.fields[0];
    const fieldWithNamespace = {
      ...baseField,
      namespaceURI: 'http://example.com/schema',
      namespacePrefix: 'ex',
    } as unknown as IField;
    const getFieldSpy = vi.spyOn(VisualizationUtilService, 'getField').mockReturnValue(fieldWithNamespace);
    const fieldNodeData = new FieldNodeData(documentNodeData, baseField);
    const namespaceMap = {}; // Empty namespace map

    render(<FieldNodePopover nodeData={fieldNodeData} namespaceMap={namespaceMap} />, { wrapper });

    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Namespace:')).toBeInTheDocument();
    });
    expect(screen.getByText('http://example.com/schema')).toBeInTheDocument();

    getFieldSpy.mockRestore();
  });

  it('should display Attribute when field is an attribute', async () => {
    const user = userEvent.setup();
    const shipOrderDoc = TestUtil.createSourceOrderDoc();
    const documentNodeData = new DocumentNodeData(shipOrderDoc);
    const baseField = shipOrderDoc.fields[0];
    const attributeField = { ...baseField, isAttribute: true } as unknown as IField;
    const getFieldSpy = vi.spyOn(VisualizationUtilService, 'getField').mockReturnValue(attributeField);
    const fieldNodeData = new FieldNodeData(documentNodeData, baseField);

    render(<FieldNodePopover nodeData={fieldNodeData} />, { wrapper });

    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Attribute:')).toBeInTheDocument();
    });
    expect(screen.getByText('yes')).toBeInTheDocument();

    getFieldSpy.mockRestore();
  });

  it('should display wrapperKind when field has wrapperKind', async () => {
    const user = userEvent.setup();
    const shipOrderDoc = TestUtil.createSourceOrderDoc();
    const documentNodeData = new DocumentNodeData(shipOrderDoc);
    const baseField = shipOrderDoc.fields[0];
    const fieldWithWrapper = { ...baseField, wrapperKind: 'COLLECTION' } as unknown as IField;
    const getFieldSpy = vi.spyOn(VisualizationUtilService, 'getField').mockReturnValue(fieldWithWrapper);
    const fieldNodeData = new FieldNodeData(documentNodeData, baseField);

    render(<FieldNodePopover nodeData={fieldNodeData} />, { wrapper });

    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Wrapper Kind:')).toBeInTheDocument();
    });
    expect(screen.getByText('COLLECTION')).toBeInTheDocument();

    getFieldSpy.mockRestore();
  });

  it('should display override information when present', async () => {
    const user = userEvent.setup();
    const shipOrderDoc = TestUtil.createSourceOrderDoc();
    const documentNodeData = new DocumentNodeData(shipOrderDoc);
    const baseField = shipOrderDoc.fields[0];
    const fieldWithOverride = {
      ...baseField,
      typeOverride: 'string',
      namespaceOverride: 'https://override.com',
    } as unknown as IField;
    const getFieldSpy = vi.spyOn(VisualizationUtilService, 'getField').mockReturnValue(fieldWithOverride);
    const fieldNodeData = new FieldNodeData(documentNodeData, baseField);
    const namespaceMap = { 'https://override.com': 'override' };

    render(<FieldNodePopover nodeData={fieldNodeData} namespaceMap={namespaceMap} />, { wrapper });

    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Original type:')).toBeInTheDocument();
    });
    expect(screen.getByText('Overridden type:')).toBeInTheDocument();

    getFieldSpy.mockRestore();
  });
});

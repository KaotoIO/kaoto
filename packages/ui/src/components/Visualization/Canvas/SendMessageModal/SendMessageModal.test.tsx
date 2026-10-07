import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DynamicCatalogRegistry } from '../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind, ICamelComponentDefinition } from '../../../../models';
import { ISendMessageModalOptions } from '../../../../models/send-message';
import { SendMessageModalProvider, useSendMessageModal } from '../../../../providers/send-message-modal.provider';
import { SendMessageModal } from './SendMessageModal';

describe('SendMessageModal', () => {
  const OpenModalHelper = ({ options }: { options: ISendMessageModalOptions }) => {
    const modalContext = useSendMessageModal();
    const openSendMessageModal = modalContext?.openSendMessageModal;
    useEffect(() => {
      openSendMessageModal?.(options);
    }, [openSendMessageModal, options]);
    return null;
  };

  const renderWithProvider = (options: ISendMessageModalOptions) => {
    return render(
      <SendMessageModalProvider>
        <OpenModalHelper options={options} />
        <SendMessageModal />
      </SendMessageModalProvider>,
    );
  };

  const mockCatalog = {
    getAll: vi.fn(),
    get: vi.fn(),
    clearCache: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCatalog.getAll.mockResolvedValue({
      kafka: {
        headers: {
          'kafka.TOPIC': {
            constantName: 'kafka.TOPIC',
            displayName: 'Topic',
            description: 'The topic to produce/consume from',
            javaType: 'String',
            group: 'producer',
            index: 0,
            kind: 'parameter',
            required: false,
            autowired: false,
            deprecated: false,
            secret: false,
          },
        },
      },
      test: {
        headers: {
          TestBoolean: {
            javaType: 'Boolean',
            constantName: 'TestBoolean',
            displayName: 'TestBoolean',
            description: 'Test header',
            group: 'common',
            index: 0,
            kind: 'parameter',
            required: false,
            autowired: false,
            deprecated: false,
            secret: false,
            defaultValue: false,
          },
          TestInteger: {
            javaType: 'Integer',
            constantName: 'TestInteger',
            displayName: 'TestInteger',
            description: 'Test header',
            group: 'common',
            index: 0,
            kind: 'parameter',
            required: false,
            autowired: false,
            deprecated: false,
            secret: false,
          },
        },
      },
      http: {
        headers: {
          CamelHttpMethod: {
            constantName: 'CamelHttpMethod',
            displayName: 'HTTP Method',
            description: 'The HTTP method (GET, POST, etc.)',
            javaType: 'String',
            defaultValue: 'POST',
            group: 'common',
            index: 0,
            kind: 'parameter',
            required: false,
            autowired: false,
            deprecated: false,
            secret: false,
          },
        },
      },
    } as Record<string, Partial<ICamelComponentDefinition>>);
    DynamicCatalogRegistry.get().setCatalog(CatalogKind.Component, mockCatalog as never);
  });

  afterEach(() => {
    DynamicCatalogRegistry.get().clearRegistry();
  });

  it('renders modal with title and initial values', () => {
    renderWithProvider({
      endpoint: 'direct:orders',
      title: 'Send a test message to orders',
      initialBody: 'hello initial body',
      initialHeaders: [{ key: 'content-type', value: 'application/json' }],
    });

    expect(screen.getByText('Send a test message to orders')).toBeInTheDocument();
    const bodyInput = screen.getByTestId('send-message-body-textarea') as HTMLTextAreaElement;
    expect(bodyInput.value).toBe('hello initial body');

    const headerKey = screen.getByDisplayValue('content-type');
    const headerValue = screen.getByDisplayValue('application/json');
    expect(headerKey).toBeInTheDocument();
    expect(headerValue).toBeInTheDocument();
  });

  it('adds and removes headers', () => {
    renderWithProvider({
      endpoint: 'direct:orders',
    });

    const addHeaderBtn = screen.getByTestId('send-message-add-header-btn');
    fireEvent.click(addHeaderBtn);

    const keyInputs = screen.getAllByPlaceholderText('Header key');
    expect(keyInputs).toHaveLength(1);

    fireEvent.change(keyInputs[0], { target: { value: 'Authorization' } });
    expect((keyInputs[0] as HTMLInputElement).value).toBe('Authorization');

    const deleteBtn = screen.getByTestId(/header-delete-btn-/);
    fireEvent.click(deleteBtn);

    expect(screen.queryByPlaceholderText('Header key')).not.toBeInTheDocument();
  });

  it('formats JSON correctly', () => {
    renderWithProvider({
      endpoint: 'direct:orders',
      initialBody: '{"name":"John","age":30}',
    });

    const formatBtn = screen.getByRole('button', { name: 'Format' });
    fireEvent.click(formatBtn);

    const bodyInput = screen.getByTestId('send-message-body-textarea') as HTMLTextAreaElement;
    expect(bodyInput.value).toBe('{\n  "name": "John",\n  "age": 30\n}');
  });

  it('shows warning when formatting invalid JSON', () => {
    renderWithProvider({
      endpoint: 'direct:orders',
      initialBody: '{invalid-json}',
    });

    const formatBtn = screen.getByRole('button', { name: 'Format' });
    fireEvent.click(formatBtn);

    expect(screen.getByTestId('send-message-format-error')).toBeInTheDocument();
  });

  it.each([
    [
      '  <order><id>42</id><active>true</active></order>',
      '<order>\n  <id>\n    42\n  </id>\n  <active>\n    true\n  </active>\n</order>',
    ],
    ['<p>Hello <b>world</b>!</p>', '<p>\n  Hello\n  <b>\n    world\n  </b>\n  !\n</p>'],
    [
      '<myxml>sometext<sub1>anothertext</sub1>againtext</myxml>',
      '<myxml>\n  sometext\n  <sub1>\n    anothertext\n  </sub1>\n  againtext\n</myxml>',
    ],
    ['<root xml:space="preserve">  keep  spaces  </root>', '<root xml:space="preserve">  keep  spaces  </root>'],
    ['<root><![CDATA[a < b]]></root>', '<root>\n  <![CDATA[a < b]]>\n</root>'],
  ])('formats XML including mixed content: %s', (body, expected) => {
    renderWithProvider({ endpoint: 'direct:orders', initialBody: body });
    fireEvent.click(screen.getByRole('button', { name: 'Format' }));
    expect(screen.getByTestId('send-message-body-textarea')).toHaveValue(expected);
    expect(screen.queryByTestId('send-message-format-error')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Format' }));
    expect(screen.getByTestId('send-message-body-textarea')).toHaveValue(expected);
  });

  it.each(['<order><id>42</order>', '{invalid-json}', 'plain text'])(
    'keeps invalid or unsupported content: %s',
    (body) => {
      renderWithProvider({ endpoint: 'direct:orders', initialBody: body });
      fireEvent.click(screen.getByRole('button', { name: 'Format' }));
      expect(screen.getByTestId('send-message-body-textarea')).toHaveValue(body);
      expect(screen.getByTestId('send-message-format-error')).toBeInTheDocument();
    },
  );

  it('pre-populates Camel file headers when a body file is selected', async () => {
    renderWithProvider({
      endpoint: 'direct:orders',
    });

    const fileInput = screen.getByTestId('send-message-body-file-input') as HTMLInputElement;
    const testFile = new File(['file content here'], 'report.pdf', {
      type: 'application/pdf',
      lastModified: 1700000000000,
    });

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('report.pdf')).toBeInTheDocument();
      expect(screen.getByDisplayValue('CamelFileName')).toBeInTheDocument();
      expect(screen.getByDisplayValue('CamelFileLength')).toBeInTheDocument();
      expect(screen.getByDisplayValue('17')).toBeInTheDocument(); // length in bytes
      expect(screen.getByDisplayValue('CamelFileLastModified')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1700000000000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('CamelFileContentType')).toBeInTheDocument();
      expect(screen.getByDisplayValue('application/pdf')).toBeInTheDocument();
    });
  });

  it('submits message and calls onSend callback with formatted payload', async () => {
    const mockOnSend = vi.fn().mockResolvedValue(undefined);
    renderWithProvider({
      endpoint: 'direct:orders',
      initialBody: 'hello test payload',
      initialHeaders: [{ key: 'fail', value: 'true' }],
      onSend: mockOnSend,
    });

    const submitBtn = screen.getByTestId('send-message-submit-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSend).toHaveBeenCalledWith({
        endpoint: 'direct:orders',
        bodyType: 'text',
        body: 'hello test payload',
        bodyFile: undefined,
        bodyEncoding: undefined,
        headers: {
          fail: 'true',
        },
      });
    });
  });

  it('imports a saved text message into the current target and revalidates headers', async () => {
    const onSend = vi.fn();
    renderWithProvider({
      endpoint: 'direct:new-target',
      initialBody: 'old',
      initialHeaders: [{ key: 'Old', value: 'old' }],
      onSend,
    });
    const saved = {
      format: 'kaoto-message',
      version: 1,
      endpoint: 'direct:old-target',
      bodyType: 'text',
      body: 'saved text',
      headers: [{ key: 'TestInteger', value: 'invalid' }],
    };
    fireEvent.change(screen.getByTestId('send-message-template-input'), {
      target: { files: [new File([JSON.stringify(saved)], 'saved.json')] },
    });
    await waitFor(() => expect(screen.getByTestId('send-message-body-textarea')).toHaveValue('saved text'));
    expect(screen.queryByDisplayValue('Old')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByPlaceholderText('Header value')).toBeInvalid());
    expect(screen.getByTestId('send-message-submit-btn')).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText('Header value'), { target: { value: '123' } });
    fireEvent.click(screen.getByTestId('send-message-submit-btn'));
    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'direct:new-target',
          body: 'saved text',
          headers: { TestInteger: '123' },
        }),
      );
    });
  });

  it('imports a binary file body with its bytes and sends to the current endpoint', async () => {
    const onSend = vi.fn();
    renderWithProvider({ endpoint: 'direct:files', initialBody: 'old text', onSend });
    const bodyFile = { name: 'payload.bin', content: 'AP+A', type: 'application/octet-stream', size: 3 };
    fireEvent.change(screen.getByTestId('send-message-template-input'), {
      target: {
        files: [
          new File(
            [
              JSON.stringify({
                format: 'kaoto-message',
                version: 1,
                bodyType: 'file',
                bodyFile,
                headers: [{ key: 'CamelFileName', value: 'custom.bin' }],
              }),
            ],
            'file-message.json',
          ),
        ],
      },
    });
    await waitFor(() => expect(screen.getByTestId('send-message-body-file-path-input')).toHaveValue('payload.bin'));
    expect(screen.queryByTestId('send-message-body-textarea')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('custom.bin')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('send-message-submit-btn'));
    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'direct:files',
          bodyType: 'file',
          bodyEncoding: 'base64',
          bodyFile,
          headers: { CamelFileName: 'custom.bin' },
        }),
      );
    });
  });

  it('reuses a recent message in a newly opened dialog with a different target', async () => {
    const { rerender } = renderWithProvider({ endpoint: 'direct:first' });
    const saved = {
      format: 'kaoto-message',
      version: 1,
      bodyType: 'text',
      body: 'reusable body',
      headers: [{ key: 'Custom', value: 'saved header' }],
    };
    fireEvent.change(screen.getByTestId('send-message-template-input'), {
      target: { files: [new File([JSON.stringify(saved)], 'reusable.json')] },
    });
    await screen.findByRole('button', { name: 'Import reusable.json' });
    fireEvent.change(screen.getByTestId('send-message-body-textarea'), { target: { value: 'unsaved edits' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const onSend = vi.fn();
    rerender(
      <SendMessageModalProvider>
        <OpenModalHelper options={{ endpoint: 'direct:second', initialBody: 'new draft', onSend }} />
        <SendMessageModal />
      </SendMessageModalProvider>,
    );
    expect(screen.getByTestId('send-message-body-textarea')).toHaveValue('new draft');
    fireEvent.click(screen.getByRole('button', { name: 'Import reusable.json' }));
    await waitFor(() => expect(screen.getByTestId('send-message-body-textarea')).toHaveValue('reusable body'));
    fireEvent.click(screen.getByTestId('send-message-submit-btn'));
    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'direct:second',
          body: 'reusable body',
          headers: { Custom: 'saved header' },
        }),
      );
    });
  });

  it('keeps the current message unchanged after a malformed import', async () => {
    renderWithProvider({
      endpoint: 'direct:orders',
      initialBody: 'keep me',
      initialHeaders: [{ key: 'Keep', value: 'value' }],
    });
    fireEvent.change(screen.getByTestId('send-message-template-input'), {
      target: { files: [new File(['{}'], 'invalid.json')] },
    });
    await screen.findByTestId('send-message-template-error');
    expect(screen.getByTestId('send-message-body-textarea')).toHaveValue('keep me');
    expect(screen.getByDisplayValue('Keep')).toBeInTheDocument();
  });

  it('validates numeric headers and allows correction before sending', async () => {
    const onSend = vi.fn();
    renderWithProvider({
      endpoint: 'direct:orders',
      initialHeaders: [{ key: 'TestInteger', value: '2147483648' }],
      onSend,
    });

    await waitFor(() => expect(screen.getByPlaceholderText('Header value')).toBeInvalid());
    const submit = screen.getByTestId('send-message-submit-btn');
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(onSend).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('Header value'), { target: { value: '42' } });
    expect(screen.getByPlaceholderText('Header value')).not.toBeInvalid();
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith(expect.objectContaining({ headers: { TestInteger: '42' } }));
    });
  });

  it('uses a true/false selection for boolean headers and preserves false defaults', async () => {
    const onSend = vi.fn();
    renderWithProvider({ endpoint: 'direct:orders', onSend });
    fireEvent.click(screen.getByTestId('send-message-add-header-btn'));
    fireEvent.change(screen.getByPlaceholderText('Header key'), { target: { value: 'TestBoolean' } });
    fireEvent.mouseDown(await screen.findByText('TestBoolean'));

    const value = await screen.findByRole('combobox', { name: 'Header value' });
    expect(value).toHaveValue('false');
    fireEvent.change(value, { target: { value: 'true' } });
    fireEvent.click(screen.getByTestId('send-message-submit-btn'));
    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith(expect.objectContaining({ headers: { TestBoolean: 'true' } }));
    });
  });

  it('revalidates when a known header is changed to a custom header', async () => {
    renderWithProvider({ endpoint: 'direct:orders', initialHeaders: [{ key: 'TestBoolean', value: 'custom' }] });
    const value = await screen.findByRole('combobox', { name: 'Header value' });
    expect(value).toHaveValue('custom');
    expect(value).toBeInvalid();
    expect(screen.getByTestId('send-message-submit-btn')).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Header key'), { target: { value: 'CustomHeader' } });
    expect(screen.getByPlaceholderText('Header value')).toHaveValue('custom');
    expect(screen.getByPlaceholderText('Header value')).not.toBeInvalid();
    expect(screen.getByTestId('send-message-submit-btn')).toBeEnabled();
  });

  it('filters and selects headers from autocomplete suggestions', async () => {
    renderWithProvider({
      endpoint: 'kafka:orders',
    });

    const addHeaderBtn = screen.getByTestId('send-message-add-header-btn');
    fireEvent.click(addHeaderBtn);

    const keyInput = screen.getByPlaceholderText('Header key');
    fireEvent.focus(keyInput);

    await waitFor(() => {
      expect(screen.getByText('kafka.TOPIC')).toBeInTheDocument();
      expect(screen.getByText('The topic to produce/consume from')).toBeInTheDocument();
      expect(screen.getByText('CamelHttpMethod')).toBeInTheDocument();
    });

    expect(screen.queryByText('kafka', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText('http', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText('String', { exact: true })).not.toBeInTheDocument();

    // Select CamelHttpMethod
    const item = screen.getByText('CamelHttpMethod');
    fireEvent.mouseDown(item);

    await waitFor(() => {
      expect((keyInput as HTMLInputElement).value).toBe('CamelHttpMethod');
      // Should prefill defaultValue 'POST' into header value input
      expect(screen.getByDisplayValue('POST')).toBeInTheDocument();
    });
  });
});

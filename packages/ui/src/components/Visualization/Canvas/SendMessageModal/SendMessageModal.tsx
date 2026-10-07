import './SendMessageModal.scss';

import { Add, Code, DocumentImport, FolderOpen, TrashCan } from '@carbon/icons-react';
import {
  Button,
  ComposedModal,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  RadioButton,
  RadioButtonGroup,
  TextArea,
  TextInput,
} from '@carbon/react';
import { ChangeEvent, FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import xmlFormat from 'xml-formatter';

import { ICamelMessagePayload, IHeaderEntry, IMessageFileBody, MessageBodyType } from '../../../../models/send-message';
import { useSendMessageModal } from '../../../../providers/send-message-modal.provider';
import { validateHeaderValue } from './header-value';
import { HeaderKeyInput } from './HeaderKeyInput';
import { HeaderValueInput } from './HeaderValueInput';
import { MessageTemplate } from './message-template';
import { MessageTemplateActions } from './MessageTemplateActions';
import { ICamelHeaderItem, useCamelHeaders } from './useCamelHeaders';

export interface SendMessageModalProps {
  /** Optional custom test-id */
  'data-testid'?: string;
}

let uniqueIdCounter = 0;
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${++uniqueIdCounter}`;

export const SendMessageModal: FunctionComponent<SendMessageModalProps> = ({
  'data-testid': dataTestId = 'send-message-modal',
}) => {
  const modalContext = useSendMessageModal();

  const isOpen = modalContext?.isOpen ?? false;
  const options = modalContext?.options ?? null;
  const closeSendMessageModal = modalContext?.closeSendMessageModal;
  const sendMessage = modalContext?.sendMessage;
  const isSending = modalContext?.isSending ?? false;
  const error = modalContext?.error ?? null;

  const { headers: headersCatalog } = useCamelHeaders(isOpen);

  const [bodyType, setBodyType] = useState<MessageBodyType>('text');
  const [body, setBody] = useState<string>('');
  const [fileBody, setFileBody] = useState<IMessageFileBody | null>(null);
  const [headers, setHeaders] = useState<IHeaderEntry[]>([]);
  const [isImportingMessage, setIsImportingMessage] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);

  const headerTypes = useMemo(
    () => new Map(headersCatalog.map((header) => [header.name, header.javaType])),
    [headersCatalog],
  );
  const headerErrors = new Map(
    headers.map((header) => [header.id, validateHeaderValue(header.value, headerTypes.get(header.key.trim()))]),
  );
  const hasInvalidHeaders = Array.from(headerErrors.values()).some(Boolean);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bodyFileInputRef = useRef<HTMLInputElement | null>(null);

  // Synchronize initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      setBodyType('text');
      setBody(options?.initialBody ?? '');
      setFileBody(null);
      setHeaders(
        options?.initialHeaders?.map((h) => ({
          id: generateId('header'),
          key: h.key,
          value: h.value,
        })) ?? [],
      );
      setFormatError(null);
      setIsImportingMessage(false);
    }
  }, [isOpen, options]);

  const handleImportMessage = useCallback((template: MessageTemplate) => {
    setBodyType(template.bodyType);
    setBody(template.bodyType === 'text' ? template.body : '');
    setFileBody(template.bodyType === 'file' ? template.bodyFile : null);
    setHeaders(template.headers.map((header) => ({ ...header, id: generateId('header') })));
    setFormatError(null);
  }, []);

  // Headers handlers
  const handleAddHeader = useCallback(() => {
    setHeaders((prev) => [...prev, { id: generateId('header'), key: '', value: '' }]);
  }, []);

  const handleHeaderChange = useCallback(
    (id: string, field: 'key' | 'value', value: string, selectedHeader?: ICamelHeaderItem) => {
      setHeaders((prev) =>
        prev.map((h) => {
          if (h.id !== id) return h;
          if (field === 'key') {
            const updated = { ...h, key: value };
            // If selecting a catalog header with a default value and value is currently empty, pre-fill it
            if (selectedHeader?.defaultValue !== undefined && !h.value) {
              updated.value = String(selectedHeader.defaultValue);
            }
            return updated;
          }
          return { ...h, [field]: value };
        }),
      );
    },
    [],
  );

  const handleDeleteHeader = useCallback((id: string) => {
    setHeaders((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const handleFormat = useCallback(() => {
    if (!body.trim()) return;
    const isXml = body.trimStart().startsWith('<');
    try {
      const formatted = isXml
        ? xmlFormat(body, { indentation: '  ', lineSeparator: '\n', collapseContent: false, strictMode: true })
        : JSON.stringify(JSON.parse(body), null, 2);
      setBody(formatted);
      setFormatError(null);
    } catch {
      setFormatError(
        isXml ? 'Unable to format XML. Check the XML syntax.' : 'Unable to format. Enter valid JSON or XML.',
      );
    }
  }, [body]);

  // Body text file import handler (imports content as string into textarea)
  const handleImportFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileImported = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === 'string') {
          setBody(content);
          setFormatError(null);
        }
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  }, []);

  // Body file selection handler (sets file itself as the Message Body)
  const handleSelectBodyFileClick = useCallback(() => {
    bodyFileInputRef.current?.click();
  }, []);

  const handleBodyFileSelected = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === 'string') {
          const base64Content = content.includes(',') ? content.split(',')[1] : content;
          setFileBody({
            name: file.name,
            content: base64Content,
            type: file.type,
            size: file.size,
          });

          // Pre-populate Camel File Headers (Exchange constants)
          const autoHeaders: Array<{ key: string; value: string }> = [
            { key: 'CamelFileName', value: file.name },
            { key: 'CamelFileLength', value: file.size.toString() },
            { key: 'CamelFileLastModified', value: file.lastModified.toString() },
          ];
          if (file.type) {
            autoHeaders.push({ key: 'CamelFileContentType', value: file.type });
          }

          setHeaders((prev) => {
            const updated = [...prev];
            autoHeaders.forEach(({ key, value }) => {
              const existingIdx = updated.findIndex((h) => h.key === key);
              if (existingIdx >= 0) {
                updated[existingIdx] = { ...updated[existingIdx], value };
              } else {
                updated.push({ id: generateId('header'), key, value });
              }
            });
            return updated;
          });
        }
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  }, []);

  const handleDeleteBodyFile = useCallback(() => {
    setFileBody(null);
  }, []);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!options?.endpoint || hasInvalidHeaders || isImportingMessage) return;

    const headersRecord: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.key.trim()) {
        headersRecord[h.key.trim()] = h.value;
      }
    });

    const payload: ICamelMessagePayload = {
      endpoint: options.endpoint,
      bodyType,
      body: bodyType === 'text' ? body || undefined : undefined,
      bodyFile: bodyType === 'file' ? (fileBody ?? undefined) : undefined,
      bodyEncoding: bodyType === 'file' ? 'base64' : undefined,
      headers: Object.keys(headersRecord).length > 0 ? headersRecord : undefined,
    };

    if (sendMessage) {
      try {
        await sendMessage(payload);
      } catch {
        // error handled in provider
      }
    }
  }, [options?.endpoint, headers, bodyType, body, fileBody, sendMessage, hasInvalidHeaders, isImportingMessage]);

  const modalTitle = options?.title ?? `Send a test message to ${options?.endpoint ?? 'endpoint'}`;
  const modalSubtitle = options?.subtitle ?? 'It goes to the endpoint the route starts from, in the running app.';

  return (
    <ComposedModal
      open={isOpen}
      size="md"
      onClose={closeSendMessageModal}
      data-testid={dataTestId}
      className="send-message-modal"
      aria-label={modalTitle}
    >
      <ModalHeader title={modalTitle} />
      <ModalBody>
        <p className="send-message-modal__subtitle">{modalSubtitle}</p>

        {isOpen && (
          <MessageTemplateActions
            value={{ bodyType, body, bodyFile: fileBody, headers }}
            onImport={handleImportMessage}
            onImportingChange={setIsImportingMessage}
            disabled={isSending}
            recentFiles={modalContext?.recentMessageFiles}
            onRememberFile={modalContext?.rememberMessageFile}
          />
        )}

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileImported}
          data-testid="send-message-file-import-input"
        />
        <input
          ref={bodyFileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleBodyFileSelected}
          data-testid="send-message-body-file-input"
        />

        {/* Body Section */}
        <div className="send-message-modal__section">
          <div className="send-message-modal__section-title">
            <span>Body</span>
          </div>

          <div className="send-message-modal__body-type-selector">
            <RadioButtonGroup
              name="body-type-selector"
              valueSelected={bodyType}
              onChange={(val) => {
                setBodyType(val as MessageBodyType);
              }}
              orientation="horizontal"
              legendText="Payload Type"
            >
              <RadioButton id="body-type-text" value="text" labelText="Text payload (JSON, XML, plain text)" />
              <RadioButton
                id="body-type-file"
                value="file"
                labelText="File payload (Binary / Document / File object)"
              />
            </RadioButtonGroup>
          </div>

          {bodyType === 'text' ? (
            <>
              <TextArea
                id="send-message-body-textarea"
                labelText="Message Body"
                hideLabel
                placeholder="Any text: JSON, XML, plain text..."
                value={body}
                rows={8}
                onChange={(e) => {
                  setBody(e.target.value);
                  setFormatError(null);
                }}
                data-testid="send-message-body-textarea"
              />
              <div className="send-message-modal__body-actions">
                <span className="send-message-modal__body-hint">Any text: JSON, XML, plain text.</span>
                <div className="send-message-modal__body-buttons">
                  <Button
                    kind="ghost"
                    size="sm"
                    renderIcon={Code}
                    onClick={handleFormat}
                    data-testid="send-message-format-btn"
                  >
                    Format
                  </Button>
                  <Button
                    kind="ghost"
                    size="sm"
                    renderIcon={DocumentImport}
                    onClick={handleImportFileClick}
                    data-testid="send-message-import-file-btn"
                  >
                    Import text file
                  </Button>
                </div>
              </div>
              {formatError && (
                <InlineNotification
                  lowContrast
                  kind="warning"
                  title="Formatting Warning"
                  subtitle={formatError}
                  onCloseButtonClick={() => {
                    setFormatError(null);
                  }}
                  data-testid="send-message-format-error"
                />
              )}
            </>
          ) : (
            <div className="send-message-modal__file-path-picker">
              <div className="send-message-modal__file-path-input">
                <TextInput
                  id="send-message-body-file-path"
                  labelText="File Path / Name"
                  placeholder="Select a file or enter file path..."
                  value={fileBody?.name ?? ''}
                  onChange={(e) => {
                    const name = e.target.value;
                    if (name.trim()) {
                      setFileBody((prev) => ({
                        name,
                        content: prev?.content ?? '',
                        type: prev?.type,
                        size: prev?.size,
                      }));
                    } else {
                      setFileBody(null);
                    }
                  }}
                  data-testid="send-message-body-file-path-input"
                />
              </div>
              <Button
                kind="tertiary"
                renderIcon={FolderOpen}
                size="md"
                onClick={handleSelectBodyFileClick}
                data-testid="send-message-browse-file-btn"
              >
                Browse...
              </Button>
              {fileBody && (
                <Button
                  kind="ghost"
                  hasIconOnly
                  renderIcon={TrashCan}
                  iconDescription="Clear file"
                  size="md"
                  onClick={handleDeleteBodyFile}
                  data-testid="send-message-delete-body-file-btn"
                />
              )}
            </div>
          )}
        </div>

        {/* Headers Section */}
        <div className="send-message-modal__section">
          <div className="send-message-modal__section-title">
            <span>Headers</span>
          </div>
          <div className="send-message-modal__headers-list" data-testid="send-message-headers-list">
            {headers.map((h) => (
              <div key={h.id} className="send-message-modal__header-row" data-testid={`send-message-header-${h.id}`}>
                <div className="send-message-modal__header-key">
                  <HeaderKeyInput
                    id={`header-key-${h.id}`}
                    value={h.key}
                    headersCatalog={headersCatalog}
                    onChange={(val, selectedHeader) => {
                      handleHeaderChange(h.id, 'key', val, selectedHeader);
                    }}
                    data-testid={`header-key-input-${h.id}`}
                  />
                </div>
                <div className="send-message-modal__header-value">
                  <HeaderValueInput
                    id={h.id}
                    value={h.value}
                    javaType={headerTypes.get(h.key.trim())}
                    error={headerErrors.get(h.id)}
                    onChange={(value) => {
                      handleHeaderChange(h.id, 'value', value);
                    }}
                  />
                </div>
                <Button
                  kind="ghost"
                  hasIconOnly
                  renderIcon={TrashCan}
                  iconDescription="Delete header"
                  size="md"
                  onClick={() => {
                    handleDeleteHeader(h.id);
                  }}
                  data-testid={`header-delete-btn-${h.id}`}
                />
              </div>
            ))}
          </div>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Add}
            onClick={handleAddHeader}
            data-testid="send-message-add-header-btn"
          >
            Add header
          </Button>
        </div>

        {/* Global Error Notification */}
        {error && (
          <div className="send-message-modal__error-alert">
            <InlineNotification
              lowContrast
              kind="error"
              title="Send Error"
              subtitle={error}
              data-testid="send-message-error-notification"
            />
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeSendMessageModal} disabled={isSending}>
          Cancel
        </Button>
        <Button
          kind="primary"
          onClick={handleSubmit}
          disabled={isSending || isImportingMessage || !options?.endpoint || hasInvalidHeaders}
          data-testid="send-message-submit-btn"
        >
          {isSending ? 'Sending...' : 'Send'}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};

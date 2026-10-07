import { DocumentExport, DocumentImport } from '@carbon/icons-react';
import { Button, InlineNotification, TextInput } from '@carbon/react';
import { FunctionComponent, useEffect, useId, useRef, useState } from 'react';

import {
  MessageTemplate,
  MessageTemplateDraft,
  parseMessageTemplate,
  serializeMessageTemplate,
} from './message-template';

interface MessageTemplateActionsProps {
  value: MessageTemplateDraft;
  onImport: (template: MessageTemplate) => void;
  onImportingChange: (isImporting: boolean) => void;
  disabled?: boolean;
  recentFiles?: File[];
  onRememberFile?: (file: File) => void;
}

export const MessageTemplateActions: FunctionComponent<MessageTemplateActionsProps> = ({
  value,
  onImport,
  onImportingChange,
  disabled = false,
  recentFiles = [],
  onRememberFile,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<FileReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isNamingExport, setIsNamingExport] = useState(false);
  const [exportName, setExportName] = useState('');
  const exportNameId = useId();
  const exportNameRef = useRef<HTMLInputElement>(null);
  const exportBaseName = exportName
    .trim()
    .replace(/\.json$/i, '')
    .trim();
  const invalidExportName =
    /[<>:"/\\|?*]/.test(exportBaseName) ||
    [...exportBaseName].some((character) => character.charCodeAt(0) < 32) ||
    exportBaseName === '.' ||
    exportBaseName === '..';
  const exportUnavailable = disabled || isImporting || (value.bodyType === 'file' && !value.bodyFile);

  useEffect(() => {
    if (isNamingExport) exportNameRef.current?.focus();
  }, [isNamingExport]);

  useEffect(
    () => () => {
      const reader = readerRef.current;
      if (reader) {
        reader.onload = null;
        reader.onerror = null;
        reader.abort();
        onImportingChange(false);
      }
    },
    [onImportingChange],
  );

  const handleExport = () => {
    if (exportUnavailable || !exportBaseName || invalidExportName) return;
    try {
      const blob = new Blob([serializeMessageTemplate(value)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${exportBaseName}.json`;
        link.click();
      } finally {
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);
      }
      setError(null);
      setIsNamingExport(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The message could not be exported.');
    }
  };

  const handleImport = (file: File) => {
    if (disabled || isImporting) return;
    setError(null);
    setIsImporting(true);
    onImportingChange(true);
    const reader = new FileReader();
    readerRef.current = reader;
    const finish = () => {
      readerRef.current = null;
      setIsImporting(false);
      onImportingChange(false);
    };
    const fail = () => {
      setError('The message file could not be read.');
      finish();
    };
    reader.onload = () => {
      try {
        if (typeof reader.result !== 'string') throw new Error('The message file could not be read.');
        onImport(parseMessageTemplate(reader.result));
        // Keep an in-memory copy so quicklinks do not depend on the original file on disk.
        onRememberFile?.(new File([reader.result], file.name, { type: file.type, lastModified: file.lastModified }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'The message could not be imported.');
      } finally {
        finish();
      }
    };
    reader.onerror = fail;
    try {
      reader.readAsText(file);
    } catch {
      fail();
    }
  };

  return (
    <div className="send-message-modal__template-actions">
      <div className="send-message-modal__template-buttons">
        <Button
          kind="tertiary"
          size="sm"
          renderIcon={DocumentImport}
          disabled={disabled || isImporting}
          onClick={() => inputRef.current?.click()}
        >
          {isImporting ? 'Importing message...' : 'Import message'}
        </Button>
        <Button
          kind="tertiary"
          size="sm"
          renderIcon={DocumentExport}
          disabled={exportUnavailable || isNamingExport}
          onClick={() => {
            setError(null);
            setIsNamingExport(true);
          }}
        >
          Export message
        </Button>
      </div>
      {isNamingExport && (
        <div className="send-message-modal__export-name">
          <TextInput
            id={exportNameId}
            ref={exportNameRef}
            labelText="File name"
            helperText="The .json extension is added automatically."
            placeholder="e.g. order-message"
            value={exportName}
            disabled={exportUnavailable}
            invalid={invalidExportName}
            invalidText="Enter a file name without path separators or special characters."
            onChange={(event) => {
              setExportName(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleExport();
              }
            }}
          />
          <div className="send-message-modal__template-buttons">
            <Button
              kind="primary"
              size="sm"
              disabled={exportUnavailable || !exportBaseName || invalidExportName}
              onClick={handleExport}
            >
              Download
            </Button>
            <Button
              kind="ghost"
              size="sm"
              onClick={() => {
                setIsNamingExport(false);
              }}
            >
              Cancel export
            </Button>
          </div>
        </div>
      )}
      {recentFiles.length > 0 && (
        <div className="send-message-modal__recent-messages" aria-label="Recent messages">
          <span className="send-message-modal__recent-label">Recent messages:</span>
          {recentFiles.map((file) => (
            <Button
              key={JSON.stringify([file.name, file.size, file.lastModified])}
              kind="ghost"
              size="sm"
              className="send-message-modal__recent-file"
              disabled={disabled || isImporting}
              aria-label={`Import ${file.name}`}
              title={file.name}
              onClick={() => {
                handleImport(file);
              }}
            >
              <span>{file.name}</span>
            </Button>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) handleImport(file);
        }}
        data-testid="send-message-template-input"
      />
      {error && (
        <InlineNotification
          kind="error"
          lowContrast
          title="Message file error"
          subtitle={error}
          onCloseButtonClick={() => {
            setError(null);
          }}
          data-testid="send-message-template-error"
        />
      )}
    </div>
  );
};

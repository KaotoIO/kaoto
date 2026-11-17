import { Button, InlineLoading, InlineNotification, TextInput } from '@carbon/react';
import { FunctionComponent, useCallback, useState } from 'react';

import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { SchemaLoadedResult } from '../RestDslImportTypes';

type UriImportSourceProps = {
  onSchemaLoaded: (result: SchemaLoadedResult) => { error?: string };
  /** Called when the URI is edited after a load, so what was derived from the previous URI is discarded */
  onCleared?: () => void;
  /** URI kept by the wizard, so it survives the step being unmounted */
  initialUri?: string;
  onUriChange?: (uri: string) => void;
  /** Whether the wizard already holds the specification fetched from this URI */
  loaded?: boolean;
};

export const UriImportSource: FunctionComponent<UriImportSourceProps> = ({
  onSchemaLoaded,
  onCleared,
  initialUri = '',
  onUriChange,
  loaded = false,
}) => {
  const [uri, setUri] = useState(initialUri);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(loaded);
  const [error, setError] = useState('');
  const startRequest = useLatestRequest();

  const handleFetch = useCallback(async () => {
    const trimmed = uri.trim();
    const isLatest = startRequest();

    setIsLoading(true);
    setError('');
    setIsLoaded(false);

    try {
      const response = await fetch(trimmed);
      if (!response.ok) {
        throw new Error(`Failed to fetch specification (HTTP ${response.status})`);
      }
      const specText = await response.text();
      if (!isLatest()) return;

      const loadResult = onSchemaLoaded({
        schema: specText,
        source: 'uri',
        sourceIdentifier: trimmed,
      });

      if (loadResult?.error) {
        setError(loadResult.error);
        setIsLoaded(false);
      } else {
        setIsLoaded(true);
        setError('');
      }
    } catch (err) {
      if (isLatest()) {
        const message = err instanceof Error ? err.message : 'Failed to fetch the specification.';
        setError(message);
        setIsLoaded(false);
      }
    } finally {
      if (isLatest()) {
        setIsLoading(false);
      }
    }
  }, [uri, startRequest, onSchemaLoaded]);

  /** Editing the URI makes both a pending fetch and the specification already loaded obsolete */
  const handleUriChange = (nextUri: string) => {
    setUri(nextUri);
    onUriChange?.(nextUri);
    startRequest();
    setIsLoading(false);
    setError('');
    if (isLoaded || loaded) {
      setIsLoaded(false);
      onCleared?.();
    }
  };

  return (
    <div className="rest-dsl-import-uri">
      <div className="rest-dsl-import-uri-row">
        <TextInput
          id="rest-openapi-spec-uri"
          labelText="Open API specification URI"
          value={uri}
          onChange={(event) => {
            handleUriChange(event.target.value);
          }}
          placeholder="https://example.com/openapi.yaml"
        />{' '}
        <Button
          kind="secondary"
          size="md"
          className="rest-dsl-import-inline-button"
          onClick={handleFetch}
          disabled={!uri.trim() || isLoading}
        >
          Fetch
        </Button>
      </div>
      {isLoading && <InlineLoading description="Fetching specification..." />}
      {isLoaded && <InlineNotification kind="success" lowContrast hideCloseButton title="Loaded" />}
      {error && <InlineNotification kind="error" lowContrast hideCloseButton role="alert" title={error} />}
    </div>
  );
};

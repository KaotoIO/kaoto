import { Button, FormHelperText, HelperText, HelperTextItem, TextInput } from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useState } from 'react';

import { SchemaLoadedResult } from '../RestDslImportTypes';

type UriImportSourceProps = {
  onSchemaLoaded: (result: SchemaLoadedResult) => void;
};

export const UriImportSource: FunctionComponent<UriImportSourceProps> = ({ onSchemaLoaded }) => {
  const [uri, setUri] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState('');

  const handleFetch = useCallback(async () => {
    const trimmed = uri.trim();
    if (!trimmed) {
      setError('Provide a specification URI to fetch.');
      return;
    }

    setIsLoading(true);
    setError('');
    setIsLoaded(false);

    try {
      const response = await fetch(trimmed);
      if (!response.ok) {
        throw new Error(`Failed to fetch specification (${response.status})`);
      }
      const specText = await response.text();

      onSchemaLoaded({
        schema: specText,
        source: 'uri',
        sourceIdentifier: trimmed,
      });

      setIsLoaded(true);
      setError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch the specification.';
      setError(message);
      setIsLoaded(false);
    } finally {
      setIsLoading(false);
    }
  }, [uri, onSchemaLoaded]);

  return (
    <div className="rest-dsl-import-source">
      <div className="rest-dsl-import-uri-row">
        <TextInput
          id="rest-openapi-spec-uri"
          aria-label="Open API specification URI"
          value={uri}
          onChange={(_event, value) => setUri(value)}
          placeholder="https://example.com/openapi.yaml"
        />
        <Button variant="secondary" onClick={handleFetch} isDisabled={!uri.trim() || isLoading} isLoading={isLoading}>
          Fetch
        </Button>
      </div>
      {isLoaded && (
        <span className="rest-dsl-import-success rest-dsl-import-success-block">
          <CheckCircleIcon /> Loaded
        </span>
      )}
      {error && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant="error">{error}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </div>
  );
};

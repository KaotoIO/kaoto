import { Button, List, ListItem, Radio, SearchInput } from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';

import { ApicurioArtifact, ApicurioArtifactSearchResult, SchemaLoadedResult } from '../RestDslImportTypes';

type ApicurioImportSourceProps = {
  registryUrl?: string;
  onSchemaLoaded: (result: SchemaLoadedResult) => { error?: string };
};

export const ApicurioImportSource: FunctionComponent<ApicurioImportSourceProps> = ({ registryUrl, onSchemaLoaded }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [artifacts, setArtifacts] = useState<ApicurioArtifact[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState('');

  const [requestVersion, setRequestVersion] = useState(0);
  const request = useMemo(() => ({ registryUrl, requestVersion }), [registryUrl, requestVersion]);
  const [completedRequest, setCompletedRequest] = useState<typeof request>();
  const isFetchingArtifacts = !!registryUrl && completedRequest !== request;

  useEffect(() => {
    if (!registryUrl) return;
    let cancelled = false;
    const fetchArtifacts = async () => {
      try {
        const response = await fetch(`${registryUrl}/apis/registry/v2/search/artifacts`);
        if (!response.ok) throw new Error(`Failed to fetch artifacts (${response.status})`);
        const result = (await response.json()) as ApicurioArtifactSearchResult;
        if (cancelled) return;
        setArtifacts((result.artifacts ?? []).filter((artifact) => artifact.type === 'OPENAPI'));
        setError('');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to fetch artifacts from Apicurio Registry.');
        }
      } finally {
        if (!cancelled) setCompletedRequest(request);
      }
    };
    void fetchArtifacts();
    return () => {
      cancelled = true;
    };
  }, [registryUrl, request]);

  const fetchArtifacts = () => {
    setError('');
    setRequestVersion((version) => version + 1);
  };
  const filteredArtifacts = searchTerm.trim()
    ? artifacts.filter((artifact) =>
        (artifact.name ?? artifact.id ?? '').toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : artifacts;

  const handleLoadArtifact = useCallback(
    async (artifactId: string) => {
      if (!registryUrl) return;

      setIsLoading(true);
      setError('');
      setIsLoaded(false);

      try {
        const artifactUrl = `${registryUrl}/apis/registry/v2/groups/default/artifacts/${artifactId}`;
        const response = await fetch(artifactUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch artifact (${response.status})`);
        }
        const specText = await response.text();

        const loadResult = onSchemaLoaded({
          schema: specText,
          source: 'apicurio',
          sourceIdentifier: artifactUrl,
        });

        if (loadResult?.error) {
          setError(loadResult.error);
          setIsLoaded(false);
        } else {
          setIsLoaded(true);
          setError('');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to download the selected artifact.';
        setError(message);
        setIsLoaded(false);
      } finally {
        setIsLoading(false);
      }
    },
    [registryUrl, onSchemaLoaded],
  );

  const handleSelectArtifact = useCallback(
    (artifactId: string) => {
      setSelectedId(artifactId);
      handleLoadArtifact(artifactId).catch((error) => {
        console.error('Failed to load artifact:', error);
      });
    },
    [handleLoadArtifact],
  );

  if (!registryUrl) {
    return (
      <div className="rest-dsl-import-source rest-dsl-import-apicurio">
        <span className="rest-dsl-import-note">
          Configure the Apicurio Registry URL in Settings to enable this option.
        </span>
      </div>
    );
  }

  return (
    <div className="rest-dsl-import-source rest-dsl-import-apicurio">
      <div className="rest-dsl-import-apicurio-toolbar">
        <SearchInput
          aria-label="Search Apicurio artifacts"
          placeholder="Search OpenAPI artifacts"
          value={searchTerm}
          onChange={(_event, value) => {
            setSearchTerm(value);
          }}
        />
        <Button variant="secondary" onClick={fetchArtifacts} isDisabled={isLoading || isFetchingArtifacts}>
          Refresh
        </Button>
      </div>
      {error && <span className="rest-dsl-import-error">{error}</span>}
      <div className="rest-dsl-import-list-scroll rest-dsl-import-apicurio-list">
        <List isPlain>
          {filteredArtifacts.map((artifact) => (
            <ListItem key={artifact.id}>
              <Radio
                id={`rest-openapi-apicurio-${artifact.id}`}
                name="rest-openapi-apicurio-artifact"
                label={
                  <span>
                    {artifact.name || artifact.id} <span className="rest-dsl-import-note">(id: {artifact.id})</span>
                  </span>
                }
                isChecked={selectedId === artifact.id}
                onChange={() => {
                  handleSelectArtifact(artifact.id);
                }}
              />
            </ListItem>
          ))}
          {filteredArtifacts.length === 0 && !isLoading && !isFetchingArtifacts && (
            <ListItem>No OpenAPI artifacts found.</ListItem>
          )}
        </List>
      </div>
      {isLoaded && (
        <span className="rest-dsl-import-success">
          <CheckCircleIcon /> Loaded
        </span>
      )}
    </div>
  );
};

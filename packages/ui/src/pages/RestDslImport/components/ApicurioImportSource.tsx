import { Button, List, ListItem, Radio, SearchInput } from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useEffect, useState } from 'react';

import { ApicurioArtifact, ApicurioArtifactSearchResult, SchemaLoadedResult } from '../RestDslImportTypes';

type ApicurioImportSourceProps = {
  registryUrl?: string;
  onSchemaLoaded: (result: SchemaLoadedResult) => void;
};

export const ApicurioImportSource: FunctionComponent<ApicurioImportSourceProps> = ({ registryUrl, onSchemaLoaded }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [artifacts, setArtifacts] = useState<ApicurioArtifact[]>([]);
  const [filteredArtifacts, setFilteredArtifacts] = useState<ApicurioArtifact[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState('');

  const fetchArtifacts = useCallback(async () => {
    if (!registryUrl) {
      setError('Apicurio Registry URL is missing.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${registryUrl}/apis/registry/v2/search/artifacts`);
      if (!response.ok) {
        throw new Error(`Failed to fetch artifacts (${response.status})`);
      }
      const result = (await response.json()) as ApicurioArtifactSearchResult;
      const openapiArtifacts = (result.artifacts ?? []).filter((artifact) => artifact.type === 'OPENAPI');
      setArtifacts(openapiArtifacts);
      setFilteredArtifacts(openapiArtifacts);
      setError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to fetch artifacts from Apicurio Registry.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [registryUrl]);

  useEffect(() => {
    if (registryUrl) {
      fetchArtifacts();
    }
  }, [fetchArtifacts, registryUrl]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredArtifacts(artifacts);
      return;
    }
    const lowered = searchTerm.toLowerCase();
    setFilteredArtifacts(
      artifacts.filter((artifact) => (artifact.name ?? artifact.id ?? '').toLowerCase().includes(lowered)),
    );
  }, [artifacts, searchTerm]);

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

        onSchemaLoaded({
          schema: specText,
          source: 'apicurio',
          sourceIdentifier: artifactUrl,
        });

        setIsLoaded(true);
        setError('');
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
      handleLoadArtifact(artifactId);
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
          onChange={(_event, value) => setSearchTerm(value)}
        />
        <Button variant="secondary" onClick={fetchArtifacts} isDisabled={isLoading}>
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
                onChange={() => handleSelectArtifact(artifact.id)}
              />
            </ListItem>
          ))}
          {filteredArtifacts.length === 0 && !isLoading && <ListItem>No OpenAPI artifacts found.</ListItem>}
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

import { Button, Callout, InlineNotification, RadioButton, RadioButtonGroup, Search } from '@carbon/react';
import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';

import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { ApicurioArtifact, ApicurioArtifactSearchResult, SchemaLoadedResult } from '../RestDslImportTypes';

const REGISTRY_NOT_CONFIGURED_TITLE_ID = 'rest-openapi-apicurio-not-configured-title';

const getArtifactsUrl = (registryUrl: string) => `${registryUrl}/apis/registry/v2/groups/default/artifacts/`;

type ApicurioImportSourceProps = {
  registryUrl?: string;
  onSchemaLoaded: (result: SchemaLoadedResult) => { error?: string };
  /** Called when another artifact is selected, so the previous artifact is no longer importable while it loads */
  onCleared?: () => void;
  onOpenSettings?: () => void;
  /** URL of an artifact already loaded by the wizard, so its selection is shown again when the step is revisited */
  loadedSourceIdentifier?: string;
};

export const ApicurioImportSource: FunctionComponent<ApicurioImportSourceProps> = ({
  registryUrl,
  onSchemaLoaded,
  onCleared,
  onOpenSettings,
  loadedSourceIdentifier = '',
}) => {
  const loadedArtifactId =
    registryUrl && loadedSourceIdentifier.startsWith(getArtifactsUrl(registryUrl))
      ? loadedSourceIdentifier.slice(getArtifactsUrl(registryUrl).length)
      : '';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState(loadedArtifactId);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(!!loadedArtifactId);
  const [error, setError] = useState('');
  const startRequest = useLatestRequest();

  const [requestVersion, setRequestVersion] = useState(0);
  const request = useMemo(() => ({ registryUrl, requestVersion }), [registryUrl, requestVersion]);
  const [artifactResult, setArtifactResult] = useState<{ request: typeof request; artifacts: ApicurioArtifact[] }>();
  const [completedRequest, setCompletedRequest] = useState<typeof request>();
  const isFetchingArtifacts = !!registryUrl && completedRequest !== request;
  const artifacts = artifactResult?.request === request ? artifactResult.artifacts : [];

  useEffect(() => {
    if (!registryUrl) return;
    let cancelled = false;
    const fetchArtifacts = async () => {
      try {
        const response = await fetch(`${registryUrl}/apis/registry/v2/search/artifacts`);
        if (!response.ok) throw new Error(`Failed to fetch artifacts (${response.status})`);
        const result = (await response.json()) as ApicurioArtifactSearchResult;
        if (cancelled) return;
        setArtifactResult({
          request,
          artifacts: (result.artifacts ?? []).filter((artifact) => artifact.type === 'OPENAPI'),
        });
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

      const isLatest = startRequest();
      setIsLoading(true);
      setError('');
      setIsLoaded(false);

      try {
        const artifactUrl = `${getArtifactsUrl(registryUrl)}${artifactId}`;
        const response = await fetch(artifactUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch artifact (${response.status})`);
        }
        const specText = await response.text();
        if (!isLatest()) return;

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
        if (isLatest()) {
          const message = err instanceof Error ? err.message : 'Unable to download the selected artifact.';
          setError(message);
          setIsLoaded(false);
        }
      } finally {
        if (isLatest()) {
          setIsLoading(false);
        }
      }
    },
    [registryUrl, onSchemaLoaded, startRequest],
  );

  const handleSelectArtifact = useCallback(
    (artifactId: string) => {
      setSelectedId(artifactId);
      onCleared?.();
      void handleLoadArtifact(artifactId);
    },
    [handleLoadArtifact, onCleared],
  );

  if (!registryUrl) {
    return (
      <Callout
        kind="warning-alt"
        lowContrast
        title="Apicurio Registry URL not configured."
        titleId={REGISTRY_NOT_CONFIGURED_TITLE_ID}
        subtitle="Configure the Apicurio Registry URL in Settings to enable this option."
        actionButtonLabel={onOpenSettings ? 'Open Settings' : undefined}
        onActionButtonClick={onOpenSettings}
      />
    );
  }

  return (
    <div className="rest-dsl-import-apicurio">
      <div className="rest-dsl-import-apicurio-toolbar">
        <Search
          labelText="Search Apicurio artifacts"
          placeholder="Search OpenAPI artifacts"
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
          }}
          onClear={() => {
            setSearchTerm('');
          }}
        />
        <Button
          kind="secondary"
          size="md"
          className="rest-dsl-import-inline-button"
          onClick={fetchArtifacts}
          disabled={isLoading || isFetchingArtifacts}
        >
          Refresh
        </Button>
      </div>
      {error && <InlineNotification kind="error" lowContrast hideCloseButton role="alert" title={error} />}
      <div className="rest-dsl-import-list-scroll rest-dsl-import-apicurio-list">
        <RadioButtonGroup
          legendText="Apicurio artifacts"
          name="rest-openapi-apicurio-artifact"
          orientation="vertical"
          valueSelected={selectedId}
          onChange={(value) => {
            handleSelectArtifact(String(value));
          }}
        >
          {filteredArtifacts.map((artifact) => (
            <RadioButton
              key={artifact.id}
              id={`rest-openapi-apicurio-${artifact.id}`}
              value={artifact.id}
              labelText={
                <span>
                  {artifact.name || artifact.id} <span className="rest-dsl-import-note">(id: {artifact.id})</span>
                </span>
              }
            />
          ))}
        </RadioButtonGroup>
        {filteredArtifacts.length === 0 && !isLoading && !isFetchingArtifacts && <p>No OpenAPI artifacts found.</p>}
      </div>
      {isLoaded && <InlineNotification kind="success" lowContrast hideCloseButton title="Loaded" />}
    </div>
  );
};

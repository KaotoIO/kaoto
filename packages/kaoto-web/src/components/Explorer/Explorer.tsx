import './Explorer.scss';

import { Add } from '@carbon/icons-react';
import { IconButton, Search, TreeNode, TreeView } from '@carbon/react';
import { ChangeEvent, ComponentProps, FunctionComponent, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { useSafeParams } from '../../hooks/useSafeParams';
import { filterFiles } from '../../stubs/explorer/filterFiles';
import { ExplorerFile, STUB_FILES } from '../../stubs/explorer/index';

interface RenderOptions {
  query: string;
  expandedFolders: Record<string, boolean>;
  handleToggle: (folderId: string) => ComponentProps<typeof TreeNode>['onToggle'];
  openIntegration: (fileId: string) => void;
}

function renderNodes(nodes: ExplorerFile[], opts: RenderOptions): React.ReactNode[] {
  return nodes.map((node) =>
    node.children ? (
      <TreeNode
        key={node.id}
        id={node.id}
        label={node.name}
        isExpanded={opts.query ? true : !!opts.expandedFolders[node.id]}
        onToggle={opts.handleToggle(node.id)}
        data-testid={`explorer-folder-${node.id}`}
      >
        {renderNodes(node.children, opts)}
      </TreeNode>
    ) : (
      <TreeNode
        key={node.id}
        id={node.id}
        label={node.name}
        data-testid={`explorer-file-${node.id}`}
        onSelect={() => {
          if (node.type === 'integration') opts.openIntegration(node.id);
        }}
      />
    ),
  );
}

export const Explorer: FunctionComponent = () => {
  const params = useSafeParams(['projectId']);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const handleSearch = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value.toLowerCase());
  }, []);

  const filtered = useMemo(() => filterFiles(STUB_FILES, query), [query]);

  const handleToggle = useCallback(
    (folderId: string) =>
      ((_event: unknown, node: { isExpanded?: boolean }) => {
        setExpandedFolders((prev) => ({ ...prev, [folderId]: node.isExpanded ?? false }));
      }) as ComponentProps<typeof TreeNode>['onToggle'],
    [],
  );

  const openIntegration = useCallback(
    (fileId: string) => {
      if (params) {
        void navigate(`/projects/${params.projectId}/integration/${fileId}`);
      }
    },
    [navigate, params],
  );

  return (
    <aside className="cs--explorer" data-testid="explorer" aria-label="Project explorer">
      {/* Section 1 — Route selector area (stub) */}
      <div className="cs--explorer__route-selector" data-testid="route-selector-area" />

      {/* Section 2 — Toolbar */}
      <div className="cs--explorer__toolbar">
        <IconButton label="Add integration" kind="ghost" size="sm" data-testid="explorer-add">
          <Add />
        </IconButton>
      </div>

      {/* Section 3 — Search */}
      <div className="cs--explorer__search">
        <Search
          size="sm"
          labelText="Search files"
          placeholder="Search files…"
          onChange={handleSearch}
          data-testid="explorer-search"
        />
      </div>

      {/* Section 4 — File tree */}
      <div className="cs--explorer__tree">
        <TreeView label="Project files" hideLabel>
          {renderNodes(filtered, { query, expandedFolders, handleToggle, openIntegration })}
        </TreeView>
      </div>
    </aside>
  );
};

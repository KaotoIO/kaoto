// Note: once the REST editor is migrated to kaoto-web, this component should be
// reviewed together with the shared canvas/editor layout (tracked on the parent
// issue) — the file-tree navigation and filtering logic may be consolidated.
import './Explorer.scss';

import { Add, Document, DocumentConfiguration, Folder, FolderOpen } from '@carbon/icons-react';
import { FeatureFlags, IconButton, Search, TreeNode, TreeView } from '@carbon/react';
import {
  ChangeEvent,
  ComponentProps,
  FunctionComponent,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useParams } from 'react-router';

import { useSafeParams } from '../../hooks/useSafeParams';
import { ExplorerFile, STUB_FILES } from '../../stubs/explorer/index';
import { filterFiles } from './filterFiles';

const MIN_WIDTH = 160;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 240;

interface RenderOptions {
  query: string;
  selectedId: string | undefined;
  expandedFolders: Record<string, boolean>;
  handleToggle: (folderId: string) => ComponentProps<typeof TreeNode>['onToggle'];
  openIntegration: (fileId: string) => void;
}

/** Wrap the matching substring in a <mark> for visual highlighting. */
function highlightMatch(name: string, query: string): React.ReactNode {
  if (!query) return <span title={name}>{name}</span>;
  const idx = name.toLowerCase().indexOf(query);
  if (idx === -1) return <span title={name}>{name}</span>;
  return (
    <span title={name}>
      {name.slice(0, idx)}
      <mark className="cs--explorer__highlight">{name.slice(idx, idx + query.length)}</mark>
      {name.slice(idx + query.length)}
    </span>
  );
}

function renderNodes(nodes: ExplorerFile[], opts: RenderOptions): React.ReactNode[] {
  return nodes.map((node) => {
    const isExpanded = opts.query ? true : !!opts.expandedFolders[node.id];
    if (node.children) {
      return (
        <TreeNode
          key={node.id}
          id={node.id}
          label={highlightMatch(node.name, opts.query)}
          renderIcon={isExpanded ? FolderOpen : Folder}
          isExpanded={isExpanded}
          onToggle={opts.handleToggle(node.id)}
          data-testid={`explorer-folder-${node.id}`}
        >
          {renderNodes(node.children, opts)}
        </TreeNode>
      );
    }
    return (
      <TreeNode
        key={node.id}
        id={node.id}
        label={highlightMatch(node.name, opts.query)}
        renderIcon={node.type === 'integration' ? DocumentConfiguration : Document}
        data-testid={`explorer-file-${node.id}`}
        onSelect={() => {
          if (node.type === 'integration') opts.openIntegration(node.id);
        }}
      />
    );
  });
}

export const Explorer: FunctionComponent = () => {
  const params = useSafeParams(['projectId']);
  const { integrationId: selectedId } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(DEFAULT_WIDTH);
  // widthRef mirrors the width state so handleResizerMouseDown can read the
  // current value in a mousedown handler without taking width as a dependency
  // (which would recreate the callback on every mousemove during a drag).
  const widthRef = useRef<number>(DEFAULT_WIDTH);
  useLayoutEffect(() => {
    widthRef.current = width;
  });

  const handleResizerMouseDown = useCallback((e: React.MouseEvent) => {
    startX.current = e.clientX;
    startWidth.current = widthRef.current;

    const onMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX.current;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setWidth(next);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const handleSearch = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value.toLowerCase());
  }, []);

  const filtered = useMemo(() => filterFiles(STUB_FILES, query), [query]);

  const handleToggle = useCallback(
    (folderId: string) =>
      // With enableTreeviewControllable, Carbon calls onToggle(isExpanded) rather than (event, node).
      ((newIsExpanded: boolean) => {
        setExpandedFolders((prev) => ({ ...prev, [folderId]: newIsExpanded }));
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
    <aside
      className="cs--explorer"
      data-testid="explorer"
      aria-label="Project explorer"
      style={{ inlineSize: `${width}px` }}
    >
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

      {/* Resize handle */}
      <button
        className="cs--explorer__resizer"
        aria-label="Resize explorer panel"
        onMouseDown={handleResizerMouseDown}
      />

      {/* Section 4 — File tree */}
      <div className="cs--explorer__tree">
        {/* enableTreeviewControllable makes `selected` and `active` fully controlled —
            without it, Carbon TreeView only uses `selected` as an initial value and
            won't react to URL changes (e.g. browser back/forward). */}
        <FeatureFlags enableTreeviewControllable>
          <TreeView label="Project files" hideLabel selected={selectedId ? [selectedId] : []} active={selectedId}>
            {renderNodes(filtered, { query, selectedId, expandedFolders, handleToggle, openIntegration })}
          </TreeView>
        </FeatureFlags>
      </div>
    </aside>
  );
};

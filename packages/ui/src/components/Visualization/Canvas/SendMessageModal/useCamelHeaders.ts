import { useEffect, useMemo, useState } from 'react';

import { DynamicCatalogRegistry } from '../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind, ICamelComponentDefinition } from '../../../../models';
import { getHeaderValueType } from './header-value';

export interface ICamelHeaderItem {
  /** The header key / constant name (e.g. CamelFileName, CamelHttpMethod) */
  name: string;
  /** Human friendly display name */
  displayName?: string;
  /** Detailed description of what the header does */
  description?: string;
  /** Expected Java type (e.g. String, Integer, Map) */
  javaType?: string;
  /** Default value if specified in schema */
  defaultValue?: string | number | boolean;
}

/**
 * Extracts text-editable Camel headers across all components in the DynamicCatalog.
 * Deduplicates entries by header name and sorts them alphabetically.
 */
export const useCamelHeaders = (
  isOpen = true,
): {
  headers: ICamelHeaderItem[];
  isLoading: boolean;
} => {
  const [allComponents, setAllComponents] = useState<Record<string, ICamelComponentDefinition>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    let timer: NodeJS.Timeout | null = null;

    const loadCatalogHeaders = async () => {
      try {
        setIsLoading(true);
        const componentCatalog = DynamicCatalogRegistry.get().getCatalog(CatalogKind.Component);
        if (componentCatalog) {
          const components = (await componentCatalog.getAll()) as Record<string, ICamelComponentDefinition>;
          if (isMounted && components && Object.keys(components).length > 0) {
            setAllComponents(components);
            return;
          }
        }
      } catch {
        // Silently handle error and retry
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }

      // If catalog wasn't ready yet, poll again every 300ms
      if (isMounted) {
        timer = setTimeout(() => {
          void loadCatalogHeaders();
        }, 300);
      }
    };

    void loadCatalogHeaders();
    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [isOpen]);

  const headers = useMemo(() => {
    const headersMap = new Map<string, ICamelHeaderItem>();

    // Iterate through all component definitions in the catalog
    Object.values(allComponents).forEach((compDef) => {
      if (!compDef?.headers) return;

      Object.entries(compDef.headers).forEach(([headerKey, headerMeta]) => {
        const name = headerKey;
        if (!name || !getHeaderValueType(headerMeta.javaType)) return;

        const existing = headersMap.get(name);
        if (existing && (existing.description || !headerMeta.description)) return;

        headersMap.set(name, {
          name,
          displayName: headerMeta.displayName || headerKey,
          description: headerMeta.description,
          javaType: headerMeta.javaType,
          defaultValue: headerMeta.defaultValue,
        });
      });
    });

    const headerList = Array.from(headersMap.values());

    // Sort alphabetically by header name
    headerList.sort((a, b) => a.name.localeCompare(b.name));

    return headerList;
  }, [allComponents]);

  return { headers, isLoading };
};

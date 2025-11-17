import './ExportDocument.scss';

import { Content, ContentVariants } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { Components } from 'react-markdown';

export const markdownComponentMapping: Components = {
  p: ({ children }) => <Content component={ContentVariants.p}>{children}</Content>,

  h1: ({ children }) => (
    <Content component={ContentVariants.h1} data-testid="export-document-preview-h1">
      {children}
    </Content>
  ),
  h2: ({ children }) => (
    <Content component={ContentVariants.h2} data-testid="export-document-preview-h2">
      {children}
    </Content>
  ),
  h3: ({ children }) => (
    <Content component={ContentVariants.h3} data-testid="export-document-preview-h3">
      {children}
    </Content>
  ),
  h4: ({ children }) => (
    <Content component={ContentVariants.h4} data-testid="export-document-preview-h4">
      {children}
    </Content>
  ),
  h5: ({ children }) => (
    <Content component={ContentVariants.h5} data-testid="export-document-preview-h5">
      {children}
    </Content>
  ),
  h6: ({ children }) => (
    <Content component={ContentVariants.h6} data-testid="export-document-preview-h6">
      {children}
    </Content>
  ),

  table: ({ children }) => (
    <Table
      className="export-document-preview-table"
      data-testid="export-document-preview-table"
      borders
      isStriped
      isStickyHeader
    >
      {children}
    </Table>
  ),
  thead: ({ children }) => <Thead>{children}</Thead>,
  tbody: ({ children }) => <Tbody>{children}</Tbody>,
  tr: ({ children }) => <Tr isBorderRow>{children}</Tr>,
  th: ({ children }) => (
    <Th hasLeftBorder hasRightBorder className="export-document-preview-table-th">
      {children}
    </Th>
  ),
  td: ({ children }) => (
    <Td hasLeftBorder hasRightBorder modifier="breakWord">
      <pre>
        <code>{children}</code>
      </pre>
    </Td>
  ),
};

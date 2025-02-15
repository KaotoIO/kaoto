import { Components } from 'react-markdown';
import { Content, ContentVariants } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import './ExportDocument.scss';

export const markdownComponentMapping: Components = {
  p: ({ children }) => <Content component={ContentVariants.p}>{children}</Content>,

  h1: ({ children }) => <Content component={ContentVariants.h1}>{children}</Content>,
  h2: ({ children }) => <Content component={ContentVariants.h2}>{children}</Content>,
  h3: ({ children }) => <Content component={ContentVariants.h3}>{children}</Content>,
  h4: ({ children }) => <Content component={ContentVariants.h4}>{children}</Content>,
  h5: ({ children }) => <Content component={ContentVariants.h5}>{children}</Content>,
  h6: ({ children }) => <Content component={ContentVariants.h6}>{children}</Content>,

  table: ({ children }) => (
    <Table className="export-document-preview-table" borders isStriped isStickyHeader>
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
      {children}
    </Td>
  ),
};

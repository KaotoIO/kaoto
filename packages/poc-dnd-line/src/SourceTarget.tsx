import { Accordion, Page, Split, SplitItem } from '@patternfly/react-core';
import { sourceDoc, targetDoc } from './data';
import { DocumentField } from './DocumentField';

export const SourceTarget: React.FunctionComponent = () => {
  const sourcePath = sourceDoc.name + ':/';
  const targetPath = targetDoc.name + ':/';
  return (
    <Page>
      <Split hasGutter>
        <SplitItem isFilled>
          <Accordion isBordered={true} asDefinitionList={false}>
            <DocumentField
              path={sourcePath}
              field={sourceDoc}
              initialExpanded={true}
              onToggle={() => {}}
            ></DocumentField>
          </Accordion>
        </SplitItem>
        <SplitItem isFilled>draw lines here</SplitItem>
        <SplitItem isFilled>
          <Accordion isBordered={true} asDefinitionList={false}>
            <DocumentField
              path={targetPath}
              field={targetDoc}
              initialExpanded={true}
              onToggle={() => {}}
            ></DocumentField>
          </Accordion>
        </SplitItem>
      </Split>
    </Page>
  );
};

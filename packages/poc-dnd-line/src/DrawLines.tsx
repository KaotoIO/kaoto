import { FunctionComponent, useCallback, useEffect, useMemo, useRef } from 'react';
import { Accordion, Page, PageSection, Split, SplitItem } from '@patternfly/react-core';
import { DocumentField } from './field/DocumentField';
import { sourceDoc, targetDoc } from './data';
import { useCanvas } from './canvas/useCanvas';
import { LineGroup, Mapping } from './line/Line';

export const DrawLines: FunctionComponent = () => {
  const sourceRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const { setFieldReference, reloadFieldReferences } = useCanvas();
  const sourcePath = sourceDoc.name + ':/';
  const targetPath = targetDoc.name + ':/';
  setFieldReference(sourcePath, sourceRef);
  setFieldReference(targetPath, targetRef);
  const mappings: Mapping[] = useMemo(
    () => [
      { sourcePath: 'SourceDocument1://field3', targetPath: 'TargetDocument1://field1' },
      { sourcePath: 'SourceDocument1://field2/field1', targetPath: 'TargetDocument1://field2/field3' },
    ],
    [],
  );

  const onRefresh = useCallback(() => {
    reloadFieldReferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  return (
    <Page>
      <PageSection>
        <Split hasGutter>
          <LineGroup mappings={mappings}></LineGroup>
          <SplitItem isFilled>
            <Accordion isBordered={true} asDefinitionList={false} onClick={onRefresh}>
              <DocumentField ref={sourceRef} path={sourcePath} onToggle={onRefresh} field={sourceDoc}></DocumentField>
            </Accordion>
          </SplitItem>
          <SplitItem isFilled></SplitItem>
          <SplitItem isFilled>
            <Accordion isBordered={true} asDefinitionList={false} onClick={onRefresh}>
              <DocumentField ref={targetRef} path={targetPath} onToggle={onRefresh} field={targetDoc}></DocumentField>
            </Accordion>
          </SplitItem>
        </Split>
      </PageSection>
    </Page>
  );
};

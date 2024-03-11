import { Accordion, Page, Split, SplitItem } from '@patternfly/react-core';
import { sourceDoc, targetDoc } from './data';
import { DocumentField } from './field/DocumentField';
import { LineGroup } from './line/Line';
import { FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';
import { useCanvas } from './canvas/useCanvas';
import { CanvasProvider } from './canvas/CanvasProvider';

export const SourceTargetContainer: FunctionComponent = () => {
  return (
    <CanvasProvider>
      <SourceTarget></SourceTarget>
    </CanvasProvider>
  );
};

export const SourceTarget: FunctionComponent = () => {
  const sourceRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const { setFieldReference, reloadFieldReferences } = useCanvas();
  const sourcePath = sourceDoc.name + ':/';
  const targetPath = targetDoc.name + ':/';
  setFieldReference(sourcePath, sourceRef);
  setFieldReference(targetPath, targetRef);
  const mappings = [];

  const handleRefresh = useCallback(() => {
    reloadFieldReferences();
  }, [reloadFieldReferences]);

  return (
    <Page>
      <Split hasGutter>
        <LineGroup mappings={mappings}></LineGroup>
        <SplitItem isFilled>
          <Accordion isBordered={true} asDefinitionList={false} onClick={handleRefresh}>
            <DocumentField
              ref={sourceRef}
              path={sourcePath}
              field={sourceDoc}
              initialExpanded={true}
              onToggle={handleRefresh}
            ></DocumentField>
          </Accordion>
        </SplitItem>
        <SplitItem isFilled>draw lines here</SplitItem>
        <SplitItem isFilled>
          <Accordion isBordered={true} asDefinitionList={false} onClick={handleRefresh}>
            <DocumentField
              ref={targetRef}
              path={targetPath}
              field={targetDoc}
              initialExpanded={true}
              onToggle={handleRefresh}
            ></DocumentField>
          </Accordion>
        </SplitItem>
      </Split>
    </Page>
  );
};

import { FunctionComponent } from 'react';
import { FunctionSelector } from './FunctionSelector';
import { Split, SplitItem, Stack, StackItem } from '@patternfly/react-core';

type TransformationEditorProps = {
  name: string;
};

export const TransformationEditor: FunctionComponent<TransformationEditorProps> = ({ name }) => {
  return (
    <Stack>
      <StackItem>
        <Split>
          <SplitItem>Wrap with a function call: </SplitItem>
          <SplitItem>
            <FunctionSelector key={name} />
          </SplitItem>
        </Split>
      </StackItem>
    </Stack>
  );
};

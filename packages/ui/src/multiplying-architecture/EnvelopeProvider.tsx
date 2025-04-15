import { FunctionComponent, PropsWithChildren } from 'react';
import { EntitiesProvider } from '../providers/entities.provider';
import { SourceCodeProvider } from '../providers/source-code.provider';

interface EnvelopeProviderProps extends PropsWithChildren {
  fileExtension?: string;
}

export const EnvelopeProvider: FunctionComponent<EnvelopeProviderProps> = ({ fileExtension, children }) => {
  return (
    <SourceCodeProvider>
      <EntitiesProvider fileExtension={fileExtension}>{children}</EntitiesProvider>
    </SourceCodeProvider>
  );
};

export enum SourceSchemaType {
  Route = 'Route',
  Integration = 'Integration',
  KameletBinding = 'KameletBinding',
  Kamelet = 'Kamelet',
  Pipe = 'Pipe',
  Test = 'Test',
}

export const getResourceTypeFromPath = (path?: string): SourceSchemaType | undefined => {
  if (path?.includes('.integration') || path?.includes('integration.yaml') || path?.includes('integration.yml')) {
    return SourceSchemaType.Integration;
  } else if (
    path?.includes('.kamelet-binding') ||
    path?.includes('kamelet-binding.yaml') ||
    path?.includes('kamelet-binding.yml')
  ) {
    return SourceSchemaType.KameletBinding;
  } else if (path?.includes('.kamelet') || path?.includes('kamelet.yaml') || path?.includes('kamelet.yml')) {
    return SourceSchemaType.Kamelet;
  } else if (path?.includes('.pipe') || path?.includes('pipe.yaml') || path?.includes('pipe.yml')) {
    return SourceSchemaType.Pipe;
  } else if (
    path?.endsWith('test.xml') ||
    path?.endsWith('test.yaml') ||
    path?.endsWith('test.yml') ||
    path?.endsWith('it.xml') ||
    path?.endsWith('it.yaml') ||
    path?.endsWith('it.yml')
  ) {
    return SourceSchemaType.Test;
  } else if (path?.endsWith('.xml') || path?.endsWith('.yaml') || path?.endsWith('.yml')) {
    return SourceSchemaType.Route;
  }

  return undefined;
};

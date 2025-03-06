export enum SourceSchemaType {
  Route = 'Route',
  Integration = 'Integration',
  KameletBinding = 'KameletBinding',
  Kamelet = 'Kamelet',
  Pipe = 'Pipe',
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
  } else if (path?.endsWith('.xml') || path?.endsWith('.yaml') || path?.endsWith('.yml')) {
    return SourceSchemaType.Route;
  }

  return undefined;
};

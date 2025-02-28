export enum SourceSchemaType {
  Route = 'Route',
  Integration = 'Integration',
  KameletBinding = 'KameletBinding',
  Kamelet = 'Kamelet',
  Pipe = 'Pipe',
}

export const getResourceTypeFromPath = (path?: string): SourceSchemaType | undefined => {
  if (path?.includes('.integration')) {
    return SourceSchemaType.Integration;
  } else if (path?.includes('.kamelet-binding')) {
    return SourceSchemaType.KameletBinding;
  } else if (path?.includes('.kamelet')) {
    return SourceSchemaType.Kamelet;
  } else if (path?.includes('.pipe')) {
    return SourceSchemaType.Pipe;
  } else if (path?.endsWith('.xml')) {
    return SourceSchemaType.Route;
  }

  return SourceSchemaType.Route;
};

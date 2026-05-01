import { CatalogKind } from '../../../../../catalog-kind';
import { NodeIconResolver } from './node-icon-resolver';

export interface IconRequestResult {
  icon: string;
  alt: string;
}

export async function getIconRequest(
  catalogKind: CatalogKind,
  name: string,
  altProps?: string,
): Promise<IconRequestResult> {
  let iconName: string;
  let alt: string;

  switch (catalogKind) {
    case CatalogKind.Entity:
      iconName = name;
      alt = altProps ?? 'Entity icon';
      break;
    case CatalogKind.Kamelet:
      iconName = `kamelet:${name}`;
      alt = altProps ?? 'Kamelet icon';
      break;
    case CatalogKind.TestAction:
    case CatalogKind.TestActionGroup:
    case CatalogKind.TestContainer:
    case CatalogKind.TestEndpoint:
    case CatalogKind.TestFunction:
    case CatalogKind.TestValidationMatcher:
      iconName = name;
      alt = altProps ?? `Test ${catalogKind.substring('test'.length)} icon`;
      break;
    case CatalogKind.Processor:
    case CatalogKind.Pattern:
    case CatalogKind.Component:
      iconName = name;
      alt = altProps ?? `${catalogKind} icon`;
      break;
    default:
      return { icon: NodeIconResolver.getDefaultCamelIcon(), alt: altProps ?? 'Default icon' };
  }

  const icon = await NodeIconResolver.getIcon(iconName, catalogKind);
  return { icon, alt };
}

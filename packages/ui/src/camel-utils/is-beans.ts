import { BeansDeserializer } from '@kaoto-next/camel-catalog/types';
import { isDefined } from '../utils';

/** Very basic check to determine whether this object is a Beans */
export const isBeans = (rawEntity: unknown): rawEntity is {beans: BeansDeserializer} => {
  if (!isDefined(rawEntity) || Array.isArray(rawEntity) || typeof rawEntity !== 'object') {
    return false;
  }

  return 'beans' in rawEntity! && Array.isArray((rawEntity! as any).beans);
};

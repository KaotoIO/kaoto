export const NS_XSL = 'http://www.w3.org/1999/XSL/Transform';
export const NS_XPATH_FUNCTIONS = 'http://www.w3.org/2005/xpath-functions';
export const NS_XML_SCHEMA = 'http://www.w3.org/2001/XMLSchema';
export const NS_XML_SCHEMA_INSTANCE = 'http://www.w3.org/2001/XMLSchema-instance';
export const NS_XML = 'http://www.w3.org/XML/1998/namespace';

export const STANDARD_NAMESPACE_MAP: Readonly<Record<string, string>> = {
  xs: NS_XML_SCHEMA,
  fn: NS_XPATH_FUNCTIONS,
  xsl: NS_XSL,
};

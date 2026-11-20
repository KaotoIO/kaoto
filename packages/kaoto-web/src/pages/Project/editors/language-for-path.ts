/** Monaco languages by file extension; Monaco has no Groovy, Java highlighting fits it best */
const LANGUAGES: Record<string, string> = {
  xml: 'xml',
  xsd: 'xml',
  xsl: 'xml',
  xslt: 'xml',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  properties: 'ini',
  java: 'java',
  groovy: 'java',
  js: 'javascript',
  sql: 'sql',
};

/** The Monaco language of a file, from its extension; plain text when there is none for it */
export const languageForPath = (path: string): string => {
  const name = path.split('/').pop() ?? path;
  const dot = name.lastIndexOf('.');
  const extension = dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
  return LANGUAGES[extension] ?? 'plaintext';
};

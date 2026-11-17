/** The starter templates of `@kaoto/camel-catalog` that kaoto-web creates files from */
export type StarterTemplateName = 'camel-route-yaml' | 'camel-route-xml' | 'kamelet-source-yaml' | 'citrus-yaml';

const ID_PLACEHOLDER = /__KAOTO_ID__/g;
/** The `metadata.name` of a Kamelet or a Pipe, which Camel expects to match the file name */
const METADATA_NAME_PREFIX = '  name: ';

interface CatalogIndex {
  starterTemplates?: string;
}

interface StarterTemplatesManifest {
  catalogs: Record<string, { file: string } | undefined>;
}

const fetchOk = async (url: URL): Promise<Response> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url.pathname} (${response.status})`);
  // A server that does not have the file may answer with the page of the app instead of a 404
  if (response.headers.get('content-type')?.includes('text/html')) {
    throw new Error(`Could not load ${url.pathname} (not found)`);
  }
  return response;
};

/**
 * Loads a starter template from the catalog: the catalog index points to the templates manifest, which names the
 * template file. The file names carry a content hash, so they are never hardcoded.
 */
export const fetchStarterTemplate = async (catalogUrl: string, name: StarterTemplateName): Promise<string> => {
  const indexUrl = new URL(catalogUrl, globalThis.location.href);
  const index = (await (await fetchOk(indexUrl)).json()) as CatalogIndex;
  if (!index.starterTemplates) throw new Error('The catalog has no starter templates');

  const manifestUrl = new URL(index.starterTemplates, indexUrl);
  const manifest = (await (await fetchOk(manifestUrl)).json()) as StarterTemplatesManifest;
  const template = manifest.catalogs[name];
  if (!template) throw new Error(`The catalog has no starter template ${name}`);

  return (await fetchOk(new URL(template.file, manifestUrl))).text();
};

/** The extensions of the files whose template names them after the file */
const NAMED_FILE_EXTENSION = /\.(kamelet|pipe)\.ya?ml$/;
/** A plain YAML scalar that YAML reads as a string, not as a boolean, null or number */
const PLAIN_STRING = /^[A-Za-z_][\w.-]*$/;
const NON_STRING_WORDS = new Set(['true', 'false', 'yes', 'no', 'on', 'off', 'y', 'n', 'null']);

/** Writes the name as a YAML string: plain when YAML reads it as a string, double-quoted otherwise */
const toYamlString = (name: string): string =>
  PLAIN_STRING.test(name) && !NON_STRING_WORDS.has(name.toLowerCase()) ? name : JSON.stringify(name);

const randomId = (): string => String(crypto.getRandomValues(new Uint32Array(1))[0] % 10_000).padStart(4, '0');

/**
 * Fills a starter template in for a new file.
 *
 * The `metadata.name` of a Kamelet or a Pipe gets the file name without its extensions, as Camel looks a Kamelet up by
 * its file name; every other `__KAOTO_ID__` gets an id of its own.
 */
export const resolveStarterTemplate = (template: string, fileName: string): string => {
  const baseName = fileName.replace(NAMED_FILE_EXTENSION, '');
  const lines = template.split('\n');
  const nameIndex = lines.findIndex((line) => line.startsWith(METADATA_NAME_PREFIX) && line.includes('__KAOTO_ID__'));
  if (nameIndex !== -1) lines[nameIndex] = `${METADATA_NAME_PREFIX}${toYamlString(baseName)}`;

  return lines.join('\n').replace(ID_PLACEHOLDER, () => randomId());
};

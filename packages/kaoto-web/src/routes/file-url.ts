/** The route of an open file; the rest of the URL after it is the file's path */
const FILE_ROUTE = '/workspace/file/';

/** The URL that opens the file at the path; every segment is encoded, the `/` between them kept */
export const fileUrl = (path: string): string => `${FILE_ROUTE}${path.split('/').map(encodeURIComponent).join('/')}`;

/** The file path of the route's splat (`useParams()['*']`), which React Router hands over decoded */
export const filePathFromSplat = (splat: string | undefined): string | undefined => splat || undefined;

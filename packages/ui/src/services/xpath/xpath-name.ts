/**
 * Name start characters of the XML Names `NCName` production (XML 1.0 fifth edition ranges, the set
 * Saxon uses): `_`, ASCII letters and the Unicode letter ranges, without `:`.
 *
 * The constants carry no flags because Chevrotain rebuilds token patterns from `source` without the
 * `u` flag. The `#x10000-#xEFFFF` range is therefore written as surrogate pairs, and digits as
 * `[0-9]` rather than `\d`. They are not anchored.
 */
const NCNAME_START_CHAR =
  /[A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF]/;

/**
 * Name characters of the XML Names `NCName` production: a start character, `-`, `.`, a digit,
 * `#xB7`, a combining mark (`#x300-#x36F`) or `#x203F-#x2040`.
 *
 * The combining-mark range is a separate alternative: next to `#xB7` in one character class it reads
 * as a combined character sequence (ESLint `no-misleading-character-class`).
 */
const NCNAME_CHAR = new RegExp(String.raw`(?:${NCNAME_START_CHAR.source})|[-.0-9\u00B7\u203F\u2040]|[\u0300-\u036F]`);

/**
 * An XML Names `NCName`: a start character followed by any number of name characters. This is the
 * name an XPath `NCName` token, a `$` variable reference or a path step reads.
 */
export const NCNAME = new RegExp(`(?:${NCNAME_START_CHAR.source})(?:${NCNAME_CHAR.source})*`);

import { IMapping } from '../models';

export const NS_XSL = 'http://www.w3.org/1999/XSL/Transform';
export const EMPTY_XSL = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="${NS_XSL}">
  <xsl:template match="/">
  </xsl:template>
</xsl:stylesheet>
`;
export class MappingSerializerService {
  static createNew() {
    return new DOMParser().parseFromString(EMPTY_XSL, 'text/xml');
  }

  static serialize(mappings: IMapping[]): string {
    const xslt = MappingSerializerService.createNew();
    const template = xslt.getElementsByTagNameNS(NS_XSL, 'template')[0];
    template.localName;
    mappings.forEach((mapping) => {
      const source = mapping.sourceFields[0];
      source.fieldIdentifier;
      const target = mapping.targetFields[0];
      target.fieldIdentifier;
    });
    return new XMLSerializer().serializeToString(xslt);
  }

  static deserialize(xslt: string): IMapping[] {
    const xsltDoc = new DOMParser().parseFromString(xslt, 'application/xml');
    const template = xsltDoc.getElementsByTagNameNS(NS_XSL, 'template')[0];
    template.localName;
    const answer: IMapping[] = [];

    return answer;
  }
}

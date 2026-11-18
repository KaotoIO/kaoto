<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="io.kaoto.datamapper.poc.test" version="3.0" exclude-result-prefixes="ns0">
  <xsl:output method="xml" indent="yes"/>
  <xsl:template match="/">
    <ns0:Root>
      <ns0:AbstractInChoice>
        <ns0:Cat>
          <ns0:name>Tom</ns0:name>
        </ns0:Cat>
      </ns0:AbstractInChoice>
    </ns0:Root>
  </xsl:template>
</xsl:stylesheet>

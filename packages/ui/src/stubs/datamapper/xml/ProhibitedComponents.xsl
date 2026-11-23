<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="http://www.example.com/PROHIBITED" version="3.0" exclude-result-prefixes="ns0">
  <xsl:output method="xml" indent="yes"/>
  <xsl:template match="/">
    <ns0:Root>
      <ns0:ZeroedMiddle>
        <xsl:attribute name="keep">k</xsl:attribute>
        <xsl:attribute name="drop">d</xsl:attribute>
        <ns0:first>f</ns0:first>
        <ns0:middle>m</ns0:middle>
        <ns0:last>l</ns0:last>
      </ns0:ZeroedMiddle>
    </ns0:Root>
  </xsl:template>
</xsl:stylesheet>

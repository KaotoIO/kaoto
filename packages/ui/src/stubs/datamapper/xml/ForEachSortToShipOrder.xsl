<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="io.kaoto.datamapper.poc.test">
  <xsl:output method="xml" indent="yes"/>
  <xsl:template match="/">
    <ShipOrder>
      <xsl:for-each select="/ns0:ShipOrder/Item">
        <xsl:sort select="Title"/>
        <xsl:sort select="Price" order="descending"/>
        <Item>
          <xsl:value-of select="Title"/>
        </Item>
      </xsl:for-each>
    </ShipOrder>
  </xsl:template>
</xsl:stylesheet>

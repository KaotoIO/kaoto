<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="io.kaoto.datamapper.poc.test">
  <xsl:output method="xml" indent="yes"/>
  <xsl:param name="sourceBody"/>
  <xsl:template match="/">
    <ShipOrder>
      <xsl:for-each-group select="/ns0:ShipOrder/Item" group-by="Title">
        <Item>
          <xsl:value-of select="Title"/>
        </Item>
      </xsl:for-each-group>
    </ShipOrder>
  </xsl:template>
</xsl:stylesheet>

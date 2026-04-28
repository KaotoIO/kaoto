<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="io.kaoto.datamapper.poc.test">
  <xsl:output method="xml" indent="yes"/>
  <xsl:template match="/">
    <ShipOrder>
      <xsl:for-each-group select="/ns0:ShipOrder/Item" group-ending-with="self::*[Price > 100]">
        <Batch>
          <ItemCount><xsl:value-of select="count(current-group())"/></ItemCount>
          <TotalPrice><xsl:value-of select="sum(current-group()/Price)"/></TotalPrice>
        </Batch>
      </xsl:for-each-group>
    </ShipOrder>
  </xsl:template>
</xsl:stylesheet>

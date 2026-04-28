<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="io.kaoto.datamapper.poc.test">
  <xsl:output method="xml" indent="yes"/>
  <xsl:template match="/">
    <ShipOrder>
      <xsl:for-each-group select="/ns0:ShipOrder/Item" group-starting-with="self::*[Note]">
        <Section>
          <xsl:for-each select="current-group()">
            <Item>
              <Title><xsl:value-of select="Title"/></Title>
              <Price><xsl:value-of select="Price"/></Price>
            </Item>
          </xsl:for-each>
        </Section>
      </xsl:for-each-group>
    </ShipOrder>
  </xsl:template>
</xsl:stylesheet>

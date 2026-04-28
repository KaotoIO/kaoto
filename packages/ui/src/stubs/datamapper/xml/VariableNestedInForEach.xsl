<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="io.kaoto.datamapper.poc.test">
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="/">
        <ShipOrder xmlns="io.kaoto.datamapper.poc.test">
            <xsl:for-each select="/ns0:ShipOrder/Item">
                <Item xmlns="">
                    <xsl:variable name="itemTitle" select="Title"/>
                    <Title>
                        <xsl:value-of select="$itemTitle"/>
                    </Title>
                </Item>
            </xsl:for-each>
        </ShipOrder>
    </xsl:template>
</xsl:stylesheet>

<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="io.kaoto.datamapper.poc.test">
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="/">
        <ShipOrder xmlns="io.kaoto.datamapper.poc.test">
            <xsl:attribute name="OrderId">
                <xsl:value-of select="/ns0:ShipOrder/@OrderId"/>
            </xsl:attribute>
            <xsl:variable name="orderRef" select="/ns0:ShipOrder/@OrderId"/>
        </ShipOrder>
    </xsl:template>
</xsl:stylesheet>

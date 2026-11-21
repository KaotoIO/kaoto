<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="3.0" xmlns:ns0="io.kaoto.datamapper.poc.test">
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="/">
        <ShipOrder xmlns="io.kaoto.datamapper.poc.test">
            <xsl:copy-of select="/ns0:ShipOrder/@*"/>
            <xsl:attribute name="OrderId"><xsl:value-of select="/ns0:ShipOrder/@OrderId"/></xsl:attribute>
            <xsl:apply-templates select="/ns0:ShipOrder/Item"/>
        </ShipOrder>
    </xsl:template>
</xsl:stylesheet>

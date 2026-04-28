<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="io.kaoto.datamapper.poc.test">
    <xsl:output method="xml" indent="yes"/>
    <xsl:param name="sourceParam1"/>
    <xsl:template match="/">
        <ShipOrder xmlns="io.kaoto.datamapper.poc.test">
            <xsl:variable name="sourceParam1-x" select="json-to-xml($sourceParam1)"/>
            <xsl:variable name="mapped-xml" select="/ns0:ShipOrder"/>
            <xsl:variable name="myVar" select="/ns0:ShipOrder/@OrderId"/>
        </ShipOrder>
    </xsl:template>
</xsl:stylesheet>

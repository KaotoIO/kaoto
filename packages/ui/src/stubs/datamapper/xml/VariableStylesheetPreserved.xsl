<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ns0="io.kaoto.datamapper.poc.test">
    <xsl:output method="xml" indent="yes"/>
    <xsl:variable name="taxRate" select="0.08"/>
    <xsl:variable name="globalTax" select="$taxRate * 100" as="xs:decimal"><!-- tax rate in percent --></xsl:variable>
    <xsl:variable name="items" as="xs:string*"/>
    <xsl:variable name="note"><!-- set by the caller --></xsl:variable>
    <xsl:variable name="separator"><![CDATA[<br/>]]></xsl:variable>
    <xsl:template match="/">
        <ShipOrder xmlns="io.kaoto.datamapper.poc.test">
            <xsl:attribute name="OrderId">
                <xsl:value-of select="/ns0:ShipOrder/@OrderId"/>
            </xsl:attribute>
        </ShipOrder>
    </xsl:template>
</xsl:stylesheet>

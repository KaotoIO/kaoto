<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="3.0">
    <xsl:output method="xml" indent="yes"/>
    <xsl:param name="in"/>
    <xsl:template match="/">
        <ShipOrder xmlns="io.kaoto.datamapper.poc.test">
            <OrderPerson>
                <xsl:value-of select="$in/a"/>
            </OrderPerson>
        </ShipOrder>
    </xsl:template>
</xsl:stylesheet>

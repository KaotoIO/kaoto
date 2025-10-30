<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="3.0" xmlns:fn="http://www.w3.org/2005/xpath-functions">
    <xsl:output method="text" indent="yes"/>
    <xsl:param name="cart"/>
    <xsl:variable name="cart-x" select="json-to-xml($cart)"/>
    <xsl:variable name="mapped-xml">
        <map xmlns="http://www.w3.org/2005/xpath-functions">
            <array key="Item">
                <map>
                    <string key="Title">
                        <xsl:value-of select="$cart-x/fn:array/fn:map/fn:string[@key='Title']"/>
                    </string>
                    <number key="Quantity">
                        <xsl:value-of select="$cart-x/fn:array/fn:map/fn:number[@key='Quantity']"/>
                    </number>
                    <number key="Price">
                        <xsl:value-of select="$cart-x/fn:array/fn:map/fn:number[@key='Price']"/>
                    </number>
                </map>
            </array>
        </map>
    </xsl:variable>
    <xsl:template match="/">
        <xsl:value-of select="xml-to-json($mapped-xml)"/>
    </xsl:template>
</xsl:stylesheet>
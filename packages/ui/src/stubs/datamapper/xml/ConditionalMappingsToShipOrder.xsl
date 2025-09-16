<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="3.0" xmlns:ns0="kaoto.datamapper.test">
    <xsl:output method="xml" indent="yes"/>
    <xsl:param name="cart"/>
    <xsl:param name="account"/>
    <xsl:template match="/">
        <ShipOrder xmlns="io.kaoto.datamapper.poc.test">
            <xsl:for-each select="$cart/ns0:Cart/Item">
                <Item xmlns="">
                    <Title>
                        <xsl:value-of select="Title"/>
                    </Title>
                    <Quantity>
                        <xsl:value-of select="Quantity"/>
                    </Quantity>
                    <Price>
                        <xsl:value-of select="Price"/>
                    </Price>
                </Item>
            </xsl:for-each>
        </ShipOrder>
    </xsl:template>
</xsl:stylesheet>
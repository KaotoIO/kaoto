<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="3.0" xmlns:ns0="kaoto.datamapper.test">
    <xsl:output method="xml" indent="yes"/>
    <xsl:param name="cart"/>
    <xsl:template match="/">
        <ShipOrder xmlns="io.kaoto.datamapper.poc.test">
            <Item xmlns="">
                <Title>
                    <xsl:value-of select="$cart/ns0:Cart/Item/Title"/>
                </Title>
                <Note>
                    <xsl:value-of select="$cart/ns0:Cart/Item/Note"/>
                </Note>
                <Quantity>
                    <xsl:value-of select="$cart/ns0:Cart/Item/Quantity"/>
                </Quantity>
                <Price>
                    <xsl:value-of select="$cart/ns0:Cart/Item/Price"/>
                </Price>
            </Item>
        </ShipOrder>
    </xsl:template>
</xsl:stylesheet>
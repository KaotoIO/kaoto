<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="3.0" xmlns:ns0="kaoto.datamapper.test">
    <xsl:output method="xml" indent="yes"/>
    <xsl:param name="cart"/>
    <xsl:template match="/">
        <ShipOrder xmlns="io.kaoto.datamapper.poc.test">
            <xsl:for-each select="$cart/ns0:Cart/Item">
                <Item xmlns="">
                    <Title>
                        <xsl:value-of select="Title"/>
                    </Title>
                    <xsl:if test="Note">
                        <Note>
                            <xsl:value-of select="Note"/>
                        </Note>
                    </xsl:if>
                    <Quantity>
                        <xsl:value-of select="Quantity"/>
                    </Quantity>
                    <Price>
                        <xsl:value-of select="Price"/>
                    </Price>
                </Item>
            </xsl:for-each>
            <xsl:for-each select="$cart/ns0:Cart/Item">
                <Item xmlns="">
                    <xsl:if test="Title">
                        <Note>
                            <xsl:value-of select="Title"/>
                        </Note>
                    </xsl:if>
                </Item>
            </xsl:for-each>
            <xsl:for-each select="$cart/ns0:Cart/Item">
                <Item xmlns="">
                    <!-- Write the note only when the cart item has one -->
                    <xsl:if test="Note">
                        <Note>
                            <xsl:value-of select="Note"/>
                        </Note>
                    </xsl:if>
                </Item>
            </xsl:for-each>
            <Item xmlns="">
                <xsl:if test="$cart/ns0:Cart/Item/Note">
                    <Note>
                        <xsl:value-of select="$cart/ns0:Cart/Item/Note"/>
                    </Note>
                </xsl:if>
            </Item>
        </ShipOrder>
    </xsl:template>
</xsl:stylesheet>

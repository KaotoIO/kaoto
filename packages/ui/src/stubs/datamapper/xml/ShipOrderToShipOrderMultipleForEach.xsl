<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="io.kaoto.datamapper.poc.test">
    <xsl:param name="sourceParam1" />
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="/">
        <ShipOrder xmlns="io.kaoto.datamapper.poc.test">
            <xsl:for-each select="/ns0:ShipOrder/Item">
                <Item xmlns="">
                    <Title>
                        <xsl:value-of select="Title"/>
                    </Title>
                    <Note>
                        <xsl:value-of select="Note"/>
                    </Note>
                    <Quantity>
                        <xsl:value-of select="Quantity"/>
                    </Quantity>
                    <Price>
                        <xsl:value-of select="Price"/>
                    </Price>
                </Item>
            </xsl:for-each>
            <xsl:for-each select="$sourceParam1/ns0:ShipOrder/Item">
                <Item xmlns="">
                    <Title>
                        <xsl:value-of select="Title"/>
                    </Title>
                    <Note>
                        <xsl:value-of select="Note"/>
                    </Note>
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

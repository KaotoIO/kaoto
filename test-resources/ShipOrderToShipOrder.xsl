<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="/">
        <ShipOrder xmlns="io.kaoto.datamapper.poc.test">
            <xsl:attribute name="OrderId">
                <xsl:value-of select="/ShipOrder/@OrderId"/>
            </xsl:attribute>
            <xsl:if test="/ShipOrder/OrderPerson != ''">
                <OrderPerson>
                    <xsl:value-of select="/ShipOrder/OrderPerson"/>
                </OrderPerson>
            </xsl:if>
            <ShipTo xmlns="">
                <xsl:copy-of select="/ShipOrder/ShipTo"/>
            </ShipTo>
            <xsl:for-each select="/ShipOrder/Item">
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
                    <xsl:choose>
                        <xsl:when test="Note != ''">
                            <Note>
                                <xsl:value-of select="Note"/>
                            </Note>
                        </xsl:when>
                        <xsl:otherwise>
                            <Note>
                                <xsl:value-of select="Title"/>
                            </Note>
                        </xsl:otherwise>
                    </xsl:choose>
                </Item>
            </xsl:for-each>
        </ShipOrder>
    </xsl:template>
</xsl:stylesheet>
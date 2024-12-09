<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="io.kaoto.datamapper.poc.test">
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="/">
        <ShipOrder xmlns="io.kaoto.datamapper.poc.test">
            <xsl:attribute name="OrderId">
                <xsl:value-of select="/ns0:ShipOrder/@OrderId"/>
            </xsl:attribute>
            <xsl:if test="/ns0:ShipOrder/ns0:OrderPerson != ''">
                <OrderPerson>
                    <xsl:value-of select="/ns0:ShipOrder/ns0:OrderPerson"/>
                </OrderPerson>
            </xsl:if>
            <ShipTo xmlns="">
                <xsl:copy-of select="/ns0:ShipOrder/ShipTo"/>
            </ShipTo>
            <xsl:for-each select="/ns0:ShipOrder/Item">
                <Item xmlns="">
                    <Title>
                        <xsl:value-of select="Title"/>
                    </Title>
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
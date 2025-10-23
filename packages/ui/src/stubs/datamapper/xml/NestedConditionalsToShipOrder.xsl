<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="io.kaoto.datamapper.poc.test">
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="/">
        <ShipOrder xmlns="io.kaoto.datamapper.poc.test">
            <xsl:attribute name="OrderId">
                <xsl:value-of select="/ns0:ShipOrder/@OrderId"/>
            </xsl:attribute>
            <xsl:if test="/ns0:ShipOrder/ns0:OrderPerson != ''">
                <xsl:if test="/ns0:ShipOrder/@OrderId != ''">
                    <OrderPerson>
                        <xsl:value-of select="/ns0:ShipOrder/ns0:OrderPerson"/>
                    </OrderPerson>
                </xsl:if>
            </xsl:if>
            <xsl:if test="/ns0:ShipOrder/ShipTo">
                <xsl:choose>
                    <xsl:when test="/ns0:ShipOrder/ShipTo/Name != ''">
                        <ShipTo xmlns="">
                            <Name>
                                <xsl:value-of select="/ns0:ShipOrder/ShipTo/Name"/>
                            </Name>
                        </ShipTo>
                    </xsl:when>
                    <xsl:otherwise>
                        <ShipTo xmlns="">
                            <Name>
                                <xsl:value-of select="'Unknown'"/>
                            </Name>
                        </ShipTo>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:if>
            <xsl:if test="/ns0:ShipOrder/Item">
                <xsl:for-each select="/ns0:ShipOrder/Item">
                    <Item xmlns="">
                        <Title>
                            <xsl:value-of select="Title"/>
                        </Title>
                        <xsl:if test="Note != ''">
                            <Note>
                                <xsl:value-of select="Note"/>
                            </Note>
                        </xsl:if>
                    </Item>
                </xsl:for-each>
            </xsl:if>
        </ShipOrder>
    </xsl:template>
</xsl:stylesheet>

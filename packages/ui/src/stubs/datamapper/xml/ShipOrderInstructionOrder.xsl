<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="io.kaoto.datamapper.poc.test">
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="/">
        <ShipOrder xmlns="io.kaoto.datamapper.poc.test">
            <Item xmlns="">
                <Title>
                    <xsl:value-of select="/ns0:ShipOrder/Item/Title"/>
                </Title>
            </Item>
            <xsl:if test="/ns0:ShipOrder/ShipTo/Name != ''">
                <ShipTo xmlns="">
                    <Name>
                        <xsl:value-of select="/ns0:ShipOrder/ShipTo/Name"/>
                    </Name>
                </ShipTo>
            </xsl:if>
            <xsl:if test="/ns0:ShipOrder/ns0:OrderPerson != ''">
                <OrderPerson>
                    <xsl:value-of select="/ns0:ShipOrder/ns0:OrderPerson"/>
                </OrderPerson>
            </xsl:if>
        </ShipOrder>
    </xsl:template>
</xsl:stylesheet>

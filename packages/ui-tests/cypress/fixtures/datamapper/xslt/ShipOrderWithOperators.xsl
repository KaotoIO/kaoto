<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="io.kaoto.datamapper.poc.test">
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="/">
        <ShipOrder xmlns="io.kaoto.datamapper.poc.test">
            <xsl:attribute name="OrderId">
                <xsl:value-of select="/ns0:ShipOrder/@OrderId"/>
            </xsl:attribute>
            <OrderPerson>
                <xsl:value-of select="if (/ns0:ShipOrder/ns0:OrderPerson = 'VIP' and /ns0:ShipOrder/@OrderId = '123') then /ns0:ShipOrder/ns0:OrderPerson else /ns0:ShipOrder/@OrderId"/>
            </OrderPerson>
            <ShipTo xmlns="">
                <Name>
                    <xsl:value-of select="/ns0:ShipOrder/ShipTo/Name"/>
                </Name>
            </ShipTo>
            <xsl:for-each select="/ns0:ShipOrder/Item">
                <Item xmlns="">
                    <Title>
                        <xsl:value-of select="Title"/>
                    </Title>
                    <Note>
                        <xsl:value-of select="Price * Quantity + 10"/>
                    </Note>
                    <Quantity>
                        <xsl:value-of select="Quantity - 1"/>
                    </Quantity>
                    <Price>
                        <xsl:value-of select="Price"/>
                    </Price>
                </Item>
            </xsl:for-each>
        </ShipOrder>
    </xsl:template>
</xsl:stylesheet>

<!-- Made with Bob -->

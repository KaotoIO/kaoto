<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="io.kaoto.datamapper.poc.test">
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="/">
        <ShipOrder xmlns="io.kaoto.datamapper.poc.test">
            <Item xmlns="">
                <Title>
                    <xsl:value-of select="/ns0:ShipOrder/Item[0]/Title"/>
                </Title>
                <Note>
                    <xsl:value-of select="/ns0:ShipOrder/Item[0]/Note"/>
                </Note>
                <Quantity>
                    <xsl:value-of select="/ns0:ShipOrder/Item[0]/Quantity"/>
                </Quantity>
                <Price>
                    <xsl:value-of select="/ns0:ShipOrder/Item[0]/Price"/>
                </Price>
            </Item>
            <Item xmlns="">
                <Title>
                    <xsl:value-of select="/ns0:ShipOrder/Item[1]/Title"/>
                </Title>
                <Note>
                    <xsl:value-of select="/ns0:ShipOrder/Item[1]/Note"/>
                </Note>
                <Quantity>
                    <xsl:value-of select="/ns0:ShipOrder/Item[1]/Quantity"/>
                </Quantity>
                <Price>
                    <xsl:value-of select="/ns0:ShipOrder/Item[1]/Price"/>
                </Price>
            </Item>
        </ShipOrder>
    </xsl:template>
</xsl:stylesheet>

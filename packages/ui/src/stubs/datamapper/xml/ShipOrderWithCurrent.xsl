<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:ship="io.kaoto.datamapper.poc.test">

    <xsl:template match="/">
        <ship:ShipOrder>
            <ship:OrderPerson><xsl:value-of select="/ship:ShipOrder/ship:OrderPerson"/></ship:OrderPerson>
            <ShipTo>
                <xsl:copy-of select="/ship:ShipOrder/ShipTo" />
            </ShipTo>
            <xsl:for-each select="/ship:ShipOrder/Item">
                <Item>
                    <Title><xsl:value-of select="Title"/></Title>
                    <Note>
                        <xsl:value-of select="current()/../OrderPerson"/>
                    </Note>
                    <Quantity><xsl:value-of select="Quantity"/></Quantity>
                    <Price><xsl:value-of select="current()/Price"/></Price>

                </Item>
            </xsl:for-each>
        </ship:ShipOrder>
    </xsl:template>

</xsl:stylesheet>

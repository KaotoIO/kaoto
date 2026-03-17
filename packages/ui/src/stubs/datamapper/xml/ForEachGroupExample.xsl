<?xml version="1.0" encoding="UTF-8"?>
<!--
  Reference XSLT stub for xsl:for-each-group (Issue #2321).
  Shows expected serialization for all 4 grouping strategies.
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="2.0"
                xmlns:ns0="kaoto.datamapper.test">
    <xsl:output method="xml" indent="yes"/>
    <xsl:param name="cart"/>
    <xsl:template match="/">

        <!-- Strategy: group-by -->
        <!--
        <xsl:for-each-group select="$cart/ns0:Cart/Item" group-by="Category">
            <Order>
                <Key><xsl:value-of select="current-grouping-key()"/></Key>
                <xsl:for-each select="current-group()">
                    <Item>
                        <Title><xsl:value-of select="Title"/></Title>
                        <Quantity><xsl:value-of select="Quantity"/></Quantity>
                    </Item>
                </xsl:for-each>
            </Order>
        </xsl:for-each-group>
        -->

        <!-- Strategy: group-adjacent -->
        <!--
        <xsl:for-each-group select="$cart/ns0:Cart/Item" group-adjacent="Category">
            <Order>
                <Key><xsl:value-of select="current-grouping-key()"/></Key>
                <xsl:for-each select="current-group()">
                    <Item><xsl:value-of select="Title"/></Item>
                </xsl:for-each>
            </Order>
        </xsl:for-each-group>
        -->

        <!-- Strategy: group-starting-with -->
        <!--
        <xsl:for-each-group select="$cart/ns0:Cart/Item" group-starting-with="self::ns0:Header">
            <Section>
                <xsl:for-each select="current-group()">
                    <Item><xsl:value-of select="Title"/></Item>
                </xsl:for-each>
            </Section>
        </xsl:for-each-group>
        -->

        <!-- Strategy: group-ending-with -->
        <!--
        <xsl:for-each-group select="$cart/ns0:Cart/Item" group-ending-with="self::ns0:Footer">
            <Section>
                <xsl:for-each select="current-group()">
                    <Item><xsl:value-of select="Title"/></Item>
                </xsl:for-each>
            </Section>
        </xsl:for-each-group>
        -->

    </xsl:template>
</xsl:stylesheet>

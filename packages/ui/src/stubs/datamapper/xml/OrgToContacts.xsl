<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:fn="http://www.w3.org/2005/xpath-functions"
    xmlns:tns="kaoto.datamapper.test"
    >

    <xsl:output method="xml" encoding="UTF-8" indent="yes"/>

    <xsl:template match="/">
        <tns:Contacts>
            <xsl:for-each select="/tns:Org/Person/Email">
                <Contact>
                    <OrgName>
                        <xsl:value-of select="../../Name"/>
                    </OrgName>
                    <PersonName>
                        <xsl:value-of select="../Name"/>
                    </PersonName>
                    <Email>
                        <xsl:value-of select="."/>
                    </Email>
                </Contact>
            </xsl:for-each>
        </tns:Contacts>
    </xsl:template>

</xsl:stylesheet>

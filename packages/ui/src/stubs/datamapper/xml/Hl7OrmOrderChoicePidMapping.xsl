<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="urn:hl7-org:v2xml">
  <xsl:output method="xml" indent="yes"/>
  <xsl:template match="/">
    <ns0:ORM_O01>
      <ns0:ORM_O01.PATIENT>
        <ns0:PID>
          <ns0:PID.1>
            <xsl:value-of select="'1'"/>
          </ns0:PID.1>
        </ns0:PID>
      </ns0:ORM_O01.PATIENT>
    </ns0:ORM_O01>
  </xsl:template>
</xsl:stylesheet>

<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="io.kaoto.datamapper.poc.test">
  <xsl:output method="xml" indent="yes"/>
  <xsl:param name="sourceParam1"/>
  <xsl:template match="/">
    <!-- Mapping created on 2024-01-15 -->
    <ShipOrder xmlns="io.kaoto.datamapper.poc.test">
      <!-- Maps order ID from source -->
      <xsl:attribute name="OrderId">
        <xsl:value-of select="/ns0:ShipOrder/@OrderId"/>
      </xsl:attribute>
      <!-- TODO: Add validation for OrderPerson -->
      <xsl:if test="/ns0:ShipOrder/ns0:OrderPerson != ''">
        <OrderPerson>
          <xsl:value-of select="/ns0:ShipOrder/ns0:OrderPerson"/>
        </OrderPerson>
      </xsl:if>
    </ShipOrder>
  </xsl:template>
</xsl:stylesheet>

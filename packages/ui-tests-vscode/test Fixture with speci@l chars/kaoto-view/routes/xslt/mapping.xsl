<?xml version="1.0" encoding="UTF-8"?>
<!-- XSLT of the DataMapper step "log-2614". -->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="2.0">
	<xsl:template match="/">
		<Shipment>
			<ShipmentId><xsl:value-of select="/Order/OrderId"/></ShipmentId>
			<Recipient><xsl:value-of select="/Order/Customer"/></Recipient>
		</Shipment>
	</xsl:template>
</xsl:stylesheet>

package io.kaoto.camelcatalog.beans;

import io.kaoto.camelcatalog.model.CatalogCliArgument;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ConfigBeanTest {

        @Test
        void testGetOutputFolder() {
            ConfigBean configBean = new ConfigBean();
            assertNull(configBean.getOutputFolder());
        }

        @Test
        void testSetOutputFolder() {
            ConfigBean configBean = new ConfigBean();
            configBean.setOutputFolder("outputFolder");
            assertEquals("outputFolder", configBean.getOutputFolder().getPath());
        }

        @Test
        void testGetCatalogsName() {
            ConfigBean configBean = new ConfigBean();
            assertNull(configBean.getCatalogsName());
        }

        @Test
        void testSetCatalogsName() {
            ConfigBean configBean = new ConfigBean();
            configBean.setCatalogsName("catalogsName");
            assertEquals("catalogsName", configBean.getCatalogsName());
        }

        @Test
        void testAddCatalogVersion() {
            ConfigBean configBean = new ConfigBean();
            CatalogCliArgument catalogCliArgument = new CatalogCliArgument();
            configBean.addCatalogVersion(catalogCliArgument);
            assertTrue(configBean.getCatalogVersionSet().contains(catalogCliArgument));
        }

        @Test
        void testGetCatalogVersionSet() {
            ConfigBean configBean = new ConfigBean();
            assertNotNull(configBean.getCatalogVersionSet());
        }

        @Test
        void testGetKameletsVersion() {
            ConfigBean configBean = new ConfigBean();
            assertNull(configBean.getKameletsVersion());
        }

        @Test
        void testSetKameletsVersion() {
            ConfigBean configBean = new ConfigBean();
            configBean.setKameletsVersion("kameletsVersion");
            assertEquals("kameletsVersion", configBean.getKameletsVersion());
        }

        @Test
        void testIsVerbose() {
            ConfigBean configBean = new ConfigBean();
            assertFalse(configBean.isVerbose());
        }

        @Test
        void testSetVerbose() {
            ConfigBean configBean = new ConfigBean();
            configBean.setVerbose(true);
            assertTrue(configBean.isVerbose());
        }
}
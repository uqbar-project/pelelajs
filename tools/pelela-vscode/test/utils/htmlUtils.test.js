const assert = require("assert");
const { 
  getHtmlElements, 
  getHtmlAttributes, 
  getPelelaAttributes 
} = require("../../src/utils/htmlUtils");

describe("htmlUtils", () => {
  describe("getHtmlElements", () => {
    it("debería retornar un array de elementos HTML", () => {
      const elements = getHtmlElements();
      
      assert.ok(Array.isArray(elements));
      assert.ok(elements.length > 0);
    });

    it("debería incluir elementos comunes", () => {
      const elements = getHtmlElements();
      
      assert.ok(elements.includes("div"));
      assert.ok(elements.includes("span"));
      assert.ok(elements.includes("button"));
      assert.ok(elements.includes("input"));
      assert.ok(elements.includes("section"));
    });

    it("no debería incluir elementos duplicados", () => {
      const elements = getHtmlElements();
      const uniqueElements = [...new Set(elements)];
      
      assert.strictEqual(elements.length, uniqueElements.length);
    });
  });

  describe("getHtmlAttributes", () => {
    it("debería retornar un array de atributos HTML", () => {
      const attributes = getHtmlAttributes();
      
      assert.ok(Array.isArray(attributes));
      assert.ok(attributes.length > 0);
    });

    it("debería incluir atributos comunes", () => {
      const attributes = getHtmlAttributes();
      
      assert.ok(attributes.includes("id"));
      assert.ok(attributes.includes("class"));
      assert.ok(attributes.includes("style"));
      assert.ok(attributes.includes("src"));
      assert.ok(attributes.includes("href"));
    });

    it("debería incluir atributos con guiones", () => {
      const attributes = getHtmlAttributes();
      
      assert.ok(attributes.includes("data-"));
      assert.ok(attributes.includes("aria-"));
    });
  });

  describe("getPelelaAttributes", () => {
    it("debería retornar un array de atributos de Pelela", () => {
      const attributes = getPelelaAttributes();
      
      assert.ok(Array.isArray(attributes));
      assert.ok(attributes.length > 0);
    });

    it("debería incluir todos los atributos de Pelela", () => {
      const attributes = getPelelaAttributes();
      
      assert.ok(attributes.includes("view-model"));
      assert.ok(attributes.includes("bind-value"));
      assert.ok(attributes.includes("if"));
      assert.ok(attributes.includes("bind-class"));
      assert.ok(attributes.includes("bind-style"));
      assert.ok(attributes.includes("click"));
      assert.ok(attributes.includes("for-each"));
    });

    it("debería retornar exactamente 7 atributos", () => {
      const attributes = getPelelaAttributes();
      assert.strictEqual(attributes.length, 7);
    });
  });
});

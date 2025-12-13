const assert = require("node:assert");
const path = require("node:path");
const fs = require("node:fs");
const { findViewModelFile, readFileLines, readFileContent } = require("../../src/utils/fileUtils");

describe("fileUtils", () => {
  const testFilesDir = path.join(__dirname, "../fixtures");
  const testPelelaPath = path.join(testFilesDir, "test.pelela");
  const testTsPath = path.join(testFilesDir, "test.ts");

  before(() => {
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }
    fs.writeFileSync(testPelelaPath, "<div>Test</div>");
    fs.writeFileSync(testTsPath, "export class Test {}");
  });

  after(() => {
    if (fs.existsSync(testPelelaPath)) {
      fs.unlinkSync(testPelelaPath);
    }
    if (fs.existsSync(testTsPath)) {
      fs.unlinkSync(testTsPath);
    }
  });

  describe("findViewModelFile", () => {
    it("debería encontrar el archivo ViewModel correspondiente", () => {
      const mockUri = { fsPath: testPelelaPath };
      const result = findViewModelFile(mockUri);
      
      assert.strictEqual(result, testTsPath);
    });

    it("debería retornar null si no existe el archivo ViewModel", () => {
      const nonExistentPath = path.join(testFilesDir, "nonexistent.pelela");
      const mockUri = { fsPath: nonExistentPath };
      const result = findViewModelFile(mockUri);
      
      assert.strictEqual(result, null);
    });
  });

  describe("readFileLines", () => {
    it("debería leer un archivo y retornar un array de líneas", () => {
      const testContent = "line1\nline2\nline3";
      const testFile = path.join(testFilesDir, "readtest.txt");
      fs.writeFileSync(testFile, testContent);
      
      const lines = readFileLines(testFile);
      
      assert.ok(Array.isArray(lines));
      assert.strictEqual(lines.length, 3);
      assert.strictEqual(lines[0], "line1");
      assert.strictEqual(lines[1], "line2");
      assert.strictEqual(lines[2], "line3");
      
      fs.unlinkSync(testFile);
    });

    it("debería manejar archivos vacíos", () => {
      const testFile = path.join(testFilesDir, "empty.txt");
      fs.writeFileSync(testFile, "");
      
      const lines = readFileLines(testFile);
      
      assert.ok(Array.isArray(lines));
      assert.strictEqual(lines.length, 1);
      assert.strictEqual(lines[0], "");
      
      fs.unlinkSync(testFile);
    });
  });

  describe("readFileContent", () => {
    it("debería leer el contenido completo de un archivo", () => {
      const testContent = "Hello World\nSecond line";
      const testFile = path.join(testFilesDir, "content.txt");
      fs.writeFileSync(testFile, testContent);
      
      const content = readFileContent(testFile);
      
      assert.strictEqual(content, testContent);
      
      fs.unlinkSync(testFile);
    });

    it("debería manejar archivos vacíos", () => {
      const testFile = path.join(testFilesDir, "empty2.txt");
      fs.writeFileSync(testFile, "");
      
      const content = readFileContent(testFile);
      
      assert.strictEqual(content, "");
      
      fs.unlinkSync(testFile);
    });
  });
});

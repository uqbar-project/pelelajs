const fs = require("node:fs");

function findViewModelFile(pelelaUri) {
  const pelelaPath = pelelaUri.fsPath;
  const tsPath = pelelaPath.replace(/\.pelela$/, ".ts");
  if (fs.existsSync(tsPath)) {
    return tsPath;
  }
  return null;
}

function readFileLines(filePath) {
  const text = fs.readFileSync(filePath, "utf-8");
  return text.split("\n");
}

function readFileContent(filePath) {
  return fs.readFileSync(filePath, "utf-8");
}

module.exports = {
  findViewModelFile,
  readFileLines,
  readFileContent,
};

import * as fs from 'node:fs'
import {
  type ConstValueVerdict,
  checkConstValue,
  createViewModelProgramContextFromProgram,
  extractViewModelPropertyTypesWithContext,
  resolveCompilerOptions,
  type ViewModelProgramContext,
  type ViewModelPropertyTypes,
} from 'pelelajs/analysis'
import * as ts from 'typescript'

/**
 * Reuses a single TypeScript language service across validations. Building a
 * `ts.Program` per call costs hundreds of milliseconds because every program
 * reloads the standard library, while the language service keeps the lib loaded
 * and reuses the program while no tracked file changes.
 *
 * No `ts.Type` is ever cached. A type object belongs to the program that
 * resolved it, and handing a stale type to a newer checker yields a plausible
 * looking but outdated answer, so the risk is avoided by never retaining one
 * instead of by trying to detect staleness afterwards.
 */
export class ViewModelLanguageService {
  private readonly languageService: ts.LanguageService
  private readonly compilerOptions: ts.CompilerOptions
  private readonly currentDirectory: string
  private readonly rootFiles = new Set<string>()
  private readonly fileVersions = new Map<string, { modificationTime: number; version: string }>()

  constructor(currentDirectory: string) {
    this.currentDirectory = currentDirectory
    this.compilerOptions = resolveCompilerOptions(currentDirectory)
    this.languageService = ts.createLanguageService(this.createHost(), ts.createDocumentRegistry())
  }

  private createHost(): ts.LanguageServiceHost {
    return {
      getCompilationSettings: () => this.compilerOptions,
      getScriptFileNames: () => Array.from(this.rootFiles),
      getScriptVersion: (fileName) => this.scriptVersionOf(fileName),
      getScriptSnapshot: (fileName) => {
        const contents = ts.sys.readFile(fileName)
        return contents === undefined ? undefined : ts.ScriptSnapshot.fromString(contents)
      },
      getCurrentDirectory: () => this.currentDirectory,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      fileExists: ts.sys.fileExists,
      readFile: ts.sys.readFile,
      readDirectory: ts.sys.readDirectory,
      directoryExists: ts.sys.directoryExists,
      getDirectories: ts.sys.getDirectories,
    }
  }

  /**
   * A file whose modification time moved must produce a new version, otherwise
   * the language service hands back the previous program and edits to view
   * models are never diagnosed.
   */
  private scriptVersionOf(fileName: string): string {
    const cached = this.fileVersions.get(fileName)
    const modificationTime = this.modificationTimeOf(fileName)

    if (cached !== undefined && cached.modificationTime === modificationTime) {
      return cached.version
    }

    const version = `${modificationTime}-${cached?.version ?? '0'}+1`
    this.fileVersions.set(fileName, { modificationTime, version })
    return version
  }

  private modificationTimeOf(fileName: string): number {
    try {
      return fs.statSync(fileName).mtimeMs
    } catch {
      return 0
    }
  }

  /**
   * Forces the next program to be rebuilt even if the file looks untouched,
   * which is what a save through an editor that preserves modification times
   * needs.
   */
  invalidate(tsPath: string): void {
    this.fileVersions.delete(tsPath)
  }

  invalidateAll(): void {
    this.fileVersions.clear()
  }

  private contextFor(tsPath: string): ViewModelProgramContext {
    this.rootFiles.add(tsPath)

    const program = this.languageService.getProgram()
    if (program === undefined) {
      throw new Error(`Pelela could not build a program for ${tsPath}`)
    }

    return createViewModelProgramContextFromProgram(program, tsPath)
  }

  propertyTypes(tsPath: string, className: string): ViewModelPropertyTypes {
    return extractViewModelPropertyTypesWithContext(this.contextFor(tsPath), className)
  }

  constValue(params: {
    tsPath: string
    className: string
    propertyName: string
    rawValue: string
  }): ConstValueVerdict {
    return checkConstValue({
      context: this.contextFor(params.tsPath),
      className: params.className,
      propertyName: params.propertyName,
      rawValue: params.rawValue,
    })
  }

  dispose(): void {
    this.languageService.dispose()
    this.rootFiles.clear()
    this.fileVersions.clear()
  }
}

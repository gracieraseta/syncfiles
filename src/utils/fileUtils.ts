import crypto from 'crypto'
import fs     from 'fs'
import path   from 'path'
import { minimatch } from 'minimatch'
import type { FilterConfig } from '../shared/types'

export function computeChecksum(
  filePath: string,
  algo: 'sha256' | 'md5' = 'sha256'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash   = crypto.createHash(algo)
    const stream = fs.createReadStream(filePath)
    stream.on('data',  chunk => hash.update(chunk))
    stream.on('end',   ()    => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

export function shouldExclude(
  cheminRelatif: string,
  tailleFichier: number,
  config: FilterConfig
): boolean {
  for (const pattern of config.exclure) {
    if (minimatch(cheminRelatif, pattern, { dot: true, matchBase: true })) return true
    if (minimatch(path.basename(cheminRelatif), pattern, { dot: true }))   return true
  }
  if (config.inclure.length > 0) {
    const inclus = config.inclure.some(p =>
      minimatch(cheminRelatif, p, { dot: true, matchBase: true })
    )
    if (!inclus) return true
  }
  if (config.taille_max_mo !== null) {
    if (tailleFichier / (1024 * 1024) > config.taille_max_mo) return true
  }
  return false
}

export interface FileScanResult {
  cheminRelatif: string
  cheminAbsolu:  string
  taille:        number
  dateMod:       Date
  checksum?:     string
}

export async function scanDirectory(
  rootPath:      string,
  filtres:       FilterConfig,
  withChecksum = false
): Promise<FileScanResult[]> {
  const results: FileScanResult[] = []

  async function walk(dir: string): Promise<void> {
    let entries: fs.Dirent[]
    try { entries = await fs.promises.readdir(dir, { withFileTypes: true }) }
    catch { return }

    for (const entry of entries) {
      const absPath = path.join(dir, entry.name)
      const relPath = path.relative(rootPath, absPath)

      if (entry.isDirectory()) {
        if (shouldExclude(relPath + '/', 0, filtres)) continue
        await walk(absPath)
      } else if (entry.isFile()) {
        let stat: fs.Stats
        try { stat = await fs.promises.stat(absPath) } catch { continue }
        if (shouldExclude(relPath, stat.size, filtres)) continue

        const result: FileScanResult = {
          cheminRelatif: relPath,
          cheminAbsolu:  absPath,
          taille:        stat.size,
          dateMod:       stat.mtime
        }
        if (withChecksum) {
          try { result.checksum = await computeChecksum(absPath) } catch {}
        }
        results.push(result)
      }
    }
  }

  await walk(rootPath)
  return results
}

export async function copyFile(
  src: string,
  dst: string
): Promise<{ checksum: string; taille: number }> {
  await fs.promises.mkdir(path.dirname(dst), { recursive: true })
  await fs.promises.copyFile(src, dst)
  const stat     = await fs.promises.stat(dst)
  const checksum = await computeChecksum(dst)
  return { checksum, taille: stat.size }
}

export async function removeFile(filePath: string): Promise<void> {
  try {
    await fs.promises.unlink(filePath)
    const dir     = path.dirname(filePath)
    const entries = await fs.promises.readdir(dir)
    if (entries.length === 0) await fs.promises.rmdir(dir)
  } catch {}
}

export async function pathExists(p: string): Promise<boolean> {
  try { await fs.promises.access(p, fs.constants.F_OK); return true }
  catch { return false }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  if (bytes < 1024 ** 3)   return `${(bytes / 1024 ** 2).toFixed(1)} Mo`
  return `${(bytes / 1024 ** 3).toFixed(2)} Go`
}

export function formatDuration(ms: number): string {
  if (ms < 1000)  return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const min = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  return `${min}m ${sec}s`
}
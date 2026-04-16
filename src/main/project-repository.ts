import { mkdir, readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

import type { ReviewProjectSnapshot } from './project-scanner'

export class ProjectRepository {
  constructor(private readonly baseDir: string) {}

  async listSnapshots(): Promise<ReviewProjectSnapshot[]> {
    await mkdir(this.baseDir, { recursive: true })
    const entries = await readdir(this.baseDir, { withFileTypes: true })
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .sort((left, right) => right.name.localeCompare(left.name, 'zh-CN'))

    const snapshots: ReviewProjectSnapshot[] = []

    for (const file of files) {
      try {
        const content = await readFile(join(this.baseDir, file.name), 'utf8')
        snapshots.push(JSON.parse(content) as ReviewProjectSnapshot)
      } catch (error) {
        console.error(`读取项目快照失败: ${file.name}`, error)
      }
    }

    return snapshots.sort((left, right) =>
      (right.project.lastOpenedAt ?? right.project.updatedAt).localeCompare(
        left.project.lastOpenedAt ?? left.project.updatedAt,
        'zh-CN'
      )
    )
  }

  async saveSnapshot(snapshot: ReviewProjectSnapshot): Promise<void> {
    await mkdir(this.baseDir, { recursive: true })
    const filePath = join(this.baseDir, `${snapshot.project.id}.json`)
    await writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf8')
  }
}

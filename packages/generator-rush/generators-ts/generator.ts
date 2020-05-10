import Generator from 'yeoman-generator'
import * as fs from 'fs'
import * as path from 'path'
import * as util from 'util'
import { ChildProcess } from 'child_process'
import * as semver from 'semver'
import { readToEnd, withTmpDir } from './util'

/* eslint-disable @typescript-eslint/typedef */
const readdir = util.promisify(fs.readdir)
const readFile = util.promisify(fs.readFile)
/* eslint-enable @typescript-eslint/typedef */

export abstract class GeneratorBase extends Generator {
    protected rushUpdate(cwd: string = this.destinationPath()): void {
        this.spawnCommandSync(`rush`, [ `update`, `--full` ], {
            cwd,
            shell: true
        })
    }

    protected async getLatestPackageVersion(name: string): Promise<string | undefined> {
        const npmProcess: ChildProcess = this.spawnCommand(
            `npm`,
            [`view`, name, `version`],
            { stdio: `pipe` }
        )
        if (!npmProcess.stdout) {
            throw new Error(`Could not get stdout stream from npm process`)
        }

        const output: string = (await readToEnd(npmProcess.stdout)).trim()

        return semver.valid(output) || undefined
    }    

    protected spawnSyncInDestination(command: string, ...args: string[]): unknown {
        return this.spawnCommandSync(command, args, {
            cwd: this.destinationPath(),
            shell: true
        })
    }

    protected copyFromTemplate(...path: string[]): void {
        this.fs.copy(
            this.templatePath(...path),
            this.destinationPath(...path)
        )
    }

    private async _copyToInMemoryFilesystem(tempdir: string, entry: fs.Dirent, paths: string[]): Promise<void> {
        const relativePath: string = path.join(...paths, entry.name)
        const absolutePath: string = path.join(tempdir, relativePath)

        if (entry.isDirectory()) {
            for (const child of await readdir(absolutePath, { withFileTypes: true })) {
                await this._copyToInMemoryFilesystem(tempdir, child, [ ...paths, entry.name ])
            }
        }

        if (entry.isFile()) {
            const content: string = (await readFile(absolutePath)).toString()

            this.fs.write(
                this.destinationPath(relativePath),
                content
            )
        }
    }

    protected async populateFilesystem(action: (root: string) => Promise<void>): Promise<void> {
        await withTmpDir({}, async root => {
            await action(root)
    
            for (const entry of await readdir(root, { withFileTypes: true })) {
                await this._copyToInMemoryFilesystem(root, entry, [])
            }
        })
    }
}

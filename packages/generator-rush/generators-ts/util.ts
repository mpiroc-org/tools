import Generator from 'yeoman-generator'
import * as fs from 'fs'
import * as path from 'path'
import * as tmp from 'tmp'
import * as util from 'util'
import { Readable } from 'stream'

/* eslint-disable @typescript-eslint/typedef */
const readdir = util.promisify(fs.readdir)
const readFile = util.promisify(fs.readFile)
/* eslint-enable @typescript-eslint/typedef */

interface ITmpDirResult {
    root: string
    removeCallback: () => void
}

async function tmpDir(options: tmp.DirOptions): Promise<ITmpDirResult> {
    return await new Promise<ITmpDirResult>((resolve, reject) => {
        tmp.dir(options, (err, name, removeCallback) => {
            if (err) {
                reject(err)
            } else {
                resolve({
                    root: name,
                    removeCallback
                })
            }
        })
    })
}

async function withTmpDir(options: tmp.DirOptions, action: (root: string) => Promise<void>): Promise<void> {
    const { root, removeCallback } = await tmpDir(options)
    await action(root)
    removeCallback()
}

export async function readToEnd(stream: Readable): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
        const chunks: Uint8Array[] = []
        stream.on(`data`, chunk => chunks.push(chunk))
        stream.on(`error`, reject)
        stream.on(`end`, () => resolve(Buffer.concat(chunks).toString()))
    })
}

export abstract class GeneratorBase extends Generator {
    

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

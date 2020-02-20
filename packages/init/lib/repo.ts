import { spawnSync } from 'child_process'
import * as fse from 'fs-extra'
import * as path from 'path'
import { readAssets, writeAsset, IAsset } from './asset'

function spawn(cwd: string, command: string, ...args: string[]): void {
    spawnSync(
        command,
        args,
        {
            cwd,
            shell: true
        }
    )
}

export async function initRepo({ cwd }: { cwd: string }): Promise<void> {
    spawn(cwd, `rush`, `init`)
    
    const filesToDelete: string[] = [
        `.gitignore`,
        `rush.json`,
        `.travis.yml`,
        path.join(`common`, `config`, `rush`, `.npmrc`),
        path.join(`common`, `config`, `rush`, `command-line.json`),
        path.join(`common`, `config`, `rush`, `version-policies.json`),
    ]
    await Promise.all(filesToDelete.map(
        /* eslint-disable @typescript-eslint/promise-function-async */
        fileToDelete => fse.unlink(fileToDelete)
        /* eslint-enable @typescript-eslint/promise-function-async */
    ))

    const assets: IAsset[] = await readAssets(path.join(__dirname, `assets`, `repo`))
    
    for (const asset of assets) {
        await writeAsset(asset, cwd)
    }

    spawn(cwd, `git`, `init`)
    spawn(cwd, `git`, `add`, `.`)
    spawn(cwd, `git`, `commit`, `-m`, `Initial commit.`)
    spawn(cwd, `git`, `tag`, `-a`, `publish/current`)
}

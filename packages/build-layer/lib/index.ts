import { spawnSync, SpawnSyncReturns } from 'child_process'
import * as jsonc from 'jsonc-parser'
import * as fs from 'fs'
import * as fse from 'fs-extra'
import * as path from 'path'
import * as util from 'util'
import * as del from 'del'

/* eslint-disable @typescript-eslint/typedef */ 
const access = util.promisify(fs.access)
const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)
const mkdir = util.promisify(fs.mkdir)
/* eslint-enable @typescript-eslint/typedef */ 

const TAB_WIDTH: number = 4
const BUILD_DIR: 'dist' = `dist`
const TARGET_PATH: string = path.join(BUILD_DIR, `nodejs`)
const MANIFEST_NAME: 'package.json' = `package.json`
const MANIFEST_LOCK_NAME: 'package-lock.json' = `package-lock.json`
const INTERNAL_SCOPE: '@meal-planner/' = `@meal-planner/`

interface ISpawnSyncCoreOptions {
    command: string
    cwd?: string
    env?: NodeJS.ProcessEnv
    args?: readonly string[]
}

function spawnSyncCore({
    command,
    cwd,
    env,
    args
}: ISpawnSyncCoreOptions): void {
    const result: SpawnSyncReturns<Buffer> = spawnSync(command, args, {
        shell: true,
        cwd,
        env
    })

    if (result.error) {
        throw result.error
    }
    if (result.status !== 0) {
        throw new Error(`${command} returned a non-zero exit code: ${JSON.stringify({
            stdout: result.stdout.toString(),
            stderr: result.stderr.toString(),
            status: result.status,
            signal: result.signal
        }, undefined, TAB_WIDTH)}`)
    }

    console.log(result.stdout.toString())
}

interface IMinimalPackageManifest {
    description: string
    repository: unknown
    license: string
    dependencies: {
        [packageName: string]: string | undefined
    }
}

interface IDependencyMap {
    [key: string]: string | undefined
}

interface IDepedencyGroups {
    internal: IDependencyMap
    external: IDependencyMap
}

async function readManifest(sourcePath: string): Promise<IMinimalPackageManifest> {
    const raw: string = (await readFile(sourcePath)).toString()

    return jsonc.parse(raw)
}

async function writeManifest(targetPath: string, manifest: IMinimalPackageManifest): Promise<void> {
    const targetDir: string = path.dirname(targetPath)
    try {
        await access(targetDir)
    } catch {
        await mkdir(targetDir, {
            recursive: true
        })
    }

    const raw: string = JSON.stringify(manifest)

    await writeFile(targetPath, raw)
}

function splitDependencies(dependencies: IDependencyMap): IDepedencyGroups {
    return Object.keys(dependencies).reduce<IDepedencyGroups>(
        (groups, name) => {
            if (name.startsWith(INTERNAL_SCOPE)) {
                groups.internal[name] = dependencies[name]
            } else {
                groups.external[name] = dependencies[name]
            }

            return groups
        },
        {
            internal: {},
            external: {}
        }
    )
}

function installExternalDependencies(targetDir: string): void {
    spawnSyncCore({
        command: `npm`,
        cwd: targetDir,
        env: {
            ...process.env,
            NODE_ENV: `production`
        },
        args: [
            `install`
        ],
    })
}

async function installInternalDependencies(dependencies: IDependencyMap, targetDir: string): Promise<void> {
    const sourcePaths: string[] = Object.keys(dependencies)
        .map(dependency => path.join(`node_modules`, dependency))

    for (const sourcePath of sourcePaths) {
        const targetPath: string = path.join(targetDir, sourcePath)
        const sourceManifestPath: string = path.join(sourcePath, MANIFEST_NAME)
        const sourceDistPath: string = path.join(sourcePath, BUILD_DIR)

        await fse.copy(sourcePath, targetPath, {
            dereference: true,
            recursive: true,
            filter: (src, _dest) => {
                // Only copy package.json and dist/ folder.
                return src === sourcePath || src === sourceManifestPath || src.startsWith(sourceDistPath)
            }
        })
    }
}

/**
 * @alpha
 */
export async function buildLayer(): Promise<void> {
    const {
        description,
        repository,
        license,
        dependencies
    } = await readManifest(MANIFEST_NAME)

    const { internal, external } = splitDependencies(dependencies)
    const targetManifestPath: string = path.join(TARGET_PATH, MANIFEST_NAME)
    const targetManifestLockPath: string = path.join(TARGET_PATH, MANIFEST_LOCK_NAME)

    await writeManifest(
        targetManifestPath,
        {
            description,
            repository,
            license,
            dependencies: external
        }
    )

    installExternalDependencies(TARGET_PATH)
    await installInternalDependencies(internal, TARGET_PATH)

    del.sync(targetManifestPath)
    del.sync(targetManifestLockPath)
}

import * as path from 'path'
import { GeneratorBase } from '../generator'
import { getProjects, IRushJsonProject } from '../rush-json'
import * as fs from 'fs'
import * as util from 'util'

const exists: (path: fs.PathLike) => Promise<boolean> = util.promisify(fs.exists)

type DependencyKind = 'dependencies' | 'devDependencies' | 'peerDependencies'

interface IPackageJsonDependencies {
    [key: string]: string | undefined
}

async function* getLineage(directory: string): AsyncIterableIterator<string> {
    directory = path.resolve(directory)
    if (!await exists(directory)) {
        const existsOnRealFS: boolean = await exists(directory)
        throw new Error(`Path '${directory}' does not exist in in-mem fs (exists on real fs: ${existsOnRealFS})`)
    }

    yield directory

    const parent: string = path.resolve(path.join(directory, `..`))
    if (parent !== directory) {
        yield* getLineage(parent)
    }
}

async function findRushRoot(directory: string): Promise<string | undefined> {
    // At initialization time, the MemFsEditor is not yet populated, so we look at the real filesystem.
    for await (const ancestor of getLineage(directory)) {
        if (await exists(path.join(ancestor, `rush.json`))) {
            return ancestor
        }
    }

    return undefined
}

export default class DependencyGenerator extends GeneratorBase {
    private _currentProject: IRushJsonProject | undefined
    private _rushRoot: string | undefined
    private _projects: Map<string, IRushJsonProject> | undefined
    private _answers: {
        project?: string
        dependency?: string
        type?: DependencyKind
    } = {}

    public async initializing(): Promise<void> {
        const destinationPath: string = this.destinationPath()
        const rushRoot: string | undefined = this._rushRoot = await findRushRoot(destinationPath)
        if (!rushRoot) {
            throw Error(`Could not find rush.json in ${destinationPath}`)
        }

        const raw: string = this.fs.read(path.join(rushRoot, `rush.json`))
        this._projects = new Map<string, IRushJsonProject>(
            getProjects(raw).map(p => [p.packageName, p])
        )

        const lineage: Set<string> = new Set()
        for await (const ancestor of getLineage(destinationPath)) {
            lineage.add(ancestor)
        }
        this._currentProject = [...this._projects.values()].find(
            p => lineage.has(path.resolve(path.join(rushRoot, p.projectFolder)))
        )
    }

    public async prompting(): Promise<void> {
        const projects: Map<string, IRushJsonProject> = this._projects ?? new Map()
        this._answers = await this.prompt([
            {
                type: `list`,
                name: `project`,
                message: `The project to which to add the dependency`,
                choices: [...projects.keys()],
                default: this._currentProject?.packageName
            },
            {
                type: `input`,
                name: `dependency`,
                message: `The name of the package to add as a dependency`
            },
            {
                type: `list`,
                name: `type`,
                message: `The type of dependency`,
                choices: [ `dependencies`, `devDependencies`, `peerDependencies`],
                default: `dependencies`
            }
        ])
    }

    public async writing(): Promise<void> {
        const selectedProject: string | undefined = this._answers?.project
        if (!selectedProject) {
            throw new Error(`User did not select a project`)
        }

        const dependency: string | undefined = this._answers?.dependency
        if (!dependency) {
            throw new Error(`User did not select a dependency`)
        }

        const project: IRushJsonProject | undefined = this._projects?.get(selectedProject)
        if (!project) {
            throw new Error(`Could not find project '${selectedProject}' in rush.json`)
        }

        const packageJsonPath: string = path.join(project.projectFolder, `package.json`)
        if (!this.fs.exists(packageJsonPath)) {
            throw new Error(`Could not find package.json for project '${selectedProject}'`)
        }

        // TODO: regular/dev/peer dependencies.
        const dependenciesKey: string = this._answers.type || `dependencies`
        const packageJson: {
            [key: string]: IPackageJsonDependencies | undefined
        } = this.fs.readJSON(packageJsonPath) || {}

        const dependencies: IPackageJsonDependencies = packageJson[dependenciesKey] = packageJson[dependenciesKey] ?? {}
        if (dependencies[dependency]) {
            throw new Error(`Project ${project} already depends on ${dependency}`)
        }

        const dependencyVersion: string | undefined = await this.getLatestPackageVersion(dependency)
        if (!dependencyVersion) {
            throw new Error(`Could not determine the latest version of package '${dependency}'`)
        }

        dependencies[dependency] = `^${dependencyVersion}`
        this.fs.writeJSON(packageJsonPath, packageJson)
    }

    public install(): void {
        this.rushUpdate(this._rushRoot)
    }
}

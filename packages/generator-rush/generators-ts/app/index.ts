import { GeneratorBase } from '../util'

/**
 * @alpha
 */
export default class RepoGenerator extends GeneratorBase {
    // Yeoman lifecycle:
    // 1. initializing
    // 2. prompting
    // 3. configuring
    // 4. default
    // 5. writing
    // 6. conflicts
    // 7. install
    // 8. end

    private _answers: {
        git?: boolean
        codebuild?: boolean
        travis?: boolean
    } = {}

    public initializing(): void {
        this.composeWith(require.resolve(`../package`), {})
    }

    public async prompting(): Promise<void> {
        this._answers = await this.prompt([
            {
                type: `confirm`,
                name: `git`,
                message: `Initialize a new git repository`
            },
            {
                type: `confirm`,
                name: `codebuild`,
                message: `Include an AWS CodeBuild config file`
            },
            {
                type: `confirm`,
                name: `travis`,
                message: `Include a TravisCI config file`
            }
        ])
    }

    public async configuring(): Promise<void> {
        await this.populateFilesystem(async root => await this.spawnCommandSync(
            `rush`,
            [`init`],
            {
                cwd: root,
                useShell: true
            }
        ))
    }

    public writing(): void {
        this.copyFromTemplate(`.vscode`, `settings.json`)
        this.copyFromTemplate(`common`, `config`, `rush`, `.npmrc`)
        this.copyFromTemplate(`common`, `config`, `rush`, `command-line.json`)
        this.copyFromTemplate(`common`, `config`, `rush`, `version-policies.json`)
        this.copyFromTemplate(`CONTRIBUTING.md`)
        this.copyFromTemplate(`rush.json`)

        if (this._answers.git) {
            this.copyFromTemplate(`.gitignore`)
        }
        if (!this._answers.travis) {
            this.fs.delete(this.destinationPath(`.travis.yml`))
        }
        if (this._answers.codebuild) {
            this.copyFromTemplate(`buildspec.yml`)
        }
    }

    public end(): void {
        if (this._answers.git) {
            this.spawnSyncInDestination(`git`, `init`)
            this.spawnSyncInDestination(`git`, `add`, `.`)
            this.spawnSyncInDestination(`git`, `commit`, `-m`, `"Initial commit."`)
            this.spawnSyncInDestination(`git`, `tag`, `-a`, `publish/current`, `-m`, `"Initial state, not yet published."`)
        }
    }
}

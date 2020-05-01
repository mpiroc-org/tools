import { ChildProcess } from 'child_process'
import * as semver from 'semver'
import { GeneratorBase, readToEnd } from '../util'
import { addCategory, addPackage } from '../rush-json'

// TODO: Automatically determine
const CONFIG_VERSION: string = `0.0.5`

/**
 * @alpha
 */
export default class PackageGenerator extends GeneratorBase {
    private _defaultVersion?: string

    private _answers: {
        name?: string
        scope?: string
        category?: string
        packages?: string
        configVersion?: string
    } = {}

    private get _name(): string {
        if (!this._answers.name) {
            throw new Error(`User did not provide a name`)
        }

        return this._answers.name
    }

    private get _scope(): string {
        if (!this._answers.scope) {
            throw new Error(`User did not provide a scope`)
        }

        return this._answers.scope
    }

    private get _category(): string {
        if (!this._answers.category) {
            throw new Error(`User did not provide a category`)
        }

        return this._answers.category
    }

    private get _packages(): string {
        if (!this._answers.packages) {
            throw new Error(`User did not provide a packages directory`)
        }

        return this._answers.packages
    }

    private get _configVersion(): string {
        if (!this._answers.configVersion) {
            throw new Error(`User did not provide a config version`)
        }

        return this._answers.configVersion
    }

    private async _getPackageVersion(name: string): Promise<string | undefined> {
        const npmProcess: ChildProcess = this.spawnCommand(
            `npm`,
            [`view`, name, `version`],
            { stdio: `pipe` }
        )
        if (!npmProcess.stdout) {
            throw new Error(`Could not get stdout stream from npm process`)
        }

        const output: string = (await readToEnd(npmProcess.stdout)).trim()
        const version: string | null = semver.valid(output)

        if (!version) {
            this.log(`Invalid semver: ${output}, defaulting to ${CONFIG_VERSION}`)
        }

        return version || CONFIG_VERSION
    }

    public async initializing(): Promise<void> {
        this._defaultVersion = await this._getPackageVersion(`@mpiroc-org/ts-config`)
    }

    public async prompting(): Promise<void> {
        this._answers = await this.prompt([
            {
                type: `input`,
                name: `name`,
                message: `The name for the new package`
            },
            {
                type: `input`,
                name: `scope`,
                message: `The scope for the new package`,
                default: `@mpiroc-org`
            },
            {
                type: `input`,
                name: `category`,
                message: `The review category for the new package`,
                default: `production`
            },
            {
                type: `input`,
                name: `packages`,
                message: `The directory in which to place the package`,
                default: `packages`
            },
            {
                type: `input`,
                name: `configVersion`,
                message: `The version of @mpiroc-org/*-config to use.`,
                default: this._defaultVersion || CONFIG_VERSION
            }
        ])
    }

    private _copyToPackage(...path: string[]): void {
        this.fs.copy(
            this.templatePath(...path),
            this.destinationPath(this._packages, this._name, ...path)
        )
    }

    public writing(): void {
        let rushJsonRaw: string = this.fs.read(this.destinationPath(`rush.json`))
        rushJsonRaw = addCategory(rushJsonRaw, this._category)
        rushJsonRaw = addPackage(
            rushJsonRaw,
            {
                name: this._name,
                category: this._category,
                packages: this._packages
            }
        )

        this.fs.write(this.destinationPath(`rush.json`), rushJsonRaw)

        this._copyToPackage(`lib`, `index.ts`)
        this._copyToPackage(`.eslintignore`)
        this._copyToPackage(`.eslintrc.js`)
        this._copyToPackage(`api-extractor.json`)
        this._copyToPackage(`tsconfig.json`)

        this.fs.write(
            this.destinationPath(this._packages, this._name, `etc`, `placeholder`),
            `placeholder`
        )
        this.fs.writeJSON(
            this.destinationPath(this._packages, this._name, `package.json`),
            this._buildPackageManifest()
        )
    }

    public install(): void {
        this.spawnCommandSync(`rush`, [ `update`, `--full` ], {
            cwd: this.destinationPath(this._packages, this._name),
            shell: true
        })
    }

    private _buildPackageManifest(): {} {
        return {
            name: `${this._scope}/${this._name}`,
            version: `0.0.1`,
            description: `placeholder`,
            keywords: [],
            homepage: `https://github.com/mpiroc-org/${this._name}#readme`,
            bugs: `https://github.com/mpiroc-org/${this._name}/issues`,
            license: `UNLICENSED`,
            author: `Matthew Pirocchi <matthew.pirocchi@gmail.com>`,
            contributors: [],
            main: `out/lib/index.js`,
            types: `out/lib/index.d.ts`,
            repository: `github:mpiroc-org/${this._name}`,
            scripts: {
                build: `tsc && parcel build lib/index.ts --out-dir dist/lib --target node --no-minify && api-extractor run --local --verbose`,
                lint: `eslint --ext .ts .`,
                test: `jest 2> out/jest-stderr.log`
            },
            engines: {
                node: `^12.13.0`
            },
            publishConfig: {
                registry: `https://npm.pkg.github.com/`,
                main: `dist/lib/index.js`,
                types: `dist/lib/index.d.ts`
            },
            jest: {
                preset: `@mpiroc-org/jest-config`
            },
            devDependencies: {
                '@microsoft/api-extractor': `^7.7.8`,
                '@mpiroc-org/eslint-config': `^${this._configVersion}`,
                '@mpiroc-org/ts-config': `^${this._configVersion}`,
                '@mpiroc-org/api-extractor-config': `^${this._configVersion}`,
                '@mpiroc-org/jest-config': `^${this._configVersion}`,
                '@types/jest': `^24.0.23`,
                '@types/node': `^12.12.8`,
                '@typescript-eslint/eslint-plugin': `^2.21.0`,
                '@typescript-eslint/parser': `^2.21.0`,
                'eslint': `^6.8.0`,
                'jest': `^24.9.0`,
                'parcel-bundler': `^1.12.4`,
                'ts-jest': `^24.1.0`,
                'typescript': `^3.7.2`
            }
        }
    }
}


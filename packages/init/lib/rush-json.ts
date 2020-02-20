import * as fse from 'fs-extra'
import * as path from 'path'
import * as jsonc from 'jsonc-parser'
import * as os from 'os'
import { getPackageName } from './util'

export interface IPackageInfo {
    name: string
    category: string
    projectFolder: string
}

export interface IRushConfig {
    save(): Promise<void>
    addCategory(category: string): void
    addPackage(info: IPackageInfo): void
}

interface IRushJson {
    approvedPackagesPolicy?: {
        reviewCategories?: string[]
    }
}

interface IRushJsonProject {
    packageName: string
    projectFolder: string
    reviewCategory: string
    shouldPublish: boolean
    versionPolicyName: string
}

const TAB_SIZE: number = 4
const formattingOptions: jsonc.FormattingOptions = {
    tabSize: TAB_SIZE,
    insertSpaces: true,
    eol: os.EOL
}

class RushConfig implements IRushConfig {
    private readonly _path: string
    private _raw: string
    private _isDirty: boolean = false

    private constructor(path: string, raw: string) {
        this._path = path
        this._raw = raw
    }

    public static async load(path: string): Promise<RushConfig> {
        const raw: string = (await fse.readFile(path)).toString()

        return new RushConfig(path, raw)
    }

    private _edit(edits: jsonc.Edit[]): void {
        this._raw = jsonc.applyEdits(this._raw, edits)
        this._isDirty = true
    }

    private _parse(): IRushJson {
        return jsonc.parse(this._raw)
    }

    public async save(): Promise<void> {
        if (!this._isDirty) {
            return
        }

        await fse.writeFile(this._path, this._raw)
        this._isDirty = false
    }

    public addCategory(category: string): void {
        const original: IRushJson = this._parse()

        const reviewCategories: string[] | undefined = original?.approvedPackagesPolicy?.reviewCategories
        if (!reviewCategories || !reviewCategories.includes(category)) {
            const edits: jsonc.Edit[] = jsonc.modify(
                this._raw,
                [
                    `approvedPackagesPolicy`,
                    `reviewCategories`,
                    -1
                ],
                category,
                { formattingOptions }
            )

            this._edit(edits)
        }
    }

    public addPackage({ name, category, projectFolder }: IPackageInfo): void {
        const project: IRushJsonProject = {
            packageName: getPackageName(name),
            projectFolder: projectFolder.replace(path.win32.sep, path.posix.sep),
            reviewCategory: category,
            shouldPublish: true,
            versionPolicyName: `default`
        }

        const edits: jsonc.Edit[] = jsonc.modify(
            this._raw,
            [ `projects`, -1 ],
            project,
            { formattingOptions }
        )

        this._edit(edits)
    }
}

export async function loadConfig(path: string): Promise<IRushConfig> {
    return await RushConfig.load(path)
}
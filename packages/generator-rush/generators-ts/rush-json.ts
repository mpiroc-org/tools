import * as path from 'path'
import * as jsonc from 'jsonc-parser'
import * as os from 'os'

function getPackageName(name: string): string {
    return `@mpiroc-org/${name}`
}

export interface IPackageInfo {
    name: string
    category: string
    packages: string
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

export function addCategory(originalRaw: string, category: string): string {
    const original: IRushJson = jsonc.parse(originalRaw)

    const reviewCategories: string[] | undefined = original?.approvedPackagesPolicy?.reviewCategories
    if (reviewCategories && reviewCategories.includes(category)) {
        return originalRaw
    }

    const edits: jsonc.Edit[] = jsonc.modify(
        originalRaw,
        [
            `approvedPackagesPolicy`,
            `reviewCategories`,
            -1
        ],
        category,
        { formattingOptions }
    )

    return jsonc.applyEdits(originalRaw, edits)
}

export function addPackage(originalRaw: string, { name, category, packages }: IPackageInfo): string {
    const project: IRushJsonProject = {
        packageName: getPackageName(name),
        projectFolder: path.join(packages, name).replace(path.win32.sep, path.posix.sep),
        reviewCategory: category,
        shouldPublish: true,
        versionPolicyName: `default`
    }

    const edits: jsonc.Edit[] = jsonc.modify(
        originalRaw,
        [ `projects`, -1 ],
        project,
        { formattingOptions }
    )

    return jsonc.applyEdits(originalRaw, edits)
}


import * as path from 'path'
import { IAsset, writeAsset, readAssets } from './asset'
import { loadConfig, IRushConfig } from './rush-json'
import { getPackageName } from './util'

// TODO: Use version of @mpiroc-org/ts-config by default.
const CONFIG_VERSION: string = `0.0.4`
// TODO: Use version of an arbitrary package in the current repository, if any exist.
const PACKAGE_VERSION: string = `0.0.1`
const CATEGORY: string = `production`
const PACKAGES_ROOT: string = `packages`
const TAB_SIZE: number = 4

/**
 * @alpha
 */
export interface IInitOptions {
    name: string
    description: string
    cwd: string
}

function buildPackageManifest(
    { name, description, cwd }: IInitOptions
): string {
    const repo: string = path.basename(cwd)

    return JSON.stringify({
        name: getPackageName(name),
        version: PACKAGE_VERSION,
        description,
        keywords: [],
        homepage: `https://github.com/mpiroc-org/${repo}#readme`,
        bugs: `https://github.com/mpiroc-org/${repo}/issues`,
        license: `UNLICENSED`,
        author: `Matthew Pirocchi <matthew.pirocchi@gmail.com>`,
        contributors: [],
        main: `out/lib/index.js`,
        types: `out/lib/index.d.ts`,
        repository: `github:mpiroc-org/${repo}`,
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
            '@mpiroc-org/eslint-config': `^${CONFIG_VERSION}`,
            '@mpiroc-org/ts-config': `^${CONFIG_VERSION}`,
            '@mpiroc-org/api-extractor-config': `^${CONFIG_VERSION}`,
            '@mpiroc-org/jest-config': `^${CONFIG_VERSION}`,
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
    }, undefined, TAB_SIZE)
}

/**
 * @param options - Options for the new package.
 * @alpha
 */
export async function initPackage(options: IInitOptions): Promise<void> {
    const { name, cwd } = options
    const targetDirectory: string = path.join(cwd, PACKAGES_ROOT, name)

    const allAssets: IAsset[] = [
        ...await readAssets(path.join(__dirname, `assets`, `package`)),
        {
            relativePath: `package.json`,
            raw: buildPackageManifest(options)
        },
        {
            relativePath: path.join(`etc`, `placeholder`),
            raw: `placeholder`
        }
    ]

    for (const asset of allAssets) {
        await writeAsset(asset, targetDirectory)
    }
    
    // Update rush.json
    const rushConfig: IRushConfig = await loadConfig(path.join(cwd, `rush.json`))
    rushConfig.addCategory(CATEGORY)
    rushConfig.addPackage({
        projectFolder: targetDirectory,
        name,
        category: CATEGORY
    })
    await rushConfig.save()

    // TODO: Run rush update?
}

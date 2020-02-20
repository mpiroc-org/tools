import * as fse from 'fs-extra'
import * as path from 'path'
import { Stats } from 'fs-extra'

export interface IAsset {
    readonly relativePath: string
    readonly raw: string
}

async function readAsset(root: string, relativePath: string): Promise<IAsset> {
    const absolutePath: string = path.join(root, relativePath)
    const raw: string = (await fse.readFile(absolutePath)).toString()

    return {
        relativePath,
        raw
    }
}

async function readAssetsCore(root: string, subpath: string[] = []): Promise<IAsset[]> {
    const relativePath: string = path.join(...subpath)
    const absolutePath: string = path.join(root, relativePath)
    const stats: Stats = await fse.stat(absolutePath)

    if (stats.isFile()) {
        return [ await readAsset(root, relativePath) ]
    }

    if (stats.isDirectory()) {
        const children: string[] = await fse.readdir(absolutePath)
        const allAssets: IAsset[][] = await Promise.all(children.map(
            /* eslint-disable @typescript-eslint/promise-function-async */
            child => readAssetsCore(root, [...subpath, child])
            /* eslint-enable @typescript-eslint/promise-function-async */
        ))
        
        return allAssets.reduce(
            (previous, current) => previous.concat(current),
            []
        )
    }

    return []
}

export async function writeAsset(asset: IAsset, root: string): Promise<void> {
    const fullPath: string = path.join(root, asset.relativePath)
    
    await fse.mkdirp(path.dirname(fullPath))
    await fse.writeFile(fullPath, asset.raw)
}

export async function readAssets(root: string): Promise<IAsset[]> {
    return await readAssetsCore(root)
}

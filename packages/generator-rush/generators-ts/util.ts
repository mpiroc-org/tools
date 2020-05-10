import * as tmp from 'tmp'
import { Readable } from 'stream'

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

export async function withTmpDir(options: tmp.DirOptions, action: (root: string) => Promise<void>): Promise<void> {
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


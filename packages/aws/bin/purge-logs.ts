#!/usr/bin/env node
import { config, CloudWatchLogs } from 'aws-sdk'

async function* describeLogGroups(client: CloudWatchLogs): AsyncIterable<CloudWatchLogs.LogGroup> {
    let nextToken: string | undefined  = undefined
    do {
        const response: CloudWatchLogs.DescribeLogGroupsResponse = await client.describeLogGroups({ nextToken }).promise()

        yield* response.logGroups || []
        nextToken = response.nextToken
    } while (nextToken)
}

/**
 * @alpha
 */
export async function deleteAllLogGroups(): Promise<void> {
    config.region = `us-east-1`
    const client: CloudWatchLogs = new CloudWatchLogs()

    for await (const logGroup of describeLogGroups(client)) {
        if (logGroup.logGroupName) {
            console.log(`Deleting log group ${logGroup.logGroupName}...`)
            await client.deleteLogGroup({
                logGroupName: logGroup.logGroupName
            }).promise()
        }
    }
}

async function main(): Promise<void> {
    await deleteAllLogGroups()

    console.log(`done`)
}

/* eslint-disable @typescript-eslint/no-floating-promises */
main()
/* eslint-enable @typescript-eslint/no-floating-promises */

#!/usr/bin/env node
import * as yargs from 'yargs'
import { initPackage, initRepo } from '../lib'

function init(): unknown {
    return yargs
        .command(`repo`, `initialize a new rush-based repository`,
            {
                cwd: {
                    type: `string`,
                    description: `The working directory in which to initialize the repository`,
                    required: false,
                    default: `.`
                }
            },
            /* eslint-disable @typescript-eslint/no-misused-promises */
            initRepo
            /* eslint-enable @typescript-eslint/no-misused-promises */
        )
        .command(`package`, `initialize`,
            {
                name: {
                    alias: `n`,
                    type: `string`,
                    description: `The short name of the package to create`,
                    required: true
                },
                description: {
                    alias: `d`,
                    type: `string`,
                    description: `The description for the package`,
                    required: false,
                    default: `REPLACEME`
                },
                cwd: {
                    type: `string`,
                    description: `The working directory in which to create the project`,
                    required: false,
                    default: `.`
                }
            },
            /* eslint-disable @typescript-eslint/no-misused-promises */
            initPackage
            /* eslint-enable @typescript-eslint/no-misused-promises */
        )
        .demandCommand()
        .argv
}

init()

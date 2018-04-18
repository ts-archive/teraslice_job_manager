'use strict';

const fs = require('fs-extra');
const argv = {};
const tjmFunctions = require('../cmds/cmd_functions/functions')(argv, 'localhost');
const Promise = require('bluebird');
const path = require('path');

let jobContents;
let someJobId;
const _teraslice = {
    jobs: {
        wrap: (jobContents) => {
                return { spec: () => {
                    return Promise.resolve({
                        job_id: someJobId
                    })
                }
            }
        }
    }
};

describe('teraslice job manager testing', () => {
    it('check that cluster name starts with http', () => {
        expect(tjmFunctions.httpClusterNameCheck('localhost')).toBe('http://localhost');
        expect(tjmFunctions.httpClusterNameCheck('http://localhost')).toBe('http://localhost');
        expect(tjmFunctions.httpClusterNameCheck('https://localhost')).toBe('https://localhost');
    });

    it('check that job files do not have to end in json', () => {
        fs.writeFileSync(`${process.cwd()}/tfile.prod.json`, JSON.stringify({ test: 'test' }));
        let jobFileFunctions = require('../cmds/cmd_functions/json_data_functions')('tfile.prod.json');
        let jobData = jobFileFunctions.jobFileHandler();
        expect((jobData[1]).test).toBe('test');
        jobFileFunctions = require('../cmds/cmd_functions/json_data_functions')('tfile.prod');
        jobData = jobFileFunctions.jobFileHandler();
        expect((jobData[1]).test).toBe('test');
        fs.unlinkSync(`${process.cwd()}/tfile.prod.json`);
    });

    it('registered jobs return true, unregistered jobs return false', () => {
        jobContents = {
            tjm: {
                cluster: 'http://localhost',
                job_id: 'jobYouAreLookingFor'
            }
        };

        someJobId = 'jobYouAreLookingFor';

        tjmFunctions.__testContext(_teraslice);
        tjmFunctions.alreadyRegisteredCheck(jobContents)
            .then(alreadyRegistered => {
                expect(alreadyRegistered).toBe(true);
            });

        someJobId = 'notTheJobYouAreLookingFor';
        tjmFunctions.alreadyRegisteredCheck(jobContents)
        .then(alreadyRegistered => {
            expect(alreadyRegistered).toBe(false);
        });

        jobContents = {}
        someJobId = 'jobYouAreLookingFor';
        tjmFunctions.alreadyRegisteredCheck(jobContents)
        .then(alreadyRegistered => {
            expect(alreadyRegistered).toBe(false);
        });

    })

    fit('assets are zipped and loaded to cluster', () => {
        const assetJson = {
            
        }
        // create assets
        // run load assets
        // check that zip file exists
        // correct response from server
        // metadata added to asset.json
    })
});
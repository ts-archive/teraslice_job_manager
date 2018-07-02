'use strict';

const fs = require('fs-extra');
const path = require('path');

describe('jsonDataFunctions', () => {
    it('job files do not have to end in json', () => {
        fs.writeFileSync(
            path.join(
                __dirname,
                '..',
                'tfile.prod.json'
            ),
            JSON.stringify({ test: 'test' })
        );

        const argv = {
            job_file: 'tfile.prod.json',
            tjm_check: false
        }

        let jobFileFunctions = require('../cmds/cmd_functions/json_data_functions')(argv);
        let jobData = jobFileFunctions.jobFileHandler();
        expect(argv.job_file_content.test).toBe('test');

        jobFileFunctions = require('../cmds/cmd_functions/json_data_functions')(argv);
        jobData = jobFileFunctions.jobFileHandler();
        expect(argv.job_file_content.test).toBe('test');
        fs.unlinkSync(path.join(__dirname, '..', 'tfile.prod.json'));
    });

    it('missing job file throws error', () => {
        const argv = {};
        const jobFileFunctions = require('../cmds/cmd_functions/json_data_functions')(argv);
        expect(jobFileFunctions.jobFileHandler).toThrow('Missing the job file!');
    });

    it('bad file path throws an error', () => {
        const argv = {
            job_file: 'jobTest.json'
        };
        const jobFileFunctions = require('../cmds/cmd_functions/json_data_functions')(argv);
        expect(jobFileFunctions.jobFileHandler)
            .toThrow('Sorry, can\'t find the JSON file: jobTest.json');
    });

    it('empty json file throws an error', () => {
        fs.writeFileSync(
            path.join(
                __dirname,
                '..',
                'testFile.json'
            ),
            JSON.stringify({ })
            );

        const argv = {
            job_file: 'testFile.json'
        }

        const jobFileFunctions = require('../cmds/cmd_functions/json_data_functions')(argv);
        expect(jobFileFunctions.jobFileHandler)
            .toThrow('JSON file contents cannot be empty');
        fs.unlinkSync(path.join(__dirname, '..', 'testFile.json'));
    });

    it('should check if tjm data is in the job file', () => {
        const jsonFileData = {
            name: 'this is a name',
            version: '0.0.1',
            tjm: {}
        };

        // test metadata for asset
        jsonFileData.tjm = {
            clusters: ['http://localhost', 'http://cluster2']
        };

        const argv = {};

        let jobFileFunctions = require('../cmds/cmd_functions/json_data_functions')(argv);
        expect(jobFileFunctions._tjmDataCheck(jsonFileData)).toBe(true);
        delete jsonFileData.tjm;

        // test metadata for job
        jsonFileData.tjm = {
            cluster: 'http://localhost'
        };
        expect(jobFileFunctions._tjmDataCheck(jsonFileData)).toBe(true);

        // test no metadata
        delete jsonFileData.tjm;
        jobFileFunctions = require('../cmds/cmd_functions/json_data_functions')();
        expect(jobFileFunctions._tjmDataCheck).toThrow('No teraslice job manager metadata, register the job or deploy the assets');
    });

    it('cluster should be localhost', () => {
        // create test file
        fs.writeFileSync(path.join(__dirname,
            '..',
            'tfile.prod.json'),
            JSON.stringify({ test: 'test' })
        );

        const argv = {
            job_file: 'tfile.prod.json',
            l: true
        };

        const jobFileFunctions = require('../cmds/cmd_functions/json_data_functions')(argv);

        const jobData = jobFileFunctions.returnJobData(true);
        expect(argv.cluster).toBe('http://localhost:5678');
        fs.unlinkSync(path.join(__dirname, '..', 'tfile.prod.json'));
    });

    it('cluster should be from jobFile', () => {
        // create test file
        fs.writeFileSync(path.join(__dirname, '..',
            'fakeFile.json'),
            JSON.stringify({ 
                name: 'fakeJob',
                tjm: {
                    cluster: 'aclustername',
                    job_id: 'jobid'
                }
            })
        );

        const argv = {
            job_file: 'fakeFile.json',
            tjm_check: true
        };

        const jobFileFunctions = require('../cmds/cmd_functions/json_data_functions')(argv);
        const jobData = jobFileFunctions.returnJobData();
        expect(argv.cluster).toBe('aclustername');
        fs.unlinkSync(path.join(__dirname, '..', 'fakeFile.json'));
    });

    it('cluster should be from -c', () => {
        // create test file
        fs.writeFileSync(path.join(__dirname, '..',
            'fakeFile2.json'),
            JSON.stringify({ 
                name: 'fakeJob',
            })
        );

        const argv = {
            job_file: 'fakeFile2.json',
            c: 'someClusterName'
        };

        const jobFileFunctions = require('../cmds/cmd_functions/json_data_functions')(argv);
        const jobData = jobFileFunctions.returnJobData(true);
        expect(argv.cluster).toBe('someClusterName');
        fs.unlinkSync(path.join(__dirname, '..', 'fakeFile2.json'));
    });
});


'use strict';

const fs = require('fs-extra');
const path = require('path');

describe('tests jsonDataFunctions', () => {
    it('job files do not have to end in json', () => {
        fs.writeFileSync(path.join(process.cwd(), 'tfile.prod.json'), JSON.stringify({ test: 'test' }));
        let jobFileFunctions = require('../cmds/cmd_functions/json_data_functions')('tfile.prod.json');
        let jobData = jobFileFunctions.jobFileHandler();
        expect((jobData[1]).test).toBe('test');

        jobFileFunctions = require('../cmds/cmd_functions/json_data_functions')('tfile.prod');
        jobData = jobFileFunctions.jobFileHandler();
        expect((jobData[1]).test).toBe('test');
        fs.unlinkSync(path.join(process.cwd(), 'tfile.prod.json'));
    });

    it('no job file throws error', () => {
        const jobFileFunctions = require('../cmds/cmd_functions/json_data_functions')();
        expect(jobFileFunctions.jobFileHandler).toThrow('Missing the job file!');
    })

    it('path should change to asset/jsonFile if true as second function input', () => {
        fs.emptyDirSync(path.join(process.cwd(), 'asset'));
        fs.writeFileSync(path.join(process.cwd(), 'asset/asset.json'), JSON.stringify({ test: 'test' }));
        let jobFileFunctions = require('../cmds/cmd_functions/json_data_functions')('asset.json', true);
        const returnData = jobFileFunctions.jobFileHandler();
        expect(returnData[0]).toBe(path.join(process.cwd(), 'asset/asset.json'));
        expect(returnData[1].test).toBe('test');
    })

    it('bad file path throws an error', () => {
        let jobFileFunctions = require('../cmds/cmd_functions/json_data_functions')('jobTest.json');
        expect(jobFileFunctions.jobFileHandler).toThrow('Sorry, can\'t find the JSON file: jobTest.json');
    })

    // empty json file
    // returned contents match expected
    // metaDataCheck
});
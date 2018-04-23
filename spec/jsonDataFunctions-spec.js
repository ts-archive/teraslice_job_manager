'use strict';

const jasonDataFunctions = require*('../cmds/cmd_functions/json_data_functions');
const fs = require('fs-extra');

describe('tests jsonDataFunctions', () => {
    it('check that job files do not have to end in json', () => {
        fs.writeFileSync(path.join(process.cwd(), 'tfile.prod.json'), JSON.stringify({ test: 'test' }));
        let jobFileFunctions = require('../cmds/cmd_functions/json_data_functions')('tfile.prod.json');
        let jobData = jobFileFunctions.jobFileHandler();
        expect((jobData[1]).test).toBe('test');
        jobFileFunctions = require('../cmds/cmd_functions/json_data_functions')('tfile.prod');
        jobData = jobFileFunctions.jobFileHandler();
        expect((jobData[1]).test).toBe('test');
        fs.unlinkSync(path.join(process.cwd(), 'tfile.prod.json'));
    });
});
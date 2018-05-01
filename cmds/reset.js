'use strict';

// resets tjm data in a job file
const fs = require('fs-extra')

exports.command = 'reset [jobFile]';
exports.desc = 'Removes tjm data from job file';
exports.builder = (yargs) => {
    yargs.example('tjm reset jobfile.prod -c ts_gen1.tera1.terascope.io');
};
exports.handler = (argv) => {
    const reply = require('./cmd_functions/reply')();
    const jsonData = require('./cmd_functions/json_data_functions')();
    const jobData = jsonData.jobFileHandler(argv.jobFile);
    const jobContents = jobData[1];
    const jobFilePath = jobData[0];
    
    delete jobContents.tjm;
    fs.writeFile(jobFilePath, JSON.stringify(jobContents, null, 4))
        .then(() => reply.success(`TJM data was removed from ${argv.jobFile}`))
        .catch((err) => reply.error(err.message));
};
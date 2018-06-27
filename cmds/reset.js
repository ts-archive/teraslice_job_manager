'use strict';

// removes tjm data from json file
const fs = require('fs-extra');

exports.command = 'reset [jobFile]';
exports.desc = 'Removes tjm data from job or asset file';
exports.builder = (yargs) => {
    yargs.example('tjm reset jobfile.prod');
};
exports.handler = (argv) => {
    const reply = require('./cmd_functions/reply')();
    const jobData = require('./cmd_functions/json_data_functions')()
        .jobFileHandler(argv.jobFile, false);

    const jobContents = jobData.contents;
    const jobFilePath = jobData.file_path;

    delete jobContents.tjm;
    return fs.writeJson(jobFilePath, jobContents, { spaces: 4 })
        .then(() => reply.green(`TJM data was removed from ${argv.jobFile}`))
        .catch(err => reply.fatal(err.message));
};

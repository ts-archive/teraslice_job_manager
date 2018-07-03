'use strict';

const _ = require('lodash');
const reply = require('./cmd_functions/reply')();
const dataChecks = require('./cmd_functions/data_checks');

// removes tjm data from json file
const fs = require('fs-extra');

exports.command = 'reset [job_file]';
exports.desc = 'Removes tjm data from job or asset file';
exports.builder = (yargs) => {
    yargs.example('tjm reset jobfile.prod');
};
exports.handler = (argv) => {
    const tjmObject = _.clone(argv);
    dataChecks(tjmObject).returnJobData(true);
    delete tjmObject.job_file_content.tjm;
    return fs.writeJson(tjmObject.job_file_path, tjmObject.job_file_content, { spaces: 4 })
        .then(() => reply.green(`TJM data was removed from ${tjmObject.job_file}`))
        .catch(err => reply.fatal(err.message));
};

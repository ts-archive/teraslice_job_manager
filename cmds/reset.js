'use strict';

// removes tjm data from json file
const fs = require('fs-extra');

exports.command = 'reset [job_file]';
exports.desc = 'Removes tjm data from job or asset file';
exports.builder = (yargs) => {
    yargs.example('tjm reset jobfile.prod');
};
exports.handler = (argv) => {
    const reply = require('./cmd_functions/reply')();
    require('./cmd_functions/json_data_functions')(argv).returnJobData(true);

    delete argv.job_file_content.tjm;
    return fs.writeJson(argv.job_file_path, argv.job_file_content, { spaces: 4 })
        .then(() => reply.green(`TJM data was removed from ${argv.job_file}`))
        .catch(err => reply.fatal(err.message));
};

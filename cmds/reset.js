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
    require('./cmd_functions/json_data_functions')(argv).returnJobData(true);

    delete argv.contents.tjm;
    return fs.writeJson(argv.file_path, argv.contents, { spaces: 4 })
        .then(() => reply.green(`TJM data was removed from ${argv.jobFile}`))
        .catch(err => reply.fatal(err.message));
};

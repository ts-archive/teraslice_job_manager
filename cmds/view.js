'use strict';

// removes tjm data from json file
const fs = require('fs-extra');

exports.command = 'view [jobFile]';
exports.desc = 'Retrieves the currently running job from the cluster and logs it on the console';
exports.builder = (yargs) => {
    yargs.example('tjm view jobfile.prod');
};
exports.handler = (argv, _testFunctions) => {
    let reply = require('./cmd_functions/reply')();
    const jsonData = require('./cmd_functions/json_data_functions')();
    const jobData = jsonData.jobFileHandler(argv.jobFile);
    const jobContents = jobData[1];
    const jobId = jobContents.tjm.job_id;
    let tjmFunctions = require('./cmd_functions/functions')(argv, jobContents.tjm.cluster);

    if (_testFunctions) {
        reply = _testFunctions.reply;
        tjmFunctions = _testFunctions.tjmFunctions;
    }

    return tjmFunctions.teraslice.jobs.wrap(jobId).spec()
        .then(jobSpec => {
            reply.warning(`Current Job File on Cluster ${jobContents.tjm.cluster}:`);
            reply.log(jobSpec);
        })
        .catch(err => reply.error(err));
};
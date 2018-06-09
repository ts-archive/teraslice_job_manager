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
    const jobContents = jsonData.jobFileHandler(argv.jobFile)[1];
    jsonData.metaDataCheck(jobContents);
    const jobId = jobContents.tjm.job_id;
    let tjmFunctions = _testFunctions ||
        require('./cmd_functions/functions')(argv, jobContents.tjm.cluster);

    return tjmFunctions.alreadyRegisteredCheck(jobContents)
        .then(() => tjmFunctions.teraslice.jobs.wrap(jobId).spec())
        .then(jobSpec => {
            reply.warning(`Current Job File on Cluster ${jobContents.tjm.cluster}:`);
            reply.success(JSON.stringify(jobSpec, null, 4));
            return jobSpec;
        })
        .catch(err => reply.fatal(err));
};
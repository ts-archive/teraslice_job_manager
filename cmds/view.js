'use strict';

exports.command = 'view [jobFile]';
exports.desc = 'Displays the job file as saved on the cluster specified in the tjm data';
exports.builder = (yargs) => {
    yargs.example('tjm view jobfile.prod');
};
exports.handler = (argv, _testFunctions) => {
    let reply = require('./cmd_functions/reply')();
    const jobData = require('./cmd_functions/json_data_functions')()
        .jobFileHandler(argv.jobFile);

    const jobContents = jobData.contents;
    const jobId = jobContents.tjm.job_id;
    let tjmFunctions = _testFunctions ||
        require('./cmd_functions/functions')(argv, jobContents.tjm.cluster);

    return tjmFunctions.alreadyRegisteredCheck(jobContents)
        .then(() => tjmFunctions.teraslice.jobs.wrap(jobId).spec())
        .then(jobSpec => {
            reply.yellow(`Current Job File on Cluster ${jobContents.tjm.cluster}:`);
            reply.green(JSON.stringify(jobSpec, null, 4));
            return jobSpec;
        })
        .catch(err => reply.fatal(err));
};
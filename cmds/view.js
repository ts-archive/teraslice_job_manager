'use strict';

exports.command = 'view [job_file]';
exports.desc = 'Displays the job file as saved on the cluster specified in the tjm data';
exports.builder = (yargs) => {
    yargs.example('tjm view jobfile.prod');
};
exports.handler = (argv, _testFunctions) => {
    let reply = require('./cmd_functions/reply')();
    require('./cmd_functions/json_data_functions')(argv).returnJobData();
    let tjmFunctions = _testFunctions || require('./cmd_functions/functions')(argv);

    const jobId = argv.job_file_content.tjm.job_id;
    return tjmFunctions.alreadyRegisteredCheck()
        .then(() => tjmFunctions.teraslice.jobs.wrap(jobId).spec())
        .then(jobSpec => {
            reply.yellow(`Current Job File on Cluster ${argv.cluster}:`);
            reply.green(JSON.stringify(jobSpec, null, 4));
            return jobSpec;
        })
        .catch(err => reply.fatal(err.stack));
};
'use strict';

exports.command = 'pause <jobFile>';
exports.desc = 'pauses job on the specified cluster\n';
exports.builder = (yargs) => {
    yargs.example('tjm pause jobfile.prod');
};
exports.handler = (argv, _testFunctions) => {
    const reply = require('./cmd_functions/reply')();
    require('./cmd_functions/json_data_functions')(argv).returnJobData()
    // teraslice client functions or test functions
    const tjmFunctions = _testFunctions || require('./cmd_functions/functions')(argv);

    const jobId = argv.contents.tjm.job_id;
    const cluster = argv.cluster;

    return tjmFunctions.alreadyRegisteredCheck()
        .then(() => tjmFunctions.teraslice.jobs.wrap(jobId).status())
        .then((jobStatus) => {
            if (jobStatus !== 'running') {
                reply.fatal(`Job ${jobId} is not running on ${cluster}.  Status is ${jobStatus}`);
            }
            return Promise.resolve();
        })
        .then(() => tjmFunctions.teraslice.jobs.wrap(jobId).pause())
        .then((result) => {
            if (result.status.status === 'paused') {
                reply.green(`Paused job ${jobId} on ${cluster}`);
            } else {
                reply.fatal('Could not pause job');
            }
            return result;
        })
        .catch(err => reply.fatal(err.message));
};

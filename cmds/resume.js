'use strict';

exports.command = 'resume <job_file>';
exports.desc = 'resumes a paused job\n';
exports.builder = (yargs) => {
    yargs.example('tjm resume jobfile.prod');
};
exports.handler = (argv, _testFunctions) => {
    const reply = require('./cmd_functions/reply')();
    // ensure that tjm data is in job file
    require('./cmd_functions/json_data_functions')(argv).returnJobData();
    const tjmFunctions = _testFunctions || require('./cmd_functions/functions')(argv);

    const jobId = argv.job_file_content.tjm.job_id;
    const cluster = argv.cluster;

    return tjmFunctions.alreadyRegisteredCheck()
        .then(() => tjmFunctions.teraslice.jobs.wrap(jobId).status())
        .then((status) => {
            if (status !== 'paused') {
                reply.fatal(`Job ${jobId} is not paused on ${cluster}, but is ${status}.  Use start to start job`);
            }
            return Promise.resolve();
        })
        .then(() => tjmFunctions.teraslice.jobs.wrap(jobId).resume())
        .then((resumeStatus) => {
            if (resumeStatus.status.status === 'running') {
                reply.green(`Resumed job ${jobId} on ${cluster}`);
            } else {
                reply.fatal('Could not resume job');
            }
            return resumeStatus;
        })
        .catch(err => reply.fatal(err.message));
};

'use strict';

const _ = require('lodash');

exports.command = 'restart <job_file>';
exports.desc = 'stops and starts a job\n';
exports.builder = (yargs) => {
    yargs.example('tjm restart jobfile.prod.json');
};
exports.handler = (argv, _testFunctions) => {
    const reply = require('./cmd_functions/reply')();
    require('./cmd_functions/json_data_functions')(argv).returnJobData();
    const tjmFunctions = _testFunctions || require('./cmd_functions/functions')(argv);
    const jobContents = argv.job_file_content;
    const jobId = jobContents.tjm.job_id;

    return tjmFunctions.alreadyRegisteredCheck()
        .then(() => tjmFunctions.teraslice.jobs.wrap(jobId).stop())
        .then((stopResponse) => {
            if (!stopResponse.status.status === 'stopped') {
                return Promise.reject(new Error('Job could not be stopped'));                
            }
            reply.green(`Stopped job ${jobId} on ${jobContents.tjm.cluster}`);
        })
        .then(() => tjmFunctions.teraslice.jobs.wrap(jobId).start())
        .then((startResponse) => {
            if (_.has(startResponse, 'job_id')) {
                reply.green(`Restarted job ${jobId}`);
            } else {
                reply.fatal('Could not restart job');
            }
            return startResponse;
        })
        .catch(err => reply.fatal(err.message));
};

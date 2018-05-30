'use strict';

const _ = require('lodash');

exports.command = 'start <jobFile>';
exports.desc = 'Starts job on the cluster in the job file\n';
exports.builder = (yargs) => {
    yargs.example('tjm start jobfile.prod.json');
};
exports.handler = (argv) => {
    const reply = require('./cmd_functions/reply')();
    const jsonData = require('./cmd_functions/json_data_functions')();
    const jobContents = jsonData.jobFileHandler(argv.jobFile)[1];
    jsonData.metaDataCheck(jobContents);
    const tjmFunctions = require('./cmd_functions/functions')(argv, jobContents.tjm.cluster);
    const jobId = jobContents.tjm.job_id;

    tjmFunctions.alreadyRegisteredCheck(jobContents)
        .then(() => tjmFunctions.teraslice.jobs.wrap(jobId).status())
        .then((status) => {
            if (status === 'running' || status === 'paused') {
                return Promise.reject(new Error(`Job is already running on ${jobContents.tjm.cluster}, check job status`));
            }
            return Promise.resolve();
        })
        .then(() => tjmFunctions.teraslice.jobs.wrap(jobId).start())
        .then((result) => {
            if (_.has(result, 'job_id')) {
                reply.success(`Started job ${jobId}`);
            } else {
                reply.fatal('Could not start job');
            }
        })
        .catch(err => reply.fatal(err.message));
};

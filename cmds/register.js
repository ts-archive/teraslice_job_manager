'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

exports.command = 'register [job_file]';
exports.desc = 'Registers job with a cluster.  Specify the cluster with -c.\nAdds metadata to job file on completion\n';
exports.builder = (yargs) => {
    yargs
        .option('c', {
            describe: 'cluster where the job will be registered',
            default: 'http://localhost:5678'
        })
        .option('r', {
            describe: 'option to run the job immediately after being registered',
            default: false,
            type: 'boolean'
        })
        .option('a', {
            describe: 'builds the assets and deploys to cluster, optional',
            default: false,
            type: 'boolean'
        })
        .example('tjm register jobfile.prod -c clusterDomain -a');
};
exports.handler = (argv, _testTjmFunctions) => {
    const reply = require('./cmd_functions/reply')();
    require('./cmd_functions/json_data_functions')(argv).returnJobData(true);
    const tjmFunctions = _testTjmFunctions || require('./cmd_functions/functions')(argv);
    const jobContents = argv.job_file_content;
    const jobFilePath = argv.job_file_path;

    return tjmFunctions.loadAsset()
        .then(() => {
            if (!_.has(jobContents, 'tjm.cluster')) {
                return tjmFunctions.teraslice.jobs.submit(jobContents, !argv.r);
            }
            return Promise.reject(new Error(`Job is already registered on ${argv.cluster}`))
        })
        .then((result) => {
            const jobId = result.id();
            reply.green(`Successfully registered job: ${jobId} on ${argv.cluster}`);
            _.set(jobContents, 'tjm.cluster', argv.cluster);
            _.set(jobContents, 'tjm.version', '0.0.1');
            _.set(jobContents, 'tjm.job_id', jobId);
            tjmFunctions.createJsonFile(jobFilePath, jobContents);
            reply.green('Updated job file with tjm data');
        })
        .then(() => {
            if (argv.r) {
                reply.green(`New job started on ${argv.cluster}`);
            }
        })
        .catch(err => reply.fatal(err));
};

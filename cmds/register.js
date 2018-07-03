'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const reply = require('./cmd_functions/reply')();
const dataChecks = require('./cmd_functions/data_checks');

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
    const tjmObject = _.clone(argv);
    dataChecks(tjmObject).returnJobData(true);
    const tjmFunctions = _testTjmFunctions || require('./cmd_functions/functions')(tjmObject);
    const jobContents = tjmObject.job_file_content;
    const jobFilePath = tjmObject.job_file_path;

    return tjmFunctions.loadAsset()
        .then(() => {
            if (!_.has(jobContents, 'tjm.cluster')) {
                return tjmFunctions.teraslice.jobs.submit(jobContents, !tjmObject.r);
            }
            return Promise.reject(new Error(`Job is already registered on ${tjmObject.cluster}`))
        })
        .then((result) => {
            const jobId = result.id();
            reply.green(`Successfully registered job: ${jobId} on ${tjmObject.cluster}`);
            _.set(jobContents, 'tjm.cluster', tjmObject.cluster);
            _.set(jobContents, 'tjm.version', '0.0.1');
            _.set(jobContents, 'tjm.job_id', jobId);
            tjmFunctions.createJsonFile(jobFilePath, jobContents);
            reply.green('Updated job file with tjm data');
        })
        .then(() => {
            if (tjmObject.r) {
                reply.green(`New job started on ${tjmObject.cluster}`);
            }
        })
        .catch(err => reply.fatal(err));
};

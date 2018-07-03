'use strict';

const _ = require('lodash');
const reply = require('./cmd_functions/reply')();
const dataChecks = require('./cmd_functions/data_checks');

exports.command = 'start <job_file>';
exports.desc = 'Starts job on the cluster in the job file\n';
exports.builder = (yargs) => {
    yargs.example('tjm start jobfile.prod.json');
};
exports.handler = (argv, _testFunctions) => {
    const tjmObject = _.clone(argv);
    dataChecks(tjmObject).returnJobData();    
    const tjmFunctions = _testFunctions || require('./cmd_functions/functions')(tjmObject);

    const jobId = tjmObject.job_file_content.tjm.job_id;
    return tjmFunctions.alreadyRegisteredCheck()
        .then(() => tjmFunctions.terasliceClient.jobs.wrap(jobId).start())
        .then((startResponse) => {
            if (_.has(startResponse, 'job_id')) {
                reply.green(`Started job ${jobId}`);
            } else {
                reply.fatal('Could not start job');
            }
            return startResponse;
        })
        .catch(err => reply.fatal(err.message));
};

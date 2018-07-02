'use strict';

const _ = require('lodash');

exports.command = 'start <job_file>';
exports.desc = 'Starts job on the cluster in the job file\n';
exports.builder = (yargs) => {
    yargs.example('tjm start jobfile.prod.json');
};
exports.handler = (argv, _testFunctions) => {
    const reply = require('./cmd_functions/reply')();
    require('./cmd_functions/json_data_functions')(argv).returnJobData();
    const tjmFunctions = _testFunctions || require('./cmd_functions/functions')(argv);

    const jobId = argv.job_file_content.tjm.job_id;
    return tjmFunctions.alreadyRegisteredCheck()
        .then(() => tjmFunctions.teraslice.jobs.wrap(jobId).start())
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

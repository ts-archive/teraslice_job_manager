'use strict';

exports.command = 'stop <job_file>';
exports.desc = 'stops job on the cluster in the job file\n';
exports.builder = (yargs) => {
    yargs.example('tjm stop jobfile.prod.json');
};
exports.handler = (argv, _testFunctions) => {
    const reply = require('./cmd_functions/reply')();
    require('./cmd_functions/json_data_functions')(argv).returnJobData();
    const tjmFunctions = _testFunctions || require('./cmd_functions/functions')(argv);

    const jobId = argv.job_file_content.tjm.job_id;
    return tjmFunctions.alreadyRegisteredCheck()
        .then(() => tjmFunctions.teraslice.jobs.wrap(jobId).stop())
        .then((stopResponse) => {
            if (!stopResponse.status.status === 'stopped') {
                return Promise.reject(new Error('Job could not be stopped'));                
            }
            reply.green(`Stopped job ${jobId} on ${argv.cluster}`);
                return stopResponse;
        })
        .catch(err => reply.fatal(err));
};

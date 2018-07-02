'use strict';

exports.command = 'errors <job_file>';
exports.desc = 'Shows the errors for a job\n';
exports.builder = (yargs) => {
    yargs.example('tjm errors jobfile.prod');
};
exports.handler = (argv, _testFunctions) => {
    const reply = require('./cmd_functions/reply')();
    require('./cmd_functions/json_data_functions')(argv).returnJobData();
    const tjmFunctions = _testFunctions || require('./cmd_functions/functions')(argv);

    const jobId = argv.job_file_content.tjm.job_id;

    return tjmFunctions.alreadyRegisteredCheck()
        .then(() => tjmFunctions.teraslice.jobs.wrap(jobId).errors())
        .then((errors) => {
            if (errors.length === 0) {
                reply.green('This job has no errors');
            } else {
                errors.forEach((error) => {
                    reply.yellow(JSON.stringify(error, null, 4));
                });
            }
            return errors
        })
        .catch(err => reply.fatal(err.message));
};

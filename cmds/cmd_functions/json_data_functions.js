'use strict';

const _ = require('lodash');
const path = require('path');
const reply = require('./reply')();

module.exports = (argv) => {
    function returnJobData(noTjmCheck) {
        // some commands should not have tjm data, otherwise file is checked for tjm data
        argv.tjm_check = !noTjmCheck;
        // add job data to the argv object for easy reference
        jobFileHandler();
        // explicitly state the cluster that the code will reference for the job
        if (_.has(argv.job_file_content, 'tjm.cluster')) {
            argv.cluster = argv.job_file_content.tjm.cluster;
            return;
        }
        
        argv.cluster = argv.l ? 'http://localhost:5678' : argv.c;

        if(!argv.cluster) {
            reply.fatal('Use -c to specify a cluster or use -l for localhost')
        }
    }

    function jobFileHandler() {
        let fName = argv.job_file;

        if (!fName) {
            reply.fatal('Missing the job file!');
        }

        if (fName.lastIndexOf('.json') !== fName.length - 5) {
            fName += '.json';
        }

        const jobFilePath = path.join(process.cwd(), fName);
        let jobContents;

        try {
            jobContents = require(jobFilePath);
        } catch (err) {
            reply.fatal(`Sorry, can't find the JSON file: ${fName}`);
        }

        if (_.isEmpty(jobContents)) {
            reply.fatal('JSON file contents cannot be empty');
        }

        if (argv.tjm_check === true) _tjmDataCheck(jobContents);

        argv.job_file_path = jobFilePath;
        argv.job_file_content = jobContents;
    }

    function _tjmDataCheck(jsonData) {
        if (!(_.has(jsonData, 'tjm.clusters') || _.has(jsonData, 'tjm.cluster'))) {
            reply.fatal('No teraslice job manager metadata, register the job or deploy the assets');
        }
        return true;
    }

    return {
        returnJobData,
        jobFileHandler,
        _tjmDataCheck
    };
};

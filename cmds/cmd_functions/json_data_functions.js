'use strict';

const _ = require('lodash');
const path = require('path');
const reply = require('./reply')();

module.exports = (argv) => {
    function returnJobData(noTjmCheck) {
        // some commands should note have tjm data and should not check for it
        argv.tjmCheck = noTjmCheck ? false : true;
        jobFileHandler();
        // return the cluster to work with
        if (_.has(argv.contents, 'tjm.cluster')) {
            argv.cluster = argv.contents.tjm.cluster;
            return;
        }
        
        argv.cluster = argv.l ? 'http://localhost:5678' : argv.c;

        if(!argv.cluster) {
            reply.fatal('Use -c to specify a cluster or use -l for localhost')
        }
    }

    function jobFileHandler() {
        let fName = argv.jobFile;

        if (!fName) {
            reply.fatal('Missing the file!');
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

        if (argv.tjmCheck === true) _tjmDataCheck(jobContents);

        argv.file_path = jobFilePath;
        argv.contents = jobContents;
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

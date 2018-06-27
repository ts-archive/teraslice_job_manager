'use strict';

const _ = require('lodash');
const path = require('path');
const reply = require('./reply')();

module.exports = () => {
    function returnJobData(argv) {
        jobData = jobFileHandler(argv.fileName, argv.tjmCheck);
        // return the cluster to work with
        let clusterName;
        if (_.has(jobData.tjm, 'cluster')) {
            clusterName = jobData.tjm.cluser;
        }
        clusterName = argv.c || argv.l;

        
        // return the job Contents
        // return the job path

    }

    function jobFileHandler(fileName, tjmCheck) {
        let fName = fileName;

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

        if (tjmCheck === true) {
            _tjmDataCheck(jobContents);
        }

        return {
            file_path: jobFilePath,
            contents: jobContents
        };
    }

    function _tjmDataCheck(jsonData) {
        if (!(_.has(jsonData, 'tjm.clusters') || _.has(jsonData, 'tjm.cluster'))) {
            reply.fatal('No teraslice job manager metadata, register the job or deploy the assets');
        }
        return true;
    }

    function getClusters(jsonData) {
        if (_.has(jsonData, 'tjm.clusters')) {
            return _.get(jsonData, 'tjm.clusters');
        }
        if (_.has(jsonData, 'tjm.clusters')) {
            return _.castArray(_.get(jsonData, 'tjm.cluster'));
        }
        return [];
    }

    return {
        jobFileHandler,
        _tjmDataCheck,
        getClusters
    };
};

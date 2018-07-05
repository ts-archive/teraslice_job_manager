'use strict';

const _ = require('lodash');
const path = require('path');
const reply = require('./reply')();

module.exports = (tjmObject) => {
    function returnJobData(noTjmCheck) {
        // some commands should not have tjm data, otherwise file is checked for tjm data
        tjmObject.tjm_check = !noTjmCheck;
        // add job data to the tjmObject object for easy reference
        jobFileHandler();
        // explicitly state the cluster that the code will reference for the job
        if (_.has(tjmObject.job_file_content, 'tjm.cluster')) {
            tjmObject.cluster = tjmObject.job_file_content.tjm.cluster;
            return;
        }
        
        tjmObject.cluster = tjmObject.l ? 'http://localhost:5678' : _urlCheck(tjmObject.c);

        if(!tjmObject.cluster) {
            reply.fatal('Use -c to specify a cluster or use -l for localhost')
        }
    }

    function jobFileHandler() {
        let fName = tjmObject.job_file;

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

        if (tjmObject.tjm_check === true) _tjmDataCheck(jobContents);

        tjmObject.job_file_path = jobFilePath;
        tjmObject.job_file_content = jobContents;
    }

    function _tjmDataCheck(jsonData) {
        if (!(_.has(jsonData, 'tjm.clusters') || _.has(jsonData, 'tjm.cluster'))) {
            reply.fatal('No teraslice job manager metadata, register the job or deploy the assets');
        }
        return true;
    }

    function _urlCheck(url) {
        // check that url starts with http:// but allow for https://
        return url.indexOf('http') === -1 ? `http://${url}`: url;
    }

    function getAssetClusters() {
        if (tjmObject.c) {
            const cluster = _urlCheck(tjmObject.c);
            tjmObject.cluster = cluster;
        }
        if (tjmObject.l) {
            tjmObject.cluster = 'http://localhost:5678';
        }
        if (!_.has(tjmObject, 'cluster') && _.has(tjmObject.asset_file_content, 'tjm.clusters')) {
                tjmObject.clusters = tjmObject.asset_file_content.tjm.clusters
        }
        if (_.isEmpty(tjmObject.clusters) && !_.has(tjmObject, 'cluster')) {
            reply.fatal('Cluster data is missing from asset.json or not specified using -c.');
        }
    }
    return {
        returnJobData,
        jobFileHandler,
        getAssetClusters,
        _urlCheck,
        _tjmDataCheck
    };
};

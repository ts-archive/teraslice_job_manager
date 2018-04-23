'use strict';

const _ = require('lodash');
const fs = require('fs-extra');
const archiver = require('archiver');
const Promise = require('bluebird');
const reply = require('./reply')();
const path = require('path');
const writeFile = Promise.promisify(require('fs').writeFile);

module.exports = (argv, clusterName) => {
    const cluster = clusterName || argv.c;

    let teraslice = require('teraslice-client-js')({
        host: `${httpClusterNameCheck(cluster)}:5678`
    });

    function alreadyRegisteredCheck(jobContents) {
        if (_.has(jobContents, 'tjm.cluster')) {
            return teraslice.jobs.wrap(jobContents.tjm.job_id).spec()
                .then((jobSpec) => {    
                    if (jobSpec.job_id === jobContents.tjm.job_id) {
                        return Promise.resolve(true);
                    }
                    return Promise.resolve(false);
                });
        }
        return Promise.resolve(false);
    }

    function _addAsset() {
        const zipFileName = fs.readFileSync(path.join(process.cwd(), 'builds', 'processors.zip'));
        return teraslice.assets.post(zipFileName)
            .then((assetPostResponse) => {
                return assetPostResponse;
            });
    }

    function loadAsset() {
        // removes builds
        // adds metadata
        // zips 
        // adds to cluster
        if (argv.a === true) {
                return fs.emptyDir(path.join(process.cwd(), 'builds'))
                    .then(() => updateAssetMetadata())
                    .then(() => zipAsset())
                    .then(() => addAsset())
                    .catch((err) => {
                        reply.error(err);
                    });
        }
        return Promise.resolve(true);
    }

    function createJsonFile(filePath, jsonObject) {
        return writeFile(filePath, JSON.stringify(jsonObject, null, 4));
    }

    function httpClusterNameCheck(clusterCheck) {
        if (clusterCheck.indexOf('http') !== 0) {
            return `http://${clusterCheck}`;
        }
        return clusterCheck;
    }

    function _zipAsset() {
        const zipMessage = {};

        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(path.join(process.cwd(), 'builds', 'processors.zip'));
            const archive = archiver('zip', {
                zlib: { level: 9 } // Sets the compression level.
            });

            output.on('finish', () => {
                zipMessage.bytes = `${archive.pointer()} total bytes`;
                zipMessage.success = 'Assets have been zipped to builds/processors.zip';
                resolve(zipMessage);
            });

            archive.on('error', (err) => {
                reject(err);
            });

            archive.pipe(output);
            archive
                .directory(path.join(process.cwd(), 'asset'), 'asset')
                .finalize();
        });
    }

    function _updateAssetMetadata() {
        // writes asset metadata to asset.json
        let assetJson;
        
        try {
            assetJson = require(path.join(process.cwd(),'asset', 'asset.json'));
        } catch(err) {
            reply.error(`Could not load asset.json: ${err.message}`);
        }

        if (_.has(assetJson, 'tjm.clusters')) {
            if (_.indexOf(assetJson.tjm.clusters, argv.c) >= 0) {
                reply.error(`Assets have already been deployed to ${argv.c}, use update`);

            }
                assetJson.tjm.clusters.push(httpClusterNameCheck(argv.c));
                return assetJson;
        } else {
            (_.set(assetJson, 'tjm.clusters', [ httpClusterNameCheck(argv.c) ]));
            return assetJson
        }
    }

    function __testContext(_teraslice) {
        teraslice = _teraslice
    }

    function __testFunctions() {
        return { 
            _updateAssetMetadata,
            _zipAsset,
            _addAsset
        }
    }

    return {
        alreadyRegisteredCheck,
        httpClusterNameCheck,
        loadAsset,
        createJsonFile,
        teraslice,
        __testContext,
        __testFunctions,
        _updateAssetMetadata
    };
};

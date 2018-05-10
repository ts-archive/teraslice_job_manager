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

    function _postAsset() {
        return Promise.resolve()
            .then(() => fs.readFile(path.join(process.cwd(), 'builds', 'processors.zip')))
            .then((zipFile) => {
                return teraslice.assets.post(zipFile)
            })
            .then((assetPostResponse) => {
                return assetPostResponse;
            });
    }

    function loadAsset() {
        if (argv.a === true) {
                return Promise.resolve()
                    .then(() => fs.emptyDir(path.join(process.cwd(), 'builds')))
                    .then(() => zipAsset())
                    .then((zipData) => {
                        reply.success(zipData.bytes);
                        reply.success(zipData.success);
                    })
                    .then(() => _postAsset())
                    .then((postResponse) => {
                        const postResponseJson = JSON.parse(postResponse);
                        if (postResponseJson.error) {
                            reply.error(postResponseJson.error);
                        }
                        reply.success(`Asset posted to ${argv.c} with id ${postResponseJson._id}`);
                    })
                    .then(() => {
                        const assetJson = _updateAssetMetadata();
                        return createJsonFile(path.join(process.cwd(), 'asset/asset.json'), assetJson)
                    })
                    .then(() => reply.success('TJM data added to asset.json'))
                    .catch(err => console.log(err));
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

    function zipAsset() {
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
            throw Error(`Could not load asset.json: ${err.message}`);
        }

        if (_.has(assetJson, 'tjm.clusters')) {
            if (_.indexOf(assetJson.tjm.clusters, httpClusterNameCheck(argv.c)) >= 0) {
                throw Error(`Assets have already been deployed to ${argv.c}, use update`);
            }
                assetJson.tjm.clusters.push(httpClusterNameCheck(argv.c));
                return assetJson;
        } else {
            (_.set(assetJson, 'tjm.clusters', [httpClusterNameCheck(argv.c)]));
            return assetJson
        }
    }

    function __testContext(_teraslice) {
        teraslice = _teraslice
    }

    function __testFunctions() {
        return { 
            _updateAssetMetadata,
            _postAsset
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
        zipAsset,
    };
};

'use strict';

const _ = require('lodash');
const fs = require('fs-extra');
const archiver = require('archiver');
const Promise = require('bluebird');
const reply = require('./reply')();
const path = require('path');

module.exports = (tjmObject) => {
    let terasliceClient = require('teraslice-client-js')({
        host: `${tjmObject.cluster}`
    });

    function alreadyRegisteredCheck() {
        const jobContents = tjmObject.job_file_content;
        if (_.has(jobContents, 'tjm.cluster')) {
            return terasliceClient.jobs.wrap(jobContents.tjm.job_id).spec()
                .then((jobSpec) => {
                    if (jobSpec.job_id === jobContents.tjm.job_id) {
                        // return true for testing purposes
                        return Promise.resolve(true);
                    }
                    return Promise.reject(new Error('Job is not on the cluster'));
                });
        }
        return Promise.reject(new Error('No cluster configuration for this job'));
    }

    function _postAsset() {
        return Promise.resolve()
            .then(() => fs.readFile(path.join(process.cwd(), 'builds', 'processors.zip')))
            .then(zipFile => terasliceClient.assets.post(zipFile))
            .then(assetPostResponse => assetPostResponse);
    }

    function loadAsset() {
        if (!tjmObject.a) {
            return Promise.resolve();
        }
        return fs.emptyDir(path.join(process.cwd(), 'builds'))
            .then(() => zipAsset())
            .then((zipData) => {
                reply.green(zipData.bytes);
                reply.green(zipData.success);
            })
            .then(() => _postAsset())
            .then((postResponse) => {
                const postResponseJson = JSON.parse(postResponse);
                if (postResponseJson.error) {
                    return Promise.reject(new Error(postResponseJson.error));
                }
                reply.green(`Asset posted to ${tjmObject.c} with id ${postResponseJson._id}`);
                return Promise.resolve();
            })
            .then(() => {
                const assetJson = _updateAssetMetadata();
                return createJsonFile(path.join(process.cwd(), 'asset/asset.json'), assetJson);
            })
            .then(() => reply.green('TJM data added to asset.json'))
            .then(() => reply.green(`Asset has successfully been deployed to ${tjmObject.c}`));
    }

    function createJsonFile(filePath, jsonObject) {
        return fs.writeJson(filePath, jsonObject, { spaces: 4 });
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
            assetJson = fs.readJsonSync(path.join(process.cwd(), 'asset', 'asset.json'));
        } catch (err) {
            throw new Error(`Could not load asset.json: ${err.message}`);
        }

        const cluster = tjmObject.l ? 'http://localhost:5678' : tjmObject.c;
        if (_.has(assetJson, 'tjm.clusters')) {
            if (_.indexOf(assetJson.tjm.clusters, cluster) >= 0) {
                throw new Error(`Assets have already been deployed to ${cluster}, use update`);
            }
            assetJson.tjm.clusters.push(cluster);
            return assetJson;
        }
        _.set(assetJson, 'tjm.clusters', [cluster]);
        return assetJson;
    }

    function __testContext(_terasliceClient) {
        terasliceClient = _terasliceClient;
    }

    function __testFunctions() {
        return {
            _updateAssetMetadata,
            _postAsset
        };
    }

    return {
        alreadyRegisteredCheck,
        loadAsset,
        createJsonFile,
        terasliceClient,
        __testContext,
        __testFunctions,
        zipAsset,
    };
};

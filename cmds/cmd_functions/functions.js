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

    function addAssets() {
        const zname = fs.readFileSync(path.join(process.cwd(), 'builds', 'processors.zip'));
        return teraslice.assets.post(zname)
            .then((asset) => {
                const msg = JSON.parse(asset);
                if (msg.error) {
                    reply.error(msg.error);
                } else {
                    reply.success(`Asset ${msg._id} successfully loaded`);
                }
            });
    }

    function loadAssets() {
        if (argv.a === true) {
                return fs.emptyDir(path.join(process.cwd(), 'builds'))
                .then(() => zipAssets())
                .then(() => addAssets())
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

    function zipAssets() {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(path.join(process.cwd(), 'builds', 'processors.zip'));
            const archive = archiver('zip', {
                zlib: { level: 9 } // Sets the compression level.
            });

            output.on('finish', () => {
                reply.success(`${archive.pointer()} total bytes`);
                reply.success('Assets have been zipped to builds/processors.zip');
                resolve();
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

    function updateAssetsMetadata() {
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
        teraslice = _teraslice;
    }

    return {
        addAssets,
        alreadyRegisteredCheck,
        httpClusterNameCheck,
        loadAssets,
        createJsonFile,
        teraslice,
        zipAssets,
        __testContext,
        updateAssetsMetadata
    };
};

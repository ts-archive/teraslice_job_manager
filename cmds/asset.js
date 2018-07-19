'use strict';

const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const prompts = require('prompts');
const Promise = require('bluebird');
const reply = require('./cmd_functions/reply')();
const dataChecks = require('./cmd_functions/data_checks');


exports.command = 'asset';
exports.desc = 'Zip and post assets to a cluster';
exports.builder = (yargs) => {
    yargs
        .option('c', {
            describe: 'cluster where assets will be deployed, updated or checked',
            default: ''
        })
        .option('a', {
            describe: 'zip and deploy assets, on by default',
            type: 'boolean',
            default: true,
            hidden: true
        })
        .option('l', {
            describe: 'for testing, specifies localhost',
            default: false,
            type: 'boolean'
        })
        .option('deploy', {
            alias: 'd',
            describe: 'deploy assets to a cluster, used with c, conflicts with update and status',
            default: false,
            type: 'boolean'
        })
        .option('status', {
            alias: 's',
            describe: 'displays the latest version of the asset on a cluster, can be used with cluster',
            default: false,
            type: 'boolean'
        })
        .option('update', {
            alias: 'u',
            describe: 'posts latest asset version on the cluster, can be used with -c or update all clusters in asset.json',
            default: false,
            type: 'boolean'
        })
        .option('replace', {
            alias: 'r',
            describe: 'deletes asset on cluster and then zips and posts a new one, dev use only',
            default: false,
            type: 'boolean',
            hidden: true
        })
        .example('tjm asset deploy -c clustername');
};
exports.handler = (argv, _testTjmFunctions) => {
    const tjmConfig = _.clone(argv);

    // rename the asset file for testing to avoid naming collisions
    let assetPath = 'asset/asset.json';
    if (_testTjmFunctions) assetPath = 'asset/assetTest.json';

    try {
        tjmConfig.asset_file_content = require(path.join(process.cwd(), assetPath));
    } catch (error) {
        reply.fatal(error);
    }

    dataChecks(tjmConfig).getAssetClusters();
    const tjmFunctions = _testTjmFunctions || require('./cmd_functions/functions')(tjmConfig);

    function latestAssetVersion(cluster) {
        const assetName = tjmConfig.asset_file_content.name;
        const terasliceClient = require('teraslice-client-js')({
            host: `${cluster}`
        });

        terasliceClient.cluster.txt(`assets/${assetName}`)
            .then((clientResponse) => {
                const byLine = clientResponse.split('\n');
                const trimTop = byLine.slice(2);
                trimTop.pop();
                const latest = trimTop.map(item => item.split(' ')
                    .filter(i => i !== ''))
                    .reduce((high, item) => (parseInt(item[1].split('.').join(''), 10) > high ? item : high), 0);
                reply.green(`Cluster: ${cluster}, Name: ${latest[0]}, Version: ${latest[1]}`);
            })
            .catch((err) => {
                if (err.message === 'Cannot read property \'split\' of undefined') {
                    reply.fatal(`Asset, ${assetName}, is not on the cluster or asset name is malformated`);
                    return;
                } else if (err.name === 'RequestError') {
                    reply.fatal(`Cannot connect to cluster: ${cluster}`);
                    return;
                }
                reply.fatal(err);
            });
    }
    if (argv.deploy) {
        return Promise.resolve()
            .then(() => {
                if (_.has(tjmConfig.asset_file_content.tjm, 'clusters') &&
                    _.indexOf(tjmConfig.asset_file_content.tjm.clusters, tjmConfig.c) >= 0) {
                    return Promise.reject(new Error(`Assets have already been deployed to ${tjmConfig.c}, use update`));
                }
                return Promise.resolve();
            })
            .then(() => tjmFunctions.loadAsset())
            .catch((err) => {
                if (err.name === 'RequestError') {
                    reply.fatal(`Could not connect to ${tjmConfig.cluster}`);
                }
                reply.fatal(err);
            });
    } else if (argv.update) {
        return fs.emptyDir(path.join(process.cwd(), 'builds'))
            .then(() => tjmFunctions.zipAsset())
            .then((zipData) => {
                reply.green(zipData.bytes);
                reply.green(zipData.success);
            })
            .then(() => fs.readFile(`${process.cwd()}/builds/processors.zip`))
            .then((zippedFileData) => {
                function postAssets(cluster) {
                    const terasliceClient = require('teraslice-client-js')({
                        host: `${cluster}`
                    });
                    return terasliceClient.assets.post(zippedFileData)
                        .then((postResponse) => {
                            const postResponseJson = JSON.parse(postResponse);
                            if (postResponseJson.error) {
                                reply.yellow(`for ${cluster}, ${postResponseJson.error}`);
                            } else {
                                reply.green(`Asset posted to ${tjmConfig.c} with id ${postResponseJson._id}`);
                            }
                        });
                }
                if (_.has(tjmConfig, 'clusters')) {
                    return tjmConfig.clusters.forEach(cluster => postAssets(cluster));
                }
                return postAssets(tjmConfig.cluster);
            })
            .catch(err => reply.fatal((err.message)));
    } else if (argv.status) {
        if (_.has(tjmConfig, 'clusters')) {
            return Promise.each(tjmConfig.clusters, cluster => latestAssetVersion(cluster));
        }
        return latestAssetVersion(tjmConfig.cluster);
    } else if (argv.replace) {
        // for dev purposed only, in prod need to upload most recent version
        reply.yellow('*** Warning ***\nThis function is intended for asset development only.  Using it for production asset management is a bad idea.');

        const assetName = tjmConfig.asset_file_content.name;
        // set prompts answer for testing
        if (_testTjmFunctions) prompts.inject({ continue: _testTjmFunctions.continue });

        return Promise.resolve()
            .then(() => prompts({ type: 'confirm', name: 'continue', message: 'Replace Assets?' }))
            .then(result => (result.continue ? true : Promise.reject('Exiting tjm')))
            .then(() => tjmFunctions.terasliceClient.cluster.get(`/assets/${assetName}`))
            .then(assets => tjmFunctions.terasliceClient.assets.delete(assets[0].id))
            .then((response) => {
                const parsedResponse = JSON.parse(response);
                reply.green(`removed ${parsedResponse.assetId} from ${tjmConfig.cluster}`);
            })
            .then(() => tjmFunctions.loadAsset())
            .catch(err => reply.fatal(err));
    }
    return reply.fatal('Not a asset function, check help and try again');
};

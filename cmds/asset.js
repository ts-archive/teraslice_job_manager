'use strict';

const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const Promise = require('bluebird');
const readFile = Promise.promisify(require('fs').readFile);

exports.command = 'asset <cmd>';
exports.desc = 'Deploys, updates or checks the status of an asset.  Options are deploy, update, status.  Assumes assets are in ./asset.  Adds metadata to asset.json once deployed.\n';
exports.builder = (yargs) => {
    yargs
        .option('c', { describe: 'cluster where assets will be deployed, updated or checked',
            default: 'localhost' })
        .option('a', { describe: 'create and deply assets, on by default',
            default: true,
            type: 'boolean' })
        .choices('cmd', ['deploy', 'update', 'status'])
        .example('tjm asset deploy -c clustername, tjm asset update or tjm asset status');
};
exports.handler = (argv) => {
    const reply = require('./cmd_functions/reply')();
    const jsonData = require('./cmd_functions/json_data_functions')();
    const fileData = jsonData.jobFileHandler('asset.json', true);
    const assetJson = fileData[1];
    const assetJsonPath = fileData[0];

    let tjmFunctions = require('./cmd_functions/functions')(argv);
    const clusters = _.has(assetJson, 'tjm.clusters') ? assetJson.tjm.clusters : [];

    if (argv.cmd === 'deploy') {
        return Promise.resolve()
            .then(() => tjmFunctions.loadAsset())
            .catch(err => {
                if(err.name === 'RequestError') {
                    reply.error(`Could not connect to cluster ${argv.c}`);
                }
                reply.error(err.message)
            });

    } else if (argv.cmd === 'update') {
        if (clusters.length === 0) {
            reply.error('Clusters data is missing from asset.json.  Use \'tjm asset deploy\' first');
        }
        Promise.resolve()
            .then(() => fs.emptyDir(path.join(process.cwd(), 'builds')))
            .then(() => tjmFunctions.zipAsset())
            .then(zipData => {
                reply.success(zipData.bytes);
                reply.success(zipData.success);
            })
            .then(() => readFile(`${process.cwd()}/builds/processors.zip`))
            .then((zippedFileData) => {
                function postAssets(cName) {
                    const teraslice = require('teraslice-client-js')({
                        host: `${tjmFunctions.httpClusterNameCheck(cName)}:5678`
                    });
                    return teraslice.assets.post(zippedFileData);
                }
                return clusters.forEach((cluster) => {
                    postAssets(cluster)
                        .then((postResponse) => {
                            const pResponse = JSON.parse(postResponse);
                            if (pResponse._id) {
                                reply.success(`Asset posted to ${argv.c} with id ${pResponse._id}`);
                            }
                        })
                        .catch(err => reply.error(err.message));
                });
            })
            .catch(err => reply.error((err.message)));
    } else if (argv.cmd === 'status') {
        function latestAssetVersion(cluster, assetName) {
            const teraslice = require('teraslice-client-js')({
                host: `${tjmFunctions.httpClusterNameCheck(cluster)}:5678`
            });
            teraslice.cluster.txt(`assets/${assetName}`)
                .then((clientResponse) => {
                    const byLine = clientResponse.split('\n');                
                    const trimTop = byLine.slice(2);
                    trimTop.pop();
                    const latest = trimTop.map(item => item.split(' ')
                        .filter(i => i !== ''))
                        .reduce((high, item) => {
                            return parseInt(item[1].split('.').join(''), 10) > high ? item : high;
                        }, 0);
                    reply.success(`Cluster: ${cluster}, Name: ${latest[0]}, Version: ${latest[1]}`);
                })
                .catch((err) => {
                    if (err.message === 'Cannot read property \'split\' of undefined') {
                        reply.error(`Asset, ${assetName}, is not on the cluster or asset name is malformated`);
                    } else if (err.name === 'RequestError') {
                        reply.error(`Cannot connect to cluster: ${cluster}`);
                    }
                    reply.error(err.message);
                });
        }

        if (clusters.length === 0) {
            reply.error('Clusters data is missing from asset.json. Use \'tjm asset deploy\' first');
        }
        const assetName = assetJson.name;
        clusters.forEach(cluster => latestAssetVersion(cluster, assetName));
    }

    function __testContents(_tjmFunctions) {
        tjmFunctions = _tjmFunctions;
    }
};

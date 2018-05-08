'use strict';

const jasmine = require('jasmine');
const fs = require('fs-extra');
const argv = {};
let tjmFunctions = require('../cmds/cmd_functions/functions')(argv, 'localhost');
const Promise = require('bluebird');
const path = require('path');
const _ = require('lodash');
const chalk = require('chalk');

let jobContents;
let someJobId;
let assetObject;

const _teraslice = {
    jobs: {
        wrap: (jobContents) => {
                return { spec: () => {
                    return Promise.resolve({
                        job_id: someJobId
                    })
                }
            }
        }
    },
    assets: {
        post: () => {
            return Promise.resolve(
                assetObject
            )
        }
    }
};

const assetJson = {
    name: 'testing_123',
    version: '0.0.01',
    description: 'dummy asset.json for testing'
}

const packageJson = {
    name: 'common_processors',
    version: '0.0.29',
    description: 'Processing modules that are common across data types',
    main: "index.js"
}

function createNewAsset() {
    const assetPath = path.join(process.cwd(), 'asset/asset.json');
    const packagePath = path.join(process.cwd(), 'asset/package.json');
    return Promise.resolve()
        .then(() => delete assetJson.tjm )
        .then(() => fs.emptyDir(path.join(process.cwd(), 'asset')))
        .then(() => {
            return Promise.all([
                fs.writeJson(assetPath, assetJson, {spaces: 4}),
                fs.writeJson(packagePath, packageJson, {spaces: 4})
            ])
        });
}

describe('tjmFunctions testing', function() {
    /*
    afterAll(() => {
        return Promise.all([
            fs.remove(path.join(process.cwd(), 'builds')),
            fs.remove(path.join(process.cwd(), 'asset'))
        ]);
    });
    */

    /*
   function testAsync(done) {
    setTimeout(function () {
        createNewAsset();
        done();
    }, 1000);
}

    beforeEach(function(done) {
        // testAsync(done);
    })
    */

    it('check that cluster name starts with http', () => {
        expect(tjmFunctions.httpClusterNameCheck('localhost')).toBe('http://localhost');
        expect(tjmFunctions.httpClusterNameCheck('http://localhost')).toBe('http://localhost');
        expect(tjmFunctions.httpClusterNameCheck('https://localhost')).toBe('https://localhost');
    });

    it('registered jobs return true, unregistered jobs return false', () => {
        jobContents = {
            tjm: {
                cluster: 'http://localhost',
                job_id: 'jobYouAreLookingFor'
            }
        };

        someJobId = 'jobYouAreLookingFor';

        tjmFunctions.__testContext(_teraslice);
        tjmFunctions.alreadyRegisteredCheck(jobContents)
            .then(alreadyRegistered => {
                expect(alreadyRegistered).toBe(true);
            });

        someJobId = 'notTheJobYouAreLookingFor';
        tjmFunctions.alreadyRegisteredCheck(jobContents)
        .then(alreadyRegistered => {
            expect(alreadyRegistered).toBe(false);
        });

        jobContents = {}
        someJobId = 'jobYouAreLookingFor';
        tjmFunctions.alreadyRegisteredCheck(jobContents)
        .then(alreadyRegistered => {
            expect(alreadyRegistered).toBe(false);
        });

    })

    it('meta data is being written to assets.json ', (done) => {
        argv.c = 'http://localhost';
        const tjmFunctions = require('../cmds/cmd_functions/functions')(argv);
        return createNewAsset()
            .then((result) => tjmFunctions.__testFunctions()._updateAssetMetadata())
            .then((jsonResult) => {
                expect(jsonResult.tjm).toBeDefined();
                expect(jsonResult.tjm.clusters[0]).toBe('http://localhost');
            })
            .catch(fail)
            .finally(done);
    })

    it('cluster is added to array in asset.json if a new cluster', (done) => {
        return createNewAsset()
            .then(() => {
                _.set(assetJson, 'tjm.clusters');
                assetJson.tjm.clusters =  [ 'http://localhost' ];
                return fs.writeFile(path.join(process.cwd(), 'asset/asset.json'), JSON.stringify(assetJson, null, 4))
            })
            .then(() => {
                argv.c = 'http://newCluster';
                tjmFunctions = require('../cmds/cmd_functions/functions')(argv);
                return tjmFunctions.__testFunctions()._updateAssetMetadata();
            })
            .then((jsonResult) => {
                expect(jsonResult.tjm).toBeDefined();
                expect(jsonResult.tjm.clusters[0]).toBe('http://localhost');
                expect(jsonResult.tjm.clusters[1]).toBe('http://newCluster');
            })
            .catch(fail)
            .finally(done);
    })

    it('no asset.json throw error', (done) => {
        argv.c = 'http://localhost'
        tjmFunctions = require('../cmds/cmd_functions/functions')(argv);
        return Promise.resolve()
            .then(() => fs.emptyDir(path.join(process.cwd(), 'asset')))
            .then(() => {
                expect(tjmFunctions.__testFunctions()._updateAssetMetadata).toThrowError();
            })
            .catch(fail)
            .finally(done);        
    })
    
    it('if cluster already in metadata throw error', (done) => {
        return createNewAsset()
            .then(() => {
                _.set(assetJson, 'tjm.clusters');
                assetJson.tjm.clusters = ['http://localhost', 'http://newCluster', 'http://anotherCluster'];
                return fs.writeFile(path.join(process.cwd(), 'asset/asset.json'), JSON.stringify(assetJson, null, 4));
            })
            .then(() => {
                argv.c = 'http://localhost';
                tjmFunctions = require('../cmds/cmd_functions/functions')(argv);
                expect(tjmFunctions.__testFunctions()._updateAssetMetadata).toThrowError('Assets have already been deployed to http://localhost, use update');
            })
            .catch(fail)
            .finally(done);
    })

    it('check that assets are zipped', (done) => {
            return createNewAsset()
            .then(() => {
                _.set(assetJson, 'tjm.clusters');
                assetJson.tjm.clusters = ['http://localhost', 'http://newCluster', 'http://anotherCluster'];
                return Promise.all([
                    fs.writeFile(path.join(process.cwd(), 'asset/asset.json'), JSON.stringify(assetJson, null, 4)),
                    fs.emptyDir(path.join(process.cwd(), 'builds'))
                ])
            })
            .then(() => tjmFunctions.zipAsset())
            .then(zipMessage => expect(zipMessage.success).toBe('Assets have been zipped to builds/processors.zip'))
            .then(() => fs.pathExists(path.join(process.cwd(), 'builds/processors.zip')))
            .then(exists => {
                expect(exists).toBe(true);
            })
            .catch(fail)
            .finally(done);
    })

    it('add assets returns post asset message', (done) => {
        assetObject = JSON.stringify({ 
            success: 'Asset was deployed',
            _id: '12345AssetId'
        });
        
        return Promise.resolve()
            .then(() => fs.emptyDir(path.join(process.cwd(), 'builds')))
            .then(() => fs.writeFile(path.join(process.cwd(), 'builds/processors.zip'), 'this is some sweet text'))
            .then(() => {
                tjmFunctions.__testContext(_teraslice);
                return tjmFunctions.__testFunctions()._postAsset()
            })
            .then((response) => {
                const parsedResponse = JSON.parse(response);
                expect(parsedResponse.success).toBe('Asset was deployed');
                expect(parsedResponse._id).toBe('12345AssetId');
            })
            .catch(fail)
            .finally(done);
    })

    it('load asset removes build, adds metadata to asset, zips asset, posts to cluster', (done) => {
        assetObject = JSON.stringify({success: 'this worked', _id: '1235fakejob'});
        argv.c = 'localhost'
        argv.a = true;
        tjmFunctions = require('../cmds/cmd_functions/functions')(argv);
        tjmFunctions.__testContext(_teraslice);

        return Promise.resolve()
            .then(() => {
                delete assetJson.tjm;
                console.log(assetJson);
                return fs.writeJson(path.join(process.cwd(), 'asset/asset.json'), assetJson, {spaces: 4})
                        .then(() => {
                            const lassetJson = require('../asset/asset.json');
                            console.log(lassetJson);
                    })
            })
            .then(() => tjmFunctions.loadAsset())
            .then(postAssetResponse => {
                const updatedAssetJson = require(path.join(process.cwd(), 'asset/asset.json'));
                expect(updatedAssetJson.tjm.clusters[0]).toBe('http://localhost');
                expect(fs.pathExistsSync(path.join(process.cwd(), 'builds/processors.zip'))).toBe(true);
                expect(fs.pathExistsSync(path.join(process.cwd(), 'asset/package.json'))).toBe(true);
            })
            .catch(fail)
            .finally(done);
    })
});
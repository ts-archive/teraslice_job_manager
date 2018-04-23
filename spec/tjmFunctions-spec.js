'use strict';

const fs = require('fs-extra');
const argv = {};
let tjmFunctions = require('../cmds/cmd_functions/functions')(argv, 'localhost');
const Promise = require('bluebird');
const path = require('path');
const _ = require('lodash');

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
    name: 'testing 123',
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
    fs.emptyDirSync(path.join(process.cwd(), 'asset'));
    fs.writeJsonSync(assetPath, assetJson, {spaces: 4});
    fs.writeJsonSync(packagePath, packageJson, {spaces: 4});
}

describe('tjmFunctions testing', () => {
    afterAll(() => {
        return Promise.all([
            fs.remove(path.join(process.cwd(), 'builds')),
            fs.remove(path.join(process.cwd(), 'asset'))
        ]);
    });

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

    it('meta data is being written to assets.json ', () => {
        createNewAsset();
        argv.c = 'http://localhost';
        const tjmFunctions = require('../cmds/cmd_functions/functions')(argv);
        fs.writeFileSync(path.join(process.cwd(), 'asset/asset.json'), JSON.stringify(assetJson));
        const jsonResult = tjmFunctions.__testFunctions()._updateAssetMetadata();
        expect(jsonResult.tjm).toBeDefined();
        expect(jsonResult.tjm.clusters[0]).toBe('http://localhost');
        fs.removeSync(path.join(process.cwd(), 'asset'));
    })

    it('cluster is added to array in asset.json if a new cluster', () => {
        createNewAsset();
        _.set(assetJson, 'tjm.clusters');
        assetJson.tjm.clusters =  [ 'http://localhost' ];
        fs.writeFileSync(path.join(process.cwd(), 'asset/asset.json'), JSON.stringify(assetJson));
        argv.c = 'http://newCluster';
        tjmFunctions = require('../cmds/cmd_functions/functions')(argv);
        const jsonResult = tjmFunctions.__testFunctions()._updateAssetMetadata();
        expect(jsonResult.tjm).toBeDefined();
        expect(jsonResult.tjm.clusters[0]).toBe('http://localhost');
        expect(jsonResult.tjm.clusters[1]).toBe('http://newCluster');
        fs.removeSync(path.join(process.cwd(), 'asset'));
    })

    it('no asset.json throw error', () => {
        argv.c = 'http://localhost'
        tjmFunctions = require('../cmds/cmd_functions/functions')(argv);
        fs.emptyDirSync(path.join(process.cwd(), 'asset'));
        expect(tjmFunctions.__testFunctions()._updateAssetMetadata).toThrow();
    })
    
    it('if cluster already in metadata throw error', () => {
        createNewAsset();
        _.set(assetJson, 'tjm.clusters');
        assetJson.tjm.clusters = ['http://localhost', 'http://newCluster', 'http://anotherCluster'];
        fs.writeFileSync(path.join(process.cwd(), 'asset/asset.json'), JSON.stringify(assetJson));
        argv.c = 'http://localhost';
        tjmFunctions = require('../cmds/cmd_functions/functions')(argv);

        expect(tjmFunctions.__testFunctions()._updateAssetMetadata).toThrow('Assets have already been deployed to http://localhost, use update');
    })

    it('check that assets are zipped', () => {
        createNewAsset();
        _.set(assetJson, 'tjm.clusters');
        assetJson.tjm.clusters = ['http://localhost', 'http://newCluster', 'http://anotherCluster'];
        fs.writeFileSync(path.join(process.cwd(), 'asset/asset.json'), JSON.stringify(assetJson));
        fs.emptyDirSync(path.join(process.cwd(), 'builds'));

        return tjmFunctions.__testFunctions()._zipAsset()
            .then(zipMessage => expect(zipMessage.success).toBe('Assets have been zipped to builds/processors.zip'))
            .then(() => fs.pathExists(path.join(process.cwd(), 'builds/processors.zip')))
            .then(exists => {
                expect(exists).toBe(true);
            })
            .catch((err) => console.log(err));
    })

    it('add assets returns post asset message', () => {
        fs.emptyDirSync(path.join(process.cwd(), 'builds'));

        assetObject = JSON.stringify({ 
            success: 'Asset was deployed',
            _id: '12345AssetId'
        });

        fs.writeFileSync(path.join(process.cwd(), 'builds/processors.zip'), 'this is some sweet text');
        tjmFunctions.__testContext(_teraslice);
        return tjmFunctions.__testFunctions()._addAsset()
            .then((response) => {
                const parsedResponse = JSON.parse(response);
                expect(parsedResponse.success).toBe('Asset was deployed');
                expect(parsedResponse._id).toBe('12345AssetId');
            });
    })

    it('load asset removes build, adds metadata to asset, zips asset, posts to cluster', () => {
        // create new asset
        createNewAsset();
        assetObject = { 
            success: 'this worked',
            _id: '1235fakejob'
        }

        // define cluster in argv
        argv.c = 'localhost'
        argv.a = true;
        tjmFunctions.__testContext(_teraslice);
        fs.emptyDirSync(path.join(process.cwd(), 'builds'));
        return Promise.resolve()
            .then(() => tjmFunctions.loadAsset())
            .then(postAssetResponse => {
                const updatedAssetJson = require(path.join(process.cwd(), 'asset/asset.json'));
                expect(postAssetResponse.success).toBe('this worked');
                expect(postAssetResponse._id).toBe('1235fakejob');
                expect(updatedAssetJson.tjm.clusters[0]).toBe('http://localhost');
                expect(fs.pathExistsSync(path.join(process.cwd(), 'builds/processors.zip'))).toBe(true);
                expect(fs.pathExistsSync(path.join(process.cwd(), 'asset/package.json'))).toBe(true);
            })
            .catch(err => console.log(err));
    })

});
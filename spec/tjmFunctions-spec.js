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

    it('check that job files do not have to end in json', () => {
        fs.writeFileSync(path.join(process.cwd(), 'tfile.prod.json'), JSON.stringify({ test: 'test' }));
        let jobFileFunctions = require('../cmds/cmd_functions/json_data_functions')('tfile.prod.json');
        let jobData = jobFileFunctions.jobFileHandler();
        expect((jobData[1]).test).toBe('test');
        jobFileFunctions = require('../cmds/cmd_functions/json_data_functions')('tfile.prod');
        jobData = jobFileFunctions.jobFileHandler();
        expect((jobData[1]).test).toBe('test');
        fs.unlinkSync(path.join(process.cwd(), 'tfile.prod.json'));
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
        tjmFunctions = require('../cmds/cmd_functions/functions')(argv);
        const jsonResult = tjmFunctions.updateAssetsMetadata();
        expect(jsonResult.tjm).toBeDefined();
        expect(jsonResult.tjm.clusters[0]).toBe('http://localhost');
        fs.removeSync(path.join(process.cwd(), 'asset'));
    })

    it('cluster is added to array in asset.json if a new cluster', () => {
        _.set(assetJson, ['tjm', 'cluster', ['http://localhost']]);
        createNewAsset();
        
        argv.c = 'http://newCluster';
        tjmFunctions = require('../cmds/cmd_functions/functions')(argv);
        const jsonResult = tjmFunctions.updateAssetsMetadata();
        expect(jsonResult.tjm).toBeDefined();
        expect(jsonResult.tjm.clusters[0]).toBe('http://localhost');
        expect(jsonResult.tjm.clusters[1]).toBe('http://newCluster');
        fs.removeSync(path.join(process.cwd(), 'asset'));
    })

    it('no asset.json throw error', () => {
        const assetPath = path.join(process.cwd(), 'asset/asset.json');
        argv.c = 'http://localhost'
        tjmFunctions = require('../cmds/cmd_functions/functions')(argv);
        fs.emptyDirSync(path.join(process.cwd(), 'asset'));
        expect(tjmFunctions.updateAssetsMetadata).toThrow();
    })
    
    it('if cluster already in metadata throw error', () => {
        _.set(assetJson, ['tjm', 'clusters',['http://localhost', 'http://newCluster', 'http://anotherCluster']]);
        argv.c = 'http://localhost';
        tjmFunctions = require('../cmds/cmd_functions/functions')(argv);

        expect(tjmFunctions.updateAssetsMetadata).toThrow('Assets have already been deployed to http://localhost, use update');
    })

    it('check that assets are zipped', () => {
        _.set(assetJson, ['tjm', 'clusters',['http://localhost', 'http://newCluster', 'http://anotherCluster']]);
        fs.emptyDirSync(path.join(process.cwd(), 'builds'));

        return tjmFunctions.zipAssets()
            .then(zipMessage => expect(zipMessage.success).toBe('Assets have been zipped to builds/processors.zip'))
            .then(() => fs.pathExists(path.join(process.cwd(), 'builds/processors.zip')))
            .then(exists => {
                expect(exists).toBe(true);
            })
            .catch((err) => console.log(err));
    })

    it('add assets returns post asset message', () => {
        delete assetJson.tjm;
        createNewAsset();
        fs.emptyDirSync(path.join(process.cwd(), 'builds'));

        assetObject = JSON.stringify({ 
            success: 'Asset was deployed',
            _id: '12345AssetId'
        });

        fs.writeFileSync(path.join(process.cwd(), 'builds/processors.zip'), 'this is some sweet text');
        tjmFunctions.__testContext(_teraslice);
            return tjmFunctions.addAssets()
                .then((response) => {
                    const parsedResponse = JSON.parse(response);
                    expect(parsedResponse.success).toBe('Asset was deployed');
                    expect(parsedResponse._id).toBe('12345AssetId');
                });
    })
});
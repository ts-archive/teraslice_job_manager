'use strict';

const fs = require('fs-extra');
const argv = {};
let tjmFunctions = require('../cmds/cmd_functions/functions')(argv, 'localhost');
const Promise = require('bluebird');
const path = require('path');

let jobContents;
let someJobId;
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
    }
};

describe('teraslice job manager testing', () => {
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
        const assetJson = {
            name: 'testing 123',
            version: '0.0.01',
            description: 'dummy asset.json for testing'
        }

        const assetPath = path.join(process.cwd(), 'asset/asset.json');
        
        argv.c = 'http://localhost';
        tjmFunctions = require('../cmds/cmd_functions/functions')(argv);

        fs.emptyDirSync(path.join(process.cwd(), 'asset'));
        fs.writeJsonSync(assetPath, assetJson, {spaces: 4});
        const jsonResult = tjmFunctions.updateAssetsMetadata();
        expect(jsonResult.tjm).toBeDefined();
        expect(jsonResult.tjm.clusters[0]).toBe('http://localhost');
        fs.removeSync(path.join(process.cwd(), 'asset'));
    })

    it('cluster is added to array in asset.json if a new cluster', () => {
        const assetJson = {
            name: 'testing 123',
            version: '0.0.01',
            description: 'dummy asset.json for testing',
            tjm: {
                clusters: [ 'http://localhost' ]
            }
        }

        const assetPath = path.join(process.cwd(), 'asset/asset.json');
        
        argv.c = 'http://newCluster';
        tjmFunctions = require('../cmds/cmd_functions/functions')(argv);
        fs.emptyDirSync(path.join(process.cwd(), 'asset'));
        fs.writeJsonSync(assetPath, assetJson, {spaces: 4});
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
        const assetJson = {
            name: 'testing 123',
            version: '0.0.01',
            description: 'dummy asset.json for testing',
            tjm: {
                clusters: [ 'http://localhost', 'http://newCluster', 'http://anotherCluster' ]
            }
        }

        const assetPath = path.join(process.cwd(), 'asset/asset.json');
        argv.c = 'http://localhost';
        tjmFunctions = require('../cmds/cmd_functions/functions')(argv);
        fs.emptyDirSync(path.join(process.cwd(), 'asset'));
        fs.writeJsonSync(assetPath, assetJson, {spaces: 4});
        expect(tjmFunctions.updateAssetsMetadata).toThrow('Assets have already been deployed to http://localhost, use update');
    })

    it('check that assets are zipped', () => {
        const assetJson = {
            name: 'testing 123',
            version: '0.0.01',
            description: 'dummy asset.json for testing',
            tjm: {
                clusters: [ 'http://localhost', 'http://newCluster', 'http://anotherCluster' ]
            }
        }

        const packageJson = {
            name: 'common_processors',
            version: '0.0.29',
            description: 'Processing modules that are common across data types',
            main: "index.js"
        }

        const assetPath = path.join(process.cwd(), 'asset/asset.json');
        const packagePath = path.join(process.cwd(), 'asset/package.json');
        fs.emptyDirSync(path.join(process.cwd(), 'asset'));
        fs.writeJsonSync(assetPath, assetJson, {spaces: 4});
        fs.writeJsonSync(packagePath, packageJson, {spaces: 4});

        fs.emptyDirSync(path.join(process.cwd(), 'builds'));
       
        return tjmFunctions.zipAssets()
        .then(() => fs.pathExists(path.join(process.cwd(), 'builds/processors.zip')))
        .then(exists => {
            expect(exists).toBe(true);
        })
        .catch((err) => console.log(err));

    })
});
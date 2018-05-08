'use strict';

const fs = require('fs-extra');
const path = require('path');


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

function createNewAssetDir(asset, pack) {
    fs.emptyDirSync(path.join(process.cwd(), 'asset'));
    const assetPath = path.join(process.cwd(), 'asset/asset.json');
    const packagePath = path.join(process.cwd(), 'asset/package.json');
    fs.writeJsonSync(assetPath, assetJson, {spaces: 4});
    fs.writeJsonSync(packagePath, packageJson, {spaces: 4});
}

const _tjmFunctions = {
    loadAsset: () => {
        return Promise.resolve(true);
    }
}

describe('asset command testing', () => {
    let argv = {};

    fit('deploy should clear builds, zip, and deploy', () => {
        // create assets.json and package.json
        createNewAssetDir();
        argv.c = 'localhost';
        argv.cmd = 'deploy';    
        const handler = require('../cmds/asset').handler;
        // console.log(handler);

    })
});
'use strict';

let deployMessage = 'default deployed message';
let deployError = null;
const _tjmFunctions = {
    loadAsset: () => {
        if (deployError) {
            return Promise.reject(deployError);
        }
        return Promise.resolve(deployMessage);
    },
    zipAsset: () => Promise.resolve({
        bytes: 1000,
        success: 'very successful'
    })
};

describe('asset command testing', () => {
    beforeEach(() => {
        deployError = null;
        deployMessage = 'default deployed message';
    });
    let argv = {};
    let error = new Error();

    it('deploy triggers load asset', (done) => {
        argv.c = 'localhost:5678';
        argv.cmd = 'deploy';
        deployMessage = 'deployed';

        Promise.resolve()
            .then(() => fs.ensureFile(assetPath))
            .then(() => fs.writeJson(assetPath, assetJson, {spaces: 4}))
            .then(() => require('../cmds/asset').handler(argv, _tjmFunctions))
            .then((result) => {
                expect(result).toEqual('deployed');
            })
            .catch(fail);
    });

    it('deploy should respond to a request error', (done) => {
        argv.c = 'localhost:5678';
        argv.cmd = 'deploy';
        const error = new Error('This is an error');
        error.name = 'RequestError';
        error.message = 'This is an error';

        deployError = error;
        return require('../cmds/asset').handler(argv, _tjmFunctions)
            .catch((err) => {
                expect(err).toBe('Could not connect to localhost:5678');
            });
    });

     it('asset update should throw an error if no cluster data', (done) => {
        argv = {};
        argv.cmd = 'update';

        return Promise.resolve()
            .then(() => require('../cmds/asset').handler(argv, _tjmFunctions))
            .catch(err => expect(err).toBe('Cluster data is missing from asset.json or not specified using -c.'));
    });
});

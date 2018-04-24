'use strict';

const chalk = require('chalk');

module.exports = () => {
    function error(message) {
        throw Error(message);
    }

    function success(message) {
        console.log(chalk.green(message));
    }

    function warning(message) {
        console.log(chalk.yellow(message));
    }

    return {
        error,
        success,
        warning
    };
};


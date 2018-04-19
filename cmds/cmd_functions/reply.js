'use strict';

const chalk = require('chalk');

module.exports = () => {
    function error(message) {
        throw message;
        //process.exit();
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


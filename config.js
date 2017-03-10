var _ = require('lodash'),
    configLocal,

    config;

config = {
    mongodbUrl: 'mongodb://localhost:27017/userservice',
    redisUrl: 'redis://localhost@127.0.0.1:6379',
    port: 10002
}

try {
    configLocal = require('./config_local.js');
}catch (error) {
    console.log("May be you need config_local.js");
}

if (configLocal) {
    _.merge(config, configLocal);
}

module.exports = config;

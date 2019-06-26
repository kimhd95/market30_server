'use strict';

const
	_ = require('lodash'),
	env = process.env.NODE_ENV || 'local',
	envConfig = require('./' + env),
	dbKeyConfig = require('./db_and_keys');

module.exports = _.merge(envConfig, dbKeyConfig);

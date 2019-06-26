const productionKeys = require('./production_keys')

const environments = {
	local: {
		mysql: {
            host: 'market30db.c3cgz5eipt1b.ap-northeast-2.rds.amazonaws.com',
            username: 'market30',
						password: 'market30',
            database: 'market30db',
            logging: console.log
		},
	},
	dev: {
		mysql: {
            host: 'market30db.c3cgz5eipt1b.ap-northeast-2.rds.amazonaws.com',
            username: 'market30',
            password: 'market30',
            database: 'market30db',
            logging: console.log
		},
	},
	//todo: stage server ??
	production: {
		mysql: {
			host: productionKeys.prodDBHost,
			username: productionKeys.prodDBUserName,
			password: productionKeys.prodDBKey,
			database: productionKeys.prodDBDatabase,
			logging: console.log
		},
		apikey: productionKeys.prodAPIKey,
		jwt_secret: productionKeys.prodJWTKey
	}
}

const nodeEnv = process.env.NODE_ENV || 'local';
module.exports = environments[nodeEnv];

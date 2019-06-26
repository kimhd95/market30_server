const Sequelize = require('sequelize');
const config = require('../../configs')

const verifyAPIKEY = (req, res, next) => {

    if(!req.body.apikey) {
        console.log(req.body.apikey);
        return res.status(400).send('API key not given.');
    }

    //console.log(req.body);
    const apikey = req.body.apikey.toString().trim() || '';
    if(apikey!=config.apikey)
        return res.status(400).send('API key is invalid.');

    next();
}

const sequelize = new Sequelize(
    config.mysql.database,
    config.mysql.username,
    config.mysql.password, {
        logging: false,
        // logging: config.mysql.logging,
        host: config.mysql.host,
        dialect: 'mysql',
        timezone: '+09:00',
        define: {
            // For Korean support
            charset: 'utf8',
            collate: 'utf8_general_ci',

            // don't add the timestamp attributes (updatedAt, createdAt)
            timestamps: false,

            // don't delete database entries but set the newly added attribute deletedAt
            // to the current date (when deletion was done). paranoid will only work if
            // timestamps are enabled
            paranoid: false,

            // don't use camelcase for automatically added attributes but underscore style
            // so updatedAt will be updated_at
            underscored: true,

            // disable the modification of tablenames; By default, sequelize will automatically
            // transform all passed model names (first parameter of define) into plural.
            // if you don't want that, set the following
            operatorsAliases: false,
        }

    }

);

const Buyer = sequelize.define('buyers', {
  id: Sequelize.INTEGER,
  user_id: Sequelize.STRING,
  password: Sequelize.STRING,
  created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
},
{
  tableName: 'buyers',
  freezeTableName: true,
  timestamps: true,
  underscored: true,
});

const Seller = sequelize.define('sellers', {
  id: Sequelize.INTEGER,
  user_id: Sequelize.STRING,
  password: Sequelize.STRING,
  created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
},
{
  tableName: 'sellers',
  freezeTableName: true,
  timestamps: true,
  underscored: true,
});

const Store = sequelize.define('stores', {
  id: Sequelize.INTEGER,
  owner_id: Sequelize.INTEGER,
  name: Sequelize.STRING,
  created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
},
{
  tableName: 'stores',
  freezeTableName: true,
  timestamps: true,
  underscored: true,
});

const Product = sequelize.define('products', {
  id: Sequelize.INTEGER,
  store_id: Sequelize.INTEGER,
  name: Sequelize.STRING,
  price: Sequelize.INTEGER,
  count: Sequelize.INTEGER,
  describe: Sequelize.STRING,
  image: Sequelize.STRING,
  created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
},
{
  tableName: 'products',
  freezeTableName: true,
  timestamps: true,
  underscored: true,
});

const Transaction = sequelize.define('transactions', {
  id: Sequelize.INTEGER,
  buyer_id: Sequelize.INTEGER,
  seller_id: Sequelize.INTEGER,
  store_id: Sequelize.INTEGER,
  product_id: Sequelize.INTEGER,
  price: Sequelize.INTEGER,
  count: Sequelize.INTEGER,
  created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
},
{
  tableName: 'transactions',
  freezeTableName: true,
  timestamps: true,
  underscored: true,
});


module.exports = {
    sequelize: sequelize,
    Buyer: Buyer,
    Seller: Seller,
    Store: Store,
    Product: Product,
    Transaction: Transaction
};

const Sequelize = require('sequelize');
const config = require('../../configs')

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
  id: {type: Sequelize.INTEGER, primaryKey: true},
  user_id: Sequelize.STRING,
  password: Sequelize.STRING,
  name: Sequelize.STRING,
  created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
},
{
  tableName: 'buyers',
  freezeTableName: true,
  timestamps: true,
  underscored: true,
});

const Seller = sequelize.define('sellers', {
  id: {type: Sequelize.INTEGER, primaryKey: true},
  user_id: Sequelize.STRING,
  password: Sequelize.STRING,
  name: Sequelize.STRING,
  created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
},
{
  tableName: 'sellers',
  freezeTableName: true,
  timestamps: true,
  underscored: true,
});

const Store = sequelize.define('stores', {
  id: {type: Sequelize.INTEGER, primaryKey: true},
  owner_id: Sequelize.INTEGER,
  name: Sequelize.STRING,
  open_time: Sequelize.STRING,
  close_time: Sequelize.STRING,
  created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
},
{
  tableName: 'stores',
  freezeTableName: true,
  timestamps: true,
  underscored: true,
});

const Product = sequelize.define('products', {
  id: {type: Sequelize.INTEGER, primaryKey: true},
  seller_id: Sequelize.STRING,
  name: Sequelize.STRING,
  price: Sequelize.INTEGER,
  original_price: Sequelize.INTEGER,
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
  id: {type: Sequelize.INTEGER, primaryKey: true},
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

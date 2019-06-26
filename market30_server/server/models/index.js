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

// const User = sequelize.define('user', {
//     kakao_id: Sequelize.STRING,
//     encrypted_kakao_id: Sequelize.STRING,
//     name: Sequelize.STRING,
//     registered: Sequelize.STRING,
//     scenario: Sequelize.STRING,
//     state: Sequelize.STRING,
//     exit: Sequelize.INTEGER,
//     hate_food: Sequelize.STRING,
//     vegi: Sequelize.STRING,
//     subway: Sequelize.STRING,
//     exit_quarter: Sequelize.STRING,
//     with_mood: Sequelize.STRING,
//     mood2: Sequelize.STRING,
//     taste: Sequelize.STRING,
//     food_type: Sequelize.STRING,
//     drink_type: Sequelize.STRING,
//     drink_round: Sequelize.STRING,
//     rest1: Sequelize.INTEGER,
//     rest2: Sequelize.INTEGER,
//     cafe1: Sequelize.INTEGER,
//     cafe2: Sequelize.INTEGER,
//     cafe_final: Sequelize.INTEGER,
//     rest_final: Sequelize.INTEGER,
//     lat: Sequelize.FLOAT,
//     lng: Sequelize.FLOAT,
//     mid_lat: Sequelize.FLOAT,
//     mid_lng: Sequelize.FLOAT,
//     cnt: Sequelize.INTEGER,
//     limit_cnt: {type: Sequelize.INTEGER, defaultValue: 0},
//     decide_updated_at: Sequelize.STRING,
//     limit_cnt_drink: {type: Sequelize.INTEGER, defaultValue: 0},
//     limit_cnt_cafe: {type: Sequelize.INTEGER, defaultValue: 0},
//     decide_updated_at_cafe: Sequelize.STRING,
//     decide_updated_at_drink: Sequelize.STRING,
//     gender: Sequelize.STRING,
//     birthYear: Sequelize.INTEGER,
//     phone: Sequelize.STRING,
//     password: Sequelize.STRING,
//     email: { type: Sequelize.STRING, allowNull: false, unique: true },
//     social: { type: Sequelize.BOOLEAN, allowNull: false },
//     chat_log: Sequelize.TEXT('medium'),
//     chat_log_jellylab: Sequelize.TEXT('medium'),
//     freq_subway: Sequelize.STRING,
//     drink_before: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false},
//     cafe_before: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false},
//     created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
//     updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
//     menu_chat_log: Sequelize.TEXT('medium'),
//     drink_chat_log: Sequelize.TEXT('medium'),
//     middle_chat_log: Sequelize.TEXT('medium'),
//     cafe_chat_log: Sequelize.TEXT('medium'),
//     mainmenu_type: Sequelize.STRING,
//     subway_cafe: Sequelize.STRING,
//     freq_subway_cafe: Sequelize.STRING,
//     mood1: Sequelize.STRING,
//     food_name: Sequelize.STRING,
//     price_lunch: Sequelize.STRING,
//     price_dinner: Sequelize.STRING,
//     stack: Sequelize.STRING,
//     rest_stack: Sequelize.STRING,
// },
// {
//   tableName: 'users',
//   freezeTableName: true,
//   timestamps: true,
//   underscored: true,
// });
//
//
// const UserLog = sequelize.define('user_log', {
//     kakao_id: { type: Sequelize.STRING, allowNull: false},
//     encrypted_kakao_id: Sequelize.STRING,
//     scenario: Sequelize.STRING,
//     state: Sequelize.STRING,
//     content: Sequelize.STRING,
//     date: Sequelize.STRING,
//     type: Sequelize.STRING,
//     answer_num: Sequelize.INTEGER,
//
//     created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
//     updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
// });
//
// const User_image = sequelize.define('user_image', {
//     kakao_id: Sequelize.STRING,
//     encrypted_kakao_id: Sequelize.STRING,
//     image_link: Sequelize.STRING,
//     image_info: Sequelize.STRING,
//     date: Sequelize.INTEGER,
//     // check_skin : Sequelize.FLOAT,
//     // check_atopy : Sequelize.FLOAT
//     created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
//     updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
// });
//
// const User_feedback = sequelize.define('user_feedback', {
//     kakao_id: Sequelize.STRING,
//     encrypted_kakao_id: Sequelize.STRING,
//     sex: Sequelize.STRING,
//     birthday: Sequelize.INTEGER,
//     job: Sequelize.STRING,
//     feedback_content: Sequelize.STRING,
//     date: Sequelize.STRING,
//
//
//     created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
//     updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
// });
//
// const Restaurant = sequelize.define('restaurant', {
//     region: Sequelize.STRING,
//     res_name: Sequelize.STRING,
//     subway: Sequelize.STRING,
//     exit_quarter: Sequelize.INTEGER,
//     food_type: Sequelize.STRING,
//     food_name: Sequelize.STRING,
//     price_lunch: Sequelize.STRING,
//     price_dinner: Sequelize.STRING,
//     mood: Sequelize.STRING,
//     lunch_option: Sequelize.BOOLEAN,
//     taste: Sequelize.STRING,
//     mood2: Sequelize.STRING,
//     drink_type: Sequelize.STRING,
//     drink_round: Sequelize.STRING,
//     food_ingre: Sequelize.STRING,
//     food_cost: Sequelize.STRING,
//     res_size: Sequelize.STRING,
//     calories: Sequelize.INTEGER,
//     res_phone: Sequelize.STRING,
//     closedown: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }
//   },{
//     tableName: 'restaurants',
//     freezeTableName: true,
//     indexes: [
//       // add a FULLTEXT index
//       { type: 'FULLTEXT', name: 'subway_idx', fields: ['subway'] },
//       { type: 'FULLTEXT', name: 'food_type_idx', fields: ['food_type'] },
//       { type: 'FULLTEXT', name: 'food_name_idx', fields: ['food_name'] },
//       { type: 'FULLTEXT', name: 'mood_idx', fields: ['mood'] },
//       { type: 'FULLTEXT', name: 'mood2_idx', fields: ['mood2'] },
//       { type: 'FULLTEXT', name: 'taste_idx', fields: ['taste'] },
//       { type: 'FULLTEXT', name: 'price_lunch_idx', fields: ['price_lunch'] },
//       { type: 'FULLTEXT', name: 'price_dinner_idx', fields: ['price_dinner'] },
//       { type: 'FULLTEXT', name: 'food_name_idx', fields: ['food_name'] },
//       { type: 'FULLTEXT', name: 'drink_type_idx', fields: ['drink_type'] },
//       { type: 'FULLTEXT', name: 'drink_round_idx', fields: ['drink_round'] },
//       { method: 'BTREE', name: 'exit_quarter_idx', fields: ['exit_quarter'] }
//     ]
//   });
//
// const Decide_history = sequelize.define('decide_history', {
//     email: Sequelize.STRING,
//     rest1: Sequelize.INTEGER,
//     rest2: Sequelize.INTEGER,
//     rest_winner: Sequelize.INTEGER,
//     res_name: Sequelize.STRING,
//     subway: Sequelize.STRING,
//     date: Sequelize.STRING
//     // check_skin : Sequelize.FLOAT,
//     // check_atopy : Sequelize.FLOAT
// });
//
// const Beer = sequelize.define('beer', {
//     beer_name: Sequelize.STRING,
//     place: Sequelize.STRING,
//     sell_type: Sequelize.STRING,
//     flavor: Sequelize.INTEGER,
//     soda: Sequelize.INTEGER,
//     alcohol: Sequelize.FLOAT,
//     beer_type: Sequelize.STRING,
//     image_url: Sequelize.STRING,
//     comment: Sequelize.STRING
// });
//
// const Cafe = sequelize.define('cafe', {
//   region: Sequelize.STRING,
//   subway: Sequelize.STRING,
//   exit_quarter: Sequelize.INTEGER,
//   cafe_name: Sequelize.STRING,
//   mainmenu_type: Sequelize.STRING,
//   drink_name: Sequelize.STRING,
//   food_name: Sequelize.STRING,
//   mood2: Sequelize.STRING,
//   mood1: Sequelize.STRING,
//   phone: Sequelize.STRING,
//   closedown: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }
// },{
//   tableName: 'cafes',
//   freezeTableName: true,
//   operatorsAliases: false,
//   indexes: [
//     // add a FULLTEXT index
//     { type: 'FULLTEXT', name: 'subway_idx', fields: ['subway'] },
//     { type: 'FULLTEXT', name: 'food_name_idx', fields: ['food_name'] },
//     { type: 'FULLTEXT', name: 'mood1_idx', fields: ['mood1'] },
//     { type: 'FULLTEXT', name: 'mood2_idx', fields: ['mood2'] },
//     { type: 'FULLTEXT', name: 'mainmenu_type_idx', fields: ['mainmenu_type'] },
//     { type: 'FULLTEXT', name: 'cafe_name_idx', fields: ['cafe_name'] },
//     { type: 'FULLTEXT', name: 'drink_name_idx', fields: ['drink_name'] },
//     { method: 'BTREE', name: 'exit_quarter_idx', fields: ['exit_quarter'] }
//   ]
// });

module.exports = {
    sequelize: sequelize
    // ,
    // User: User,
    // UserLog: UserLog,
    // User_image: User_image,
    // Decide_history: Decide_history,
    // User_feedback: User_feedback,
    // Beer: Beer,
    // Cafe: Cafe,
    // Restaurant: Restaurant,
    // verifyAPIKEY: verifyAPIKEY
};

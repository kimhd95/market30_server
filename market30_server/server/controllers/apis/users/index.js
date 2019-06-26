'use strict';

const
    express = require('express'),
    userService = require('../../../services/users'),
    models = require('../../../models'),
    chatbotService = require('../../../services/users/chatbot');

let router = express.Router();

console.log('apis/users/index.js called');
/**
 * api/v1/users/
 */
// router.use(chatbotService.checkTokenVerified);
router.post('/verify_token', chatbotService.verifyToken);
router.post('/register_user', chatbotService.registerUser);
router.post('/login', chatbotService.login);
router.post('/social_login', chatbotService.socialLogin);
router.post('/logout', chatbotService.logout);
router.post('/send_new_password', chatbotService.sendNewPassword);
router.post('/send_inquiry', chatbotService.sendInquiry);
router.post('/member_withdraw', chatbotService.memberWithdraw);
router.post('/update_password', chatbotService.updatePassword);

router.post('/update_user', chatbotService.updateUser);
router.post('/get_restaurant', chatbotService.getRestaurant);
router.post('/get_two_restaurant', chatbotService.getTwoRestaurant);
router.post('/get_near_restaurant', chatbotService.getNearRestaurant);
router.post('/get_all_history', chatbotService.getAllHistory);
router.post('/get_subway_history', chatbotService.getSubwayHistory);
router.post('/get_count_history', chatbotService.getCountHistory);
router.post('/update_socket', chatbotService.updateSocket);
router.post('/update_chatlog', chatbotService.updateChatLog);

router.post('/update_state_email', chatbotService.updateStateEmail);
router.post('/delete_part_log', chatbotService.deletePartLog);
router.post('/get_part_log', chatbotService.getPartLog);
router.post('/update_part_log', chatbotService.updatePartLog);
router.post('/register_onetime_user', chatbotService.registerOnetimeUser);
router.post('/login_onetime', chatbotService.loginOnetime);

router.get('/get_user_info/:kakao_id', chatbotService.getUserInfo);
router.get('/get_user_info2/:email', chatbotService.getUserInfoByEmail);
router.post('/get_restaurant_info', chatbotService.getRestaurantInfo);
router.post('/update_user_start', chatbotService.updateUserStart);
router.post('/update_place_start', chatbotService.updatePlaceStart);
router.post('/update_rest2', chatbotService.updateRest2);
router.post('/update_place_info', chatbotService.updatePlaceInfo);
router.post('/update_mid_info', chatbotService.updateMidInfo);
router.post('/create_decide_history', chatbotService.createDecideHistory);
router.post('/create_user_feedback', chatbotService.createUserFeedback);
router.post('/get_feedback_info', chatbotService.getFeedbackInfo);
router.post('/create_user_log', chatbotService.createUserLog);
router.post('/update_limit_cnt', chatbotService.updateLimitCnt);
router.post('/verify_limit', chatbotService.verifyLimit);
router.post('/update_state', chatbotService.updateState);
router.get('/get_all_subway', chatbotService.getAllSubway);
router.get('/get_all_restaurant', chatbotService.getAllRestsaurant);
router.post('/get_similar_restaurant', chatbotService.getSimilarRestaurant);
router.post('/get_other_restaurant', chatbotService.getOtherRestaurant);
router.post('/get_other_drink_restaurant', chatbotService.getOtherDrinkRestaurant);
router.post('/get_similar_drink_restaurant', chatbotService.getSimilarDrinkRestaurant);
router.post('/verify_subway', chatbotService.verifySubway);
router.post('/verify_subway_drinktype', chatbotService.verifySubwayDrinktype);
router.post('/verify_search_food', chatbotService.verifySearchFood);
router.post('/verify_mood2', chatbotService.verifyMood2);
router.post('/crawl_image', chatbotService.crawlImage);
router.post('/crawl_two_image', chatbotService.crawlTwoImage);
router.post('/previous_register_user', chatbotService.previousRegisterUser);
router.post('/get_chat_log', chatbotService.getChatLog);
router.post('/delete_chat_log', chatbotService.deleteChatLog);
router.post('/find_subway_drink_type', chatbotService.findSubwayDrinkType);
router.post('/get_drink_restaurant', chatbotService.getDrinkRestaurant);
router.post('/update_drink_start', chatbotService.updateDrinkStart);
router.get('/get_subway_list_history', chatbotService.getSubwayListHistory);
router.post('/update_limit_cnt_drink', chatbotService.updateLimitCntDrink);
router.post('/verify_limit_drink', chatbotService.verifyLimitDrink);

router.post('/update_limit_cnt_cafe', chatbotService.updateLimitCntCafe);
router.post('/verify_limit_cafe', chatbotService.verifyLimitCafe);
router.post('/update_cafe_start', chatbotService.updateCafeStart);
router.post('/verify_subway_thema', chatbotService.verifySubwayThema);
router.post('/verify_subway_detail_thema', chatbotService.verifySubwayDetailThema);
router.post('/get_cafe', chatbotService.getCafe);
router.post('/get_cafe2', chatbotService.getCafe2);
router.post('/get_cafe3', chatbotService.getCafe3);
router.post('/get_cafe4', chatbotService.getCafe4);
router.post('/get_cafe5', chatbotService.getCafe5);
router.post('/update_cafe2', chatbotService.updateCafe2);
router.post('/get_cafe_info', chatbotService.getCafeInfo);

router.post('/get_cafe_test', chatbotService.getCafeTest);
router.post('/verify_result_exist', chatbotService.verifyResultExist);
router.post('/verify_drinktype_list', chatbotService.verifyDrinktypeList);

router.get('/get_users', userService.getUsers); // 현재 미사용
router.get('/:id', userService.getUserWithId); // 현재 미사용

router.post('/get_restaurant_subway', chatbotService.getRestaurantSubway);
router.post('/set_restaurant_latlng', chatbotService.setRestaurantLatLng);
router.post('/update_closedown', chatbotService.updateClosedown);

router.post('/update_MBTI_logs', chatbotService.updateMBTILogs);

router.post('/add_chelinguide_item', chatbotService.addChelinguideItem);
router.post('/modify_chelinguide_item', chatbotService.modifyChelinguideItem);
router.post('/delete_chelinguide_item', chatbotService.deleteChelinguideItem);
router.post('/get_chelinguide_list', chatbotService.getChelinguideList);
router.post('/get_chelinguide_item_info', chatbotService.getChelinguideItemInfo);

router.post('/save_plan', chatbotService.savePlan);
router.post('/search_plan', chatbotService.searchPlan);

router.use('/*', models.verifyAPIKEY); //현재 미사용
// ^Middleware. Make sure to put all the routes which needs authentication below this middleware.

module.exports = router;

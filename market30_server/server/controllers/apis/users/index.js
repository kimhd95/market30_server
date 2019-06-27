'use strict';

const
    express = require('express'),
    userService = require('../../../services/users'),
    models = require('../../../models'),
    APIService = require('../../../services/users/api_service');

let router = express.Router();

console.log('apis/users/index.js called');
/**
 * api/v1/users/
 */
router.get('/images/:imageName', function(req, res) {
  let imageName = req.params.imageName;
  res.sendFile(`/home/ubuntu/market30_server/market30_server/server/public/${imageName}.jpg`);
});

// router.post('/register_buyer', APIService.registerBuyer);
// router.post('/register_seller', APIService.registerSeller);
// router.post('/register_store', APIService.registerStore);
// router.post('/register_product', APIService.registerProduct);
router.post('/get_buyer_info', APIService.getBuyerInfo);
router.post('/register_product', APIService.registerProduct);
router.post('/get_product_list', APIService.getProductList);
router.post('/verify_barcode', APIService.verifyBarcode);

// ^Middleware. Make sure to put all the routes which needs authentication below this middleware.

module.exports = router;

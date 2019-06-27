const models = require('../../models');
const config = require('../../../configs');
const Op = models.sequelize.Op;
const request = require('request');
const qs = require('qs');
const cheerio = require('cheerio');


function getBuyerInfo(req, res) {
  const {user_id, password} = req.body;
  models.sequelize.query(`SELECT * FROM buyers;`).then(result => {
    console.log(result[0]);
    if (result[0].length > 0) {
      return res.status(200).json({success: true, data: result[0][0]});
    } else {
      return res.status(403).json({success: false, message: "no account"});
    }
  }).catch(err => {
    return res.status(500).json({success: false, message: "Internal Server or DB error."})
  });
}

function registerBuyer(req, res) {
  const {user_id, password, name} = req.body;
  const query = `INSERT INTO buyers (user_id, password, name, created_at) VALUES('${user_id}', '${password}', ${name}, NOW())`;
  models.sequelize.query(query).then(result => {
    return res.status(200).json({success: true});
  }).catch(err => {
    return res.status(500).json({success: false, message: "Internal Server or DB error."});
  });
}

function registerSeller(req, res) {
  const {user_id, password, name} = req.body;
  const query = `INSERT INTO sellers (user_id, password, name, created_at) VALUES('${user_id}', '${password}', ${name}, NOW())`;
  models.sequelize.query(query).then(result => {
    return res.status(200).json({success: true});
  }).catch(err => {
    return res.status(500).json({success: false, message: "Internal Server or DB error."});
  });
}

function registerStore(req, res) {
  const {owner_id, name, open_time, close_time} = req.body;
  const query = `INSERT INTO stores (owner_id, name, open_time, close_time, created_at) VALUES('${owner_id}', '${name}', ${open_time}, ${close_time}, NOW())`;
  models.sequelize.query(query).then(result => {
    return res.status(200).json({success: true});
  }).catch(err => {
    return res.status(500).json({success: false, message: "Internal Server or DB error."});
  });
}

function registerProduct(req, res) {
  const {name, seller_id, price, count, comment, image} = req.body;
  const query = `INSERT INTO products (name, seller_id, price, count, comment, image, created_at) VALUES('${name}', '${seller_id}', ${price}, ${count}, '${comment}', '${image}', NOW())`;
  console.log(query);
  models.sequelize.query(query).then(result => {
    return res.status(200).json({success: true});
  }).catch(err => {
    return res.status(500).json({success: false, message: "Internal Server or DB error."});
  });
}

function deleteProduct(req, res) {
  const {seller_id, id, name} = req.body;
  models.Product.count({
    where: {
      id: id,
      seller_id: seller_id
    }
  }).then(result => {
    if(result > 0) {
      models.sequelize.query(`DELETE FROM products WHERE id=${id}`)
      .then(result => {
        return res.status(200).json({success: true});
      })
    }
  }).catch(err => {
    return res.status(500).json({success: false, message: "Internal Server or DB error."})
  });
}

function getProductListBuyer(req, res) {
  const query = `SELECT * FROM products`;
  models.sequelize.query(query)
  .then(result => {
    return res.status(200).json({success: true, data: result[0]});
  }).catch(err => {
    return res.status(500).json({success: false, message: "Internal Server or DB error."})
  });
}

function getProductListSeller(req, res) {
  const seller_id = req.body.seller_id;
  models.sequelize.query(`SELECT * FROM products WHERE seller_id=${seller_id};`)
  .then(result => {
    if (result[0].length > 0) {
      return res.status(200).json({success: true, data: result[0]});
    } else {
      return res.status(403).json({success: false, message: "no data."});
    }
  }).catch(err => {
    return res.status(500).json({success: false, message: "Internal Server or DB error."});
  });
}

function verifyBarcode(req, res) {
  const barcode = req.body.barcode;
  request.get({uri:`https://www.beepscan.com/barcode/${barcode}`}, function (error, response, body) {
    const $ = cheerio.load(body);
    const product_name = $("div.container b").text();
    const img_url = $("img").last().attr('src');
    return res.status(200).json({success: true, data: {product_name: product_name, img_url: img_url}});
  });
}

function makePayment(req, res) {
  const {buyer_id, seller_id, product_id, price, count} = req.body;
  const query = `INSERT INTO transactions (buyer_id, seller_id, product_id, price, count)
   VALUES('${buyer_id}', '${seller_id}', ${product_id}, ${price}, ${count})`;

  models.sequelize.query(query).then(result => {
    const query_select = `SELECT * FROM products WHERE product_id=${product_id}`;
    models.sequelize.query(query_select).then(result => {
      if (result[0].length > 0) {
        let new_count = result[0][0].count - count;
        new_count = (new_count < 0) ? 0 : new_count;
        const query_update = `UPDATE products SET count=${new_count} WHERE product_id=${product_id}`;
        models.sequelize.query(query_update).then(result => {
          return res.status(200).json({success: true, message: "Payment succeed."});
        })
      } else {
        return res.status(403).json({success: false, message: "Critical Error: No Product_id matched."});
      }
    })
  }).catch(err => {
    return res.status(500).json({success: false, message: "Internal Server or DB Error."});
  });
}

// 거리순 가게 리스트 리턴
function getNearStore(req, res) {
  const {ulat, ulng} = req.body;
  const query = `SELECT * FROM stores`;

  models.sequelize.query(query).then(result => {
    const storeList = [];
    const calFunction = function (item) {
      const p = 0.017453292519943295; // Math.PI / 180
      const c = Math.cos;
      let a = 0.5 - c((item.lat - ulat) * p) / 2
              + c(ulat * p) * c(item.lat * p)
              * (1 - c((item.lng - ulng) * p)) / 2;
      let result = 12742 * Math.asin(Math.sqrt(a));
      item['distance'] = Math.floor(result*1000) + 'm';
      storeList.push(item);
      return new Promise(resolve => setTimeout(() => resolve(), 100));
    }

    var actions = result[0].map(calFunction);
    Promise.all(actions).then(() => {
      // 거리순 정렬
      storeList.sort(function(a, b) {
        return (a.distance < b.distance) ? -1 : (a.distance > b.distance) ? 0 : 1;
      });
      setTimeout(() => {return res.status(200).json({success: true, data: storeList});}, 100);
    }).catch(err => {
      return res.status(500).json({success: false, message: 'Internal Server or DB error.'});
    });
  }).catch(err => {
    return res.status(500).json({success: false, message: 'Internal Server or DB error.'});
  });
}

// 가게 검색



module.exports = {
  getBuyerInfo: getBuyerInfo,
  registerBuyer: registerBuyer,
  registerSeller: registerSeller,
  registerStore: registerStore,
  registerProduct: registerProduct,
  getProductListBuyer: getProductListBuyer,
  getProductListSeller: getProductListSeller,
  verifyBarcode: verifyBarcode,
  deleteProduct: deleteProduct,
  makePayment: makePayment,
  getNearStore: getNearStore
}

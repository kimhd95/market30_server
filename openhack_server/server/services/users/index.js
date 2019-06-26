const models = require('../../models');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const crypto = require('crypto');

const timeGapToCheckMedicineCheckConnection = 1000 * 60* 30 // 30 minutes.

function now(date) {
    const m = date.getMonth()+1;
    const d = date.getDate();
    const h = date.getHours();
    const i = date.getMinutes();
    const s = date.getSeconds();
    // return date.getFullYear()+'-'+(m>9?m:'0'+m)+'-'+(d>9?d:'0'+d)+' '+(h>9?h:'0'+h)+':'+(i>9?i:'0'+i)+':'+(s>9?s:'0'+s);
    return date.getFullYear()+'-'+m+'-'+d+' '+h+':'+i+':'+s;
}

function getUsers(req, res) {
    models.User.findAll({
    }).then(result => {
        res.json(result);
    })
}

function getUserWithId(req, res) {
    models.User.findOne({
        where: {
            kakao_id: req.body.kakao_id
        }
    }).then(result => {
        res.json(result);
    })
}

module.exports = {
    getUsers: getUsers,
    getUserWithId: getUserWithId,

    // Below methods requires APIKey.
}

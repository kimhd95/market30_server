const models = require('../../models');
const config = require('../../../configs');
const Op = models.sequelize.Op;
const crypto = require('crypto');
const moment = require('moment');
const arrayShuffle = require('array-shuffle');
const schedule = require('node-schedule');
const request = require('request');
const client = require('cheerio-httpcli');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const qs = require('qs');
const Hangul = require('hangul-js');
const nodemailer = require('nodemailer');

const param = {};
client.set('headers', {           // 크롤링 방지 우회를 위한 User-Agent setting
  'data-useragent' : 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36',
  'Accept-Charset': 'utf-8'
});

let closedown_scheduler = schedule.scheduleJob('20 4 1 * *', function() {
  console.log("**** closedown-scheduler EXECUTED ****");
  console.log("**** closedown-scheduler EXECUTED ****");
  console.log("**** closedown-scheduler EXECUTED ****");

  request('http://13.125.185.63:8000/verify_close', function (error, response, body) {
    if (error) {
      console.log('Error at closedown_scheduler : ' + error);
    } else {
      console.log(response.body);
    }
  });
});

let delete_nonmember_account_scheduler = schedule.scheduleJob('10 4 * * *', function() {
  console.log("**** delete_nonmember_account_scheduler EXECUTED ****");
  console.log("**** delete_nonmember_account_scheduler EXECUTED ****");
  console.log("**** delete_nonmember_account_scheduler EXECUTED ****");

  models.sequelize.query('DELETE FROM DEV_FOOD.users WHERE registered = -1 AND updated_at <= DATE_SUB(NOW(), INTERVAL 1 DAY);')
  .then(() => {
    console.log('delete_nonmember_account_scheduler SUCCEED.');
  })
  .catch(err => {
    console.log('delete_nonmember_account_scheduler HAS FAILED :: ', err);
  });
})
//var logger = require('../../config/winston');

function verifyToken (req, res) {
    const cookie = req.cookies || req.headers.cookie || '';
    const cookies = qs.parse(cookie.replace(/\s/g, ''), { delimiter: ';' });
    let token = cookies.token;
    let onetime = cookies.onetime;
    const secret = config.jwt_secret;

    console.log(`cookie: ${cookie}`);
    console.log(`token: ${token}`);
    console.log(`onetime: ${onetime}`);
    if (token) {
        console.log('token given.');

        jwt.verify(token, secret, (err, decoded) => {
            if (err) {
                res.clearCookie('token');
                res.clearCookie('onetime');
                return res.status(403).json({ success: false, message: 'Failed to authenticate token. err: ' + err.message });
            } else {
                models.User.findOne({
                    where: {
                        email: decoded.email
                    }
                }).then(user => {
                    if(onetime === '1') {
                      return res.status(403).json({success: false, message: 'One time user.'})
                    } else {
                      return res.status(200).json({success: true, message: 'Token verified.', email: user.email, name: user.name, redirect: '/lobby'})
                    }
                }).catch(function (err){
                    return res.status(403).json({success: false, message: 'Token verified, but new token cannot be assigned. err: ' + err.message})
                })
            }
        })
    } else {
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        })
    }
}

function checkTokenVerified (req, res, next){
    const cookie = req.cookies || req.headers.cookie || '';
    const cookies = qs.parse(cookie.replace(/\s/g, ''), { delimiter: ';' });
    let token = cookies.token;
    const secret = config.jwt_secret;

    // decode token
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, secret, function(err, decoded) {
            if (err) {
                return res.json({ success: false, message: 'Failed to authenticate token. err: ' + err.message });
            } else {
                // if everything is good, save decoded token payload to request for use in other routes
                console.log('Token verified.');
                // req.decoded 에 저장해두어야 이후 함수에서 refer 가능.
                req.decoded = decoded;
                next()
            }
        });
    } else {
        // return an error if there is no token
        return res.status(403).send({
            success: false,
            message: 'API call not allowed. No token provided.'
        });
    }
}

function registerUser (req, res) {
    const email = req.body.email || '';
    const password = req.body.password;
    const name = req.body.name;
    const gender = req.body.gender;
    const birthYear = req.body.birthYear;
    const phone = req.body.phone;

    // Check if email arrived
    if (!email.length) {
        return res.status(400).json({success: false, error: 'Email not given'});
    }

    // Validate Email Regex
    let re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!re.test(email)){
        return res.status(400).json({success: false, error: 'Incorrect email'})
    }

    // Check if password arrived
    if (!password.length) {
        return res.status(400).json({success: false, error: 'Password not given'});
    }

    // Check if password > 6 alphanumeric
    if(password.length < 8 ){
        return res.status(400).json({success: false, error: 'Password needs to be longer than 6 alphanumeric characters.'});
    }
    let pwNum = password.search(/[0-9]/g);
    let pwEng = password.search(/[a-z]/ig);
    let pwSpe = password.search(/[`~!@@#$%^&*|₩₩₩'₩";:₩/?]/gi);

    if((pwNum < 0 && pwEng < 0) || (pwNum < 0 && pwSpe < 0) || (pwEng < 0 && pwSpe < 0)) {
        return res.status(400).json({success: false, message: 'Password requires at least one character and one digit.'})
    }

    let SALT_FACTOR = 5;
    bcrypt.hash(password, SALT_FACTOR, (err, hash) => {
        if(err) {
            console.log('ERROR WHILE GENERATING PASSWORD', err);
        }
        console.log(hash);
        models.User.create({
            email: email,
            password: hash,
            name: name,
            gender: gender,
            birthYear: parseInt(birthYear),
            phone: phone,
            social: false,
        }).then(user => {
            return res.status(200).json({success: true, meesage: 'Ok'});
        }).catch(err => {
            if(err) res.status(500).json({
                success: false,
                message: 'Error while creating user row in db. check uniqueness of parameters'
            });
        });
    });
}

function loginOnetime (req, res) {
    const email = req.body.email;
    // const password = req.body.password;
    const secret = config.jwt_secret;

    if (!email) {
        return res.status(400).json({success: false, message: 'Email not given.'});
    }
    models.User.findOne({
        where: {
            email: email
        }
    }).then(user => {
        if(!user) {
            return res.status(403).json({success: false, message: 'No user account found with given email address.'});
        }
        jwt.sign({
                id: user.id,
                email: user.email,
                name: user.name
            },
            secret, {
                expiresIn: '7d',
                issuer: 'jellylab.io',
                subject: 'userInfo'
            }, (err, token, onetime ) => {
                console.log(`err: ${err}, token: ${token}, onetime : ${onetime}`);
                if(err) {
                    console.log(`err.message: ${err.message}`);
                    return res.status(403).json({
                        success: false,
                        message: err.message
                    });
                }
                console.log(`req.header.origin = ${req.header('origin')}`);

                const cookieMaxAge = 1000 * 60 * 60 * 24 * 7;

                if(req.header('origin') === undefined) {
                    console.log('req origin is undefined. Probably from postman.');
                    if(req.secure) {
                        console.log('req. is secure');
                        res.cookie('token', token, {maxAge: cookieMaxAge, secure: true});
                        res.cookie('onetime', '1', {maxAge: 900000, secure: false});
                    } else {
                        console.log('req is NOT secure');
                        res.cookie('token', token, {maxAge: cookieMaxAge, secure: false});
                        res.cookie('onetime', '1', {maxAge: 900000, secure: false});
                    }
                } else if(req.header('origin').includes('localhost')) {
                    console.log('req origin includes localhost OR it is from postman');
                    if(req.secure) {
                        console.log('req. is secure');
                        res.cookie('token', token, {maxAge: cookieMaxAge, secure: true});
                        res.cookie('onetime', '1', {maxAge: 900000, secure: false});
                    } else {
                        console.log('req is NOT secure');
                        res.cookie('token', token, {maxAge: cookieMaxAge, secure: false});
                        res.cookie('onetime', '1', {maxAge: 900000, secure: false});
                    }
                } else {
                    console.log('req origin does NOT include localhost');
                    if(req.secure) {
                        res.cookie('token', token, {maxAge: cookieMaxAge, secure: true});
                        res.cookie('onetime', '1', {maxAge: 900000, secure: false});
                    } else {
                        res.cookie('token', token, {maxAge: cookieMaxAge, secure: false});
                        res.cookie('onetime', '1', {maxAge: 900000, secure: false});
                    }
                }
                res.header('Access-Control-Allow-Credentials', 'true');
                return res.status(200).json({success: true, message: 'Ok', token: token, onetime: onetime, redirect: '/lobby', email: user.email, name: user.name});
            });
                // } else {
                //     return res.status(403).json({
                //         success: false,
                //         message: 'Password wrong'
                //     });
                // }
            }).catch(err => {
        console.log(`err.message: ${err.message}`);
        return res.status(403).json({
            success: false,
            message: `DB error. err: ${err.message}`
        })
    });
}

// 수정 필요.
function login (req, res) {
    const email = req.body.email;
    const password = req.body.password;
    const secret = config.jwt_secret;

    console.log(req.body.email);
    console.log(req.body.password);
    res.clearCookie('onetime');
    if (!email) {
        return res.status(400).json({success: false, message: 'Email not given.'});
    }
    models.User.findOne({
        where: {
            email: email
        }
    }).then(user => {
        if(!user) {
            return res.status(403).json({success: false, message: 'No user account found with given email address.'});
        }
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if(err) {
                return res.status(403).json({
                    success: false,
                    message: 'Error while login'
                });
            } else {
                if (isMatch) {
                    jwt.sign({
                            id: user.id,
                            email: user.email,
                            name: user.name
                        },
                        secret, {
                            expiresIn: '7d',
                            issuer: 'jellylab.io',
                            subject: 'userInfo'
                        }, (err, token) => {
                            console.log(`err: ${err}, token: ${token}`);
                            if(err) {
                                console.log(`err.message: ${err.message}`);
                                return res.status(403).json({
                                    success: false,
                                    message: err.message
                                });
                            }
                            console.log(`req.header.origin = ${req.header('origin')}`);

                            const cookieMaxAge = 1000 * 60 * 60 * 24 * 7;

                            if(req.header('origin') === undefined) {
                                console.log('req origin is undefined. Probably from postman.');
                                if(req.secure) {
                                    console.log('req. is secure');
                                    res.cookie('token', token, {maxAge: cookieMaxAge, secure: true});
                                } else {
                                    console.log('req is NOT secure');
                                    res.cookie('token', token, {maxAge: cookieMaxAge, secure: false});
                                }
                            } else if(req.header('origin').includes('localhost')) {
                                console.log('req origin includes localhost OR it is from postman');
                                if(req.secure) {
                                    console.log('req. is secure');
                                    res.cookie('token', token, {maxAge: cookieMaxAge, secure: true});
                                } else {
                                    console.log('req is NOT secure');
                                    res.cookie('token', token, {maxAge: cookieMaxAge, secure: false});
                                }
                            } else {
                                console.log('req origin does NOT include localhost');
                                if(req.secure) {
                                    res.cookie('token', token, {maxAge: cookieMaxAge, secure: true});
                                } else {
                                    res.cookie('token', token, {maxAge: cookieMaxAge, secure: false});
                                }
                            }
                            res.header('Access-Control-Allow-Credentials', 'true');
                            return res.status(200).json({success: true, message: 'Ok', token: token, name: user.name, email: user.email, redirect: '/lobby'});
                        });
                } else {
                    return res.status(403).json({
                        success: false,
                        message: 'Password wrong'
                    });
                }
            }
        });
    }).catch(err => {
        console.log(`err.message: ${err.message}`);
        return res.status(403).json({
            success: false,
            message: `DB error. err: ${err.message}`
        });
    });
}

function socialLogin (req, res) {
    const email = req.body.email;
    const name = req.body.name;
    const token = req.body.token;
    const social = true;

    if (token) {
        models.User.findOne
        ({
            where: {
                email: email
            }
        }).then(user => {
            if (user) {
                if (user.social) {
                    return res.status(200).json({
                        success: true,
                        message: 'successfully social login',
                        redirect: '/lobby'
                    })
                } else {
                    return res.status(403).json({
                        success: false,
                        message: 'This email is Already signed up.',
                        redirect: '/'
                    });
                }
            } else {
                // DB에 등록
                models.User.create({
                    email: email,
                    name: name,
                    social: social,
                }).then(user => {
                    res.status(201).json({success: true, meesage: 'Ok', redirect: '/lobby'});
                }).catch(err => {
                    if(err) res.status(500).json({
                        success: false,
                        message: err.message,
                        log: 'Error while creating user row in db. check uniqueness of parameters'
                    });
                });
            }
        })
    } else {
        return res.status(403).send({
            success: false,
            message: 'No token given.'
        })
    }
}

function logout (req, res) {
    const cookie = req.cookie || req.headers.cookie || '';
    const cookies = qs.parse(cookie.replace(/\s/g, ''), { delimiter: ';' });
    let token = cookies.token;
    const secret = config.jwt_secret;

    if (token) {
        jwt.verify(token, secret, (err, decoded) => {
            if (err) {
                return res.status(401).json({ success: false, message: 'Failed to authenticate token. err: ' + err.message });
            } else {
                res.clearCookie('token');
                const aftertoken = cookies.token;
                return res.status(200).json({ success: true });
            }
        });
    } else {
        res.clearCookie('token');
        return res.status(403).send({
            success: false,
            message: 'No token given'
        });
    }
}

function sendNewPassword (req, res) {
    const email = req.body.email;

    models.User.findOne({
        where: {
            email: email
        }
    }).then(user => {
        if (!user) {
            return res.status(404).json({success: false, message: 'No user account with given email address found'})
        } else {
            let newPassword = '';
            let SALT_FACTOR = 5;
            new Promise((resolve, reject) => {
                for (let i = 0; i < 9; i++) {
                    let rndVal = parseInt(Math.random() * 62);
                    if (rndVal < 10) newPassword += rndVal;
                    else if (rndVal > 35) newPassword += String.fromCharCode(rndVal + 61);
                    else newPassword += String.fromCharCode(rndVal + 55);
                }
            }).then(() => {
                console.log(newPassword);
            })
            bcrypt.hash(newPassword, SALT_FACTOR, function(err, hash) {
                if (err) {
                    return res.status(500).json({success: false, message: 'ERROR WHILE GENERATING PASSWORD'})
                }
                user.password = hash;
                user.save().then(_ => {
                    let transporter = nodemailer.createTransport({
                        service:'gmail',
                        auth: {
                            type: 'OAuth2',
                            user: 'support@jellylab.io',
                            clientId: '732880438602-u5pbho778b6i4bsvig2ma7v13n7hk4nb.apps.googleusercontent.com', //환경변수로 설정해 놓는 것을 권장합니다.
                            clientSecret: '6-XLCJjd-AWJ-qYkkBOO-CUr', //환경변수로 설정해 놓는 것을 권장합니다.
                            refreshToken: '1/jU0ghdET2MC5LMmJ0FpyG1CJRQNWGcmJ20Jvwh0pW-c', //환경변수로 설정해 놓는 것을 권장합니다.
                            accessToken: 'ya29.GlsOBsVLRfET8HR609HWOO65krRrwAJUFXbyROg6mrIG91NBFWL6sN3wz0KP71zp1LkxMQXKNcUf8RoLV-PnFkRIni-vA75BWLfXz2REQQVzmTxy4d_1IdmUpIGi', //환경변수로 설정해 놓는 것을 권장합니다.
                            expires: 3600
                        }
                    });
                    let mailOptions = {
                        from: '젤리랩 <support@jellylab.io>',
                        to: `${email}`,
                        subject: '변경된 임시 비밀번호를 전달해드립니다.',
                        html: `변경된 임시 비밀번호는 <b>${newPassword}</b>입니다. 임시 비밀번호로 로그인 후 비밀번호를 변경하여 이용 부탁드립니다.`
                    }

                    transporter.sendMail(mailOptions, function(err, info) {
                        if ( err ) {
                            console.error('Send Mail error : ', err);
                        } else {
                            console.log('Message sent : ', info);
                            return res.status(200).json({ success: true });
                        }
                    });
                })
            })
        }
    }).catch(err => {
        return res.status(403).json({success: false, message: 'Unknown outer catch error. err: ' + err.message})
    })
}

function sendInquiry (req, res) {
    const email = req.body.email;
    const name = req.body.name;
    const subject = req.body.subject;
    const message = req.body.message;

    models.User.findOne({
        where: {
            email: email
        }
    }).then(user => {
        if (!user) {
            return res.status(403).json({ success: false, message: 'ERROR WHILE FIND EMAIL'})
        } else {
            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: 'support@jellylab.io',
                    clientId: '732880438602-u5pbho778b6i4bsvig2ma7v13n7hk4nb.apps.googleusercontent.com', //환경변수로 설정해 놓는 것을 권장합니다.
                    clientSecret: '6-XLCJjd-AWJ-qYkkBOO-CUr', //환경변수로 설정해 놓는 것을 권장합니다.
                    refreshToken: '1/jU0ghdET2MC5LMmJ0FpyG1CJRQNWGcmJ20Jvwh0pW-c', //환경변수로 설정해 놓는 것을 권장합니다.
                    accessToken: 'ya29.GlsOBsVLRfET8HR609HWOO65krRrwAJUFXbyROg6mrIG91NBFWL6sN3wz0KP71zp1LkxMQXKNcUf8RoLV-PnFkRIni-vA75BWLfXz2REQQVzmTxy4d_1IdmUpIGi', //환경변수로 설정해 놓는 것을 권장합니다.
                    expires: 3600
                }
            });

            let mailOptions = {
                from: `${email}`,
                to: 'support@jellylab.io',
                subject: subject,
                html: `<b>보낸이: ${name} ${email}</b><br><br>${message}`
            }

            transporter.sendMail(mailOptions, function(err, info) {
                if (err) {
                    console.error('Send Mail error : ', err);
                    return res.status(403).json({ success: false, message: err })
                } else {
                    console.log('Message sent : ', info);
                    return res.status(200).json({ success: true })
                }
            })
        }
    }).catch(errr => {
        return res.status(403).json({ success: false, message: 'Unknown outer catch error. err: ' + err.message })
    })
}
function memberWithdraw (req, res) {
    const cookie = req.cookie || req.headers.cookie || '';
    const cookies = qs.parse(cookie.replace(/\s/g, ''), { delimiter: ';' });
    let token = cookies.token;
    const secret = config.jwt_secret;

    const email = req.body.email;
    const password = req.body.password;
    console.log(req.headers);

    if (token) {
        jwt.verify(token, secret, (err, decoded) => {
            if (err) {
                return res.status(401).json({ success: false, message: 'Failed to authenticate token. err: ' + err.message });
            } else {
                if (!email) return res.status(400).json({ success: false, message: 'Email not provided.'});
                models.User.find({
                    where: {
                        email: email
                    }
                }).then(user => {
                    if (!user) {
                        return res.status(403).json({ success: false, message: 'No user account with given email address found'})
                    } else {
                        // 소셜 로그인
                        if (user.social) {
                            models.User.destroy({
                                where: {
                                    email: email
                                }
                            }).then(result => {
                                console.log('User destroy result: ' + result);

                                if (result === 0) {
                                    return res.status(403).json({ success: false, message: 'User email and '})
                                } else {
                                    res.clearCookie('token');
                                    return res.status(200).json({ success: true, message: 'User account successfully deleted.', redirect: '/'});
                                }
                            }).catch(err => {
                                return res.status(403).json({ success: false, message: 'Unknown inner catch error on User destroy. err: ' + err.message});
                            })
                            // 일반 로그인
                        } else {
                            bcrypt.compare(password, user.password, (err, isMatch) => {
                                if (err) {
                                    return res.status(403).json({success: false, message: 'The given password does not match with the account password.' })
                                } else {
                                    if (isMatch) {
                                        models.User.destroy({
                                            where: {
                                                email: email,
                                                password: user.password
                                            }
                                        }).then(result => {
                                            console.log('User destroy result: ' + result);

                                            if (result === 0) {
                                                return res.status(403).json({ success: false, message: 'User email and password match. but somehow the delete failed.'});
                                            } else {
                                                res.clearCookie('token');
                                                return res.status(200).json({ success: true, message: 'User account successfully deleted.', redirect: '/'});
                                            }
                                        }).catch(err => {
                                            return res.status(403).json({ success: false, message: 'Unknown inner catch error on Doctor.destroy. err: ' + err.message});
                                        })
                                    } else {
                                        return res.status(403).json({ success: false, message: 'User email and password not match.'});
                                    }
                                }
                            })
                        }
                    }
                }).catch(err => {
                    return res.status(403).json({ success: false, message: 'Unknown outer catch error on User destroy. err: ' + err.message});
                })
            }
        })
    } else if (email && !password) {
      // SNS 로그인일 경우 탈퇴처리
      models.User.destroy({
          where: {
              email: email
          }
      }).then(result => {
          if (result === 0) {
              return res.status(403).json({ success: false, message: 'User email match. but somehow the delete failed.'});
          } else {
              console.log("Delete Email: ", email);
              return res.status(200).json({ success: true, message: 'User account successfully deleted.', redirect: '/'});
          }
      }).catch(err => {
          return res.status(403).json({ success: false, message: 'Unknown inner catch error on Doctor.destroy. err: ' + err.message});
      })
    } else {
        res.clearCookie('token');
        return res.status(403).send({ success: false, message: 'No token given.' });
    }

}

function updatePassword (req, res) {
    const email = req.body.email;
    const curPassword = req.body.curPassword;
    const newPassword = req.body.newPassword;

    if (!email) return res.status(400).json({success: false, message: 'email not provided.'});

    // Check if newPassword arrived
    if (!newPassword.length) {
        return res.status(400).json({success: false, message: 'newPassword not given'});
    }

    // Check if newPassword > 8 alphanumeric
    if( newPassword.length < 8 ){
        return res.status(400).json({success: false, message: 'newPassword needs to be longer than 8 alphanumeric characters.'});
    }

    // Check if newPassword > 8 alphanumeric
    let pwNum = newPassword.search(/[0-9]/g);
    let pwEng = newPassword.search(/[a-z]/ig);
    let pwSpe = newPassword.search(/[`~!@@#$%^&*|₩₩₩'₩";:₩/?]/gi);
    let letter = /[a-zA-Z]/;
    let number = /[0-9]/;
    let valid = (pwNum < 0 && pwEng < 0) || (pwNum < 0 && pwSpe < 0) || (pwEng < 0 && pwSpe < 0) //match a letter _and_ a number
    if (valid){
        return res.status(400).json({success: false, message: 'newPassword requires at least one character and one digit.'})
    }

    models.User.findOne({
        where: {
            email: email
        }
    }).then(user => {
        if (!user) {
            return res.status(404).json({error: 'No user with given email address.'});
        }

        bcrypt.compare(curPassword, user.password, function(err, isMatch) {
            if(err) {
                return res.status(403).json({success: false, message: 'encryption error'})
            } else {
                if(isMatch) {
                    let SALT_FACTOR = 5;
                    bcrypt.hash(newPassword, SALT_FACTOR, function(err, hash) {
                        if(err) {
                            console.log('ERROR WHILE GENERATING PASSWORD',err);
                            return res.status(403).json({success: false, message: 'ERROR WHILE GENERATING PASSWORD'})
                        }
                        user.password = hash;
                        user.save().then(_ => {
                            return res.status(200).json({success: true, message: 'Password successfully updated.'})
                        })
                    });
                } else {
                    return res.status(403).json({success: false, message: 'Given current password is wrong.'})
                }
            }
        });
    });
}

function updateUser (req, res) {
    console.log('updateUser called.');
    let kakao_id;
    if (req.body) {
        kakao_id = req.body.kakao_id;
        if (!kakao_id) {
            return res.status(401).json({success: false, message: 'kakao_id not provided.'})
        }
    } else {
        return res.status(401).json({success: false, message: 'No input parameters received in body.'})
    }

    const {name, birthday, sex, hate_food, vegi, snack, serving_size, disease, diet, alone_level, job, register,
            subway, exit_quarter, rest_final, lat, lng, mid_lat, mid_lng, cnt, limit_cnt, mood2, with_mood, taste,
            food_type, chat_log, freq_subway, drink_before, drink_type, drink_round, limit_cnt_drink, cafe_before,
            limit_cnt_cafe, mood1, subway_cafe, freq_subway_cafe, mainmenu_type, food_name, price_lunch, price_dinner,
            cafe_final, stack, state, scenario} = req.body;

    if (name) {
        // models.Medicine_time.create({
        //     kakao_id: kakao_id,
        //     encrypted_kakao_id: kakao_id,
        //     slot: 0,
        //     time: 5
        // });
        //
        // models.Medicine_time.create({
        //     kakao_id: kakao_id,
        //     encrypted_kakao_id: kakao_id,
        //     slot: 1,
        //     time: 12
        // });
        //
        // models.Medicine_time.create({
        //     kakao_id: kakao_id,
        //     encrypted_kakao_id: kakao_id,
        //     slot: 2,
        //     time: 17
        // });

        models.User.update({
            registered: 0,
            encrypted_kakao_id: kakao_id //todo: 카카오아이디 암호화
        }, {
            where: {
                kakao_id: kakao_id
            } // Condition
        }).then(result => {
            console.log('result: ' + result.toString())
            if (result){
                return res.status(200).json({success: true, message: 'Update registered complete. Result: ' + result.toString()})
            } else {
                return res.status(403).json({success: true, message: 'No user found to update or User does not exist with given kakao_id. ' +
                    + result.toString()})
            }
        }).catch(function (err){
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
        })

    }

    let param_name;
    let param_value;
    if (name){
        param_name = 'name';
        param_value = name;
    } else if (chat_log) {
        param_name = 'chat_log';
        if (String(chat_log).length > 1000000) {
          chat_log = null;
        }
        param_value = chat_log;
    } else if (birthday) {
        param_name = 'birthday';
        param_value = birthday;
    } else if (sex) {
        param_name = 'sex';
        param_value = sex;
    } else if (hate_food){
        param_name = 'hate_food';
        param_value = hate_food;
    } else if (vegi){
        param_name = 'vegi';
        param_value = vegi;
    } else if (snack) {
        param_name = 'snack';
        param_value = snack;
    }  else if (serving_size) {
        param_name = 'serving_size';
        param_value = serving_size;
    } else if (disease){
        param_name = 'disease';
        param_value = disease;
    } else if (diet){
        param_name = 'diet';
        param_value = diet;
    } else if (alone_level){
        param_name = 'alone_level';
        param_value = alone_level;
    } else if (job){
        param_name = 'job';
        param_value = job;
    } else if (subway){
        param_name = 'subway';
        param_value = subway;
    } else if (exit_quarter){
        param_name = 'exit_quarter';
        param_value = exit_quarter;
    } else if (rest_final){
        param_name = 'rest_final';
        param_value = rest_final;
    } else if (lat){
        param_name = 'lat';
        param_value = lat;
    } else if (lng){
        param_name = 'lng';
        param_value = lng;
    } else if (mid_lat){
        param_name = 'mid_lat';
        param_value = mid_lat;
    } else if (mid_lng){
        param_name = 'mid_lng';
        param_value = mid_lng;
    } else if (cnt){
        param_name = 'cnt';
        param_value = cnt;
    } else if(limit_cnt){
        param_name = 'limit_cnt';
        param_value = limit_cnt;
    } else if(mood2){
        param_name = 'mood2';
        param_value = mood2;
    } else if(mood1){
        param_name = 'mood1';
        param_value = mood1;
    } else if(with_mood) {
        param_name = 'with_mood';
        param_value = with_mood;
    } else if(taste){
        param_name = 'taste';
        param_value = taste;
    } else if(food_type){
        param_name = 'food_type';
        param_value = food_type;
    } else if(freq_subway){
        param_name = 'freq_subway';
        param_value = freq_subway;
    } else if(drink_before){
        param_name = 'drink_before';
        param_value = drink_before;
    } else if(drink_type){
        param_name = 'drink_type';
        param_value = drink_type;
    } else if(drink_round){
        param_name = 'drink_round';
        param_value = drink_round;
    } else if(limit_cnt_drink){
        param_name = 'limit_cnt_drink';
        param_value = limit_cnt_drink;
    } else if(limit_cnt_cafe){
        param_name = 'limit_cnt_cafe';
        param_value = limit_cnt_cafe;
    } else if(cafe_before){
        param_name = 'cafe_before';
        param_value = cafe_before;
    } else if(mainmenu_type){
        param_name = 'mainmenu_type';
        param_value = mainmenu_type;
    } else if(subway_cafe){
        param_name = 'subway_cafe';
        param_value = subway_cafe;
    } else if(freq_subway_cafe){
        param_name = 'freq_subway_cafe';
        param_value = freq_subway_cafe;
    } else if(food_name){
        param_name = 'food_name';
        param_value = food_name;
    } else if(price_lunch){
        param_name = 'price_lunch';
        param_value = price_lunch;
    } else if(price_dinner){
        param_name = 'price_dinner';
        param_value = price_dinner;
    } else if (cafe_final){
        param_name = 'cafe_final';
        param_value = cafe_final;
    } else if (stack) {
        param_name = 'stack';
        param_value = stack;
    } else if (state) {
        param_name = 'state';
        param_value = state;
    } else if (scenario) {
        param_name = 'scenario';
        param_value = scenario;
    }

    console.log(`param_value : ${param_value}, param_name : ${param_name}`);
    if (param_name === 'chat_log') {

      // query = `UPDATE users SET chat_log = '${param_value}', chat_log_jellylab = '${param_value}' WHERE kakao_id = '${kakao_id}';`;
      // console.log("Query : " + query);
      models.User.update(
        {chat_log: param_value,
          chat_log_jellylab: param_value,
        },
           {where: {
             kakao_id: kakao_id}}).then(result => {
      //models.sequelize.query(`UPDATE users SET chat_log = '${param_value}', chat_log_jellylab = '${param_value}' WHERE kakao_id = '${kakao_id}';`).then(result => {
          if (result){
            if (param_name !== 'chat_log') {
              console.log('result: ' + result.toString() + '끝');
            }
              return res.status(200).json({success: true, message: 'user data updated. Result info: ' + result[0].info})
          } else {
              return res.status(403).json({success: false, message: 'user update query failed.'})
          }
      }).catch(function (err){
        return res.status(500).json({success: false, message: 'Internal Server or Database Error1. err: ' + err.message})
      })
    } else {
      if (param_value){
        if (param_value == 'null') {
          models.sequelize.query(`UPDATE users SET ${param_name} = NULL WHERE kakao_id = '${kakao_id}';`).then(result => {
              if (result){
                if (param_name !== 'chat_log') {
                  console.log('result: ' + result.toString() + '끝');
                }
                  return res.status(200).json({success: true, message: 'user data updated. Result info: ' + result[0].info})
              } else {
                  return res.status(403).json({success: false, message: 'user update query failed.'})
              }
          }).catch(function (err){
            return res.status(500).json({success: false, message: 'Internal Server or Database Error2. err: ' + err.message})
          })
        } else {
          models.sequelize.query(`UPDATE users SET ${param_name} = '${param_value}' WHERE kakao_id = '${kakao_id}';`).then(result => {
              if (result){
                if (param_name !== 'chat_log') {
                  console.log('result: ' + result.toString() + '끝');
                }
                  return res.status(200).json({success: true, message: 'user data updated. Result info: ' + result[0].info})
              } else {
                  return res.status(403).json({success: false, message: 'user update query failed.'})
              }
          }).catch(function (err){
            return res.status(500).json({success: false, message: 'Internal Server or Database Error3. err: ' + err.message})
          })
        }
        //  models.sequelize.query('UPDATE users SET ' + param_name + " = '" + param_value + "' WHERE kakao_id = '" + kakao_id + "';").then(result => {
      } else {
          return res.status(401).json({success: false, message: 'No parameter given. Please check again. Required: kakao_id. ' +
              'And one more parameter is required among name, initials, user_code, email, phone, sex, birthday'})
      }
    }
}

function getRestaurantSubway (req, res) {
  // req.body : {subway: }
  // res.body : {id: , res_name: };
  const subway = req.body.subway;
  console.log("SUBWAY: ", subway);

  let query = `SELECT id, address, res_name, subway FROM restaurants WHERE subway = '${subway}' AND closedown=0;`;
  models.sequelize.query(query).then(result => {
    return res.status(200).json({success: true, message: result[0]});
  }).catch(err => {
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
  })
}
function setRestaurantLatLng (req, res) {
  // req.body : data: {id: , lat: , lng}
  const data = req.body.message;
  console.log("Data: ", data);

  var fn = function distance(item) {
    let query = `UPDATE restaurants SET lat=${item.lat}, lng=${item.lng} WHERE id=${item.id}`;
    models.sequelize.query(query).then(result => {
      console.log("Update Success.");
    }).catch(err => {
      console.log("Update Fail.");
    })
    return new Promise(resolve => setTimeout(() => resolve("ok"), 100));
  }

  var actions = data.map(fn);
  Promise.all(actions).then(() => {
    console.log("Update Finish.");
    res.status(200).json({success: true, message: 'update complete.'});
  }).catch(err => {
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
  });
}

/* Django서버에서 restaurants id, closedown값 받아서 Update */
function updateClosedown (req, res) {
  const data = req.body;
  console.log("* * * updateClosedown EXECUTED.");
  console.log("Data: ", data);
  let query = `UPDATE restaurants SET closedown=1 WHERE res_name='${data.res_name}' and subway='${data.subway}';`;

  models.sequelize.query(query).then(() => {
    console.log(`Update Success. [${data.subway} ${data.res_name}]`);
    return res.status(200).json({success: true, message: 'update complete'});
  }).catch(err => {
    console.log("Update Fail : ", err);
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
  })
}

function getNearRestaurant (req, res) {
  let {hate_food, price_lunch, price_dinner, lat, lng} = req.body;
  let taste_flag = food_type_flag = '';

  if (price_dinner === 'x') { //점심식사
    price_dinner = null;
  }
  if (price_lunch === 'x') { //저녁식사
    price_lunch = null;
  }

  let query = `SELECT *
               FROM restaurants
               WHERE closedown=0 AND
                     NOT (MATCH(drink_round) AGAINST('1,2,3' IN BOOLEAN MODE)) AND
                     (lat - ${lat} < 0.1 AND lat - ${lat} > -0.1) AND
                     (lng - ${lng} < 0.1 AND lng - ${lng} > -0.1)`;
  if (price_lunch) { query += ` AND (MATCH(price_lunch) AGAINST('${price_lunch}' IN BOOLEAN MODE))`; }
  if (price_dinner) { query += ` AND (MATCH(price_dinner) AGAINST('${price_dinner}' IN BOOLEAN MODE))`; }
  if (hate_food) { query += ` AND NOT (MATCH(food_name) AGAINST('${hate_food}' IN BOOLEAN MODE))
                              AND NOT (MATCH(taste) AGAINST('${hate_food}' IN BOOLEAN MODE))`; }
  query += `;`;
  console.log(query);

  models.sequelize.query(query).then(result => {
    let list = result[0];
    let resultList = [];
    if (list.length > 1) {
      var fn = function distance(item) {
        const p = 0.017453292519943295; // Math.PI / 180
        const c = Math.cos;
        let a = 0.5 - c((item.lat - lat) * p) / 2
                + c(lat * p) * c(item.lat * p)
                * (1 - c((item.lng - lng) * p)) / 2;
        let result = 12742 * Math.asin(Math.sqrt(a));

        if (result < 0.5) {
          console.log(item.subway + item.res_name + ' >> ' + Math.floor(result*1000)+'m');
          item['distance'] = Math.floor(result*1000);   // 거리 추가
          resultList.push(item);
        }
        return new Promise(resolve => setTimeout(() => resolve("ok"), 100));
      }

      var actions = list.map(fn);
      Promise.all(actions).then(() => {
        if (resultList.length >= 2) {
          const shuffled = resultList.sort(() => 0.5 - Math.random());
          const rand_pick = shuffled.slice(0, 2);
          return res.status(200).json({success: true, num: resultList.length, message: rand_pick});
        } else {
          res.status(200).json({success: false, num: resultList.length, message: 'no result.'});
        }
      }).catch(err => {
        return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
      });
    } else {
      res.status(200).json({success: false, message: 'no result.'});
    }

  }).catch(err => {
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
  });
}

function getRestaurant (req, res) {
  let {subway, exit_quarter, mood2, food_type, taste, hate_food, food_name, price_lunch, price_dinner} = req.body;
  let taste_flag = food_type_flag = '';

  if (exit_quarter == '999') {
    exit_quarter = null;
  }
  if (price_dinner === 'x') { //점심식사
    price_dinner = null;
  }
  if (price_lunch === 'x') { //저녁식사
    price_lunch = null;
  }
  // 일상적인 식사일 경우에는 mood2 고려 안 함
  // 일상적인 식사가 아닌 경우에는 keyword를 공백을 두어 문자열로 만듦
  if (mood2 === '999' || mood2 === '998') {
    mood2 = null;
  }
  // !-가벼운 == 헤비한 이므로, 예를 들어 헤비한 음식을 고른 경우에는 flag를 not으로 만들어서 가벼운 음식을 제외
  if (taste.includes('!-')) {
    taste = taste.replace('!-','');
    taste_flag = 'NOT';
  } else if (taste === 'all') {
    taste = null;
  }

  if (food_type === '이국적') {
    food_type = '한식 일식 중식 양식';
    food_type_flag = 'NOT';
  } else if (food_type === 'all') {
    food_type = null;
  }

  let food_name_condition = '';
  if (food_name === 'x') {
    food_name = null;
  } else if (food_name) {
    let food_name_leng = food_name.split(',').length;
    if (food_name.includes(',')) {
      food_name_condition = `(food_name LIKE ("%${food_name.split(',')[0]}%")`;
      for (let i = 1; i < food_name_leng; i++) {
        food_name_condition += ` OR food_name LIKE ("%${food_name.split(',')[i]}%")`;
      }
      food_name_condition += ')';
    } else {
      food_name_condition = `food_name LIKE ("%${food_name}%")`;
    }
  }

  let query = `SELECT *
               FROM restaurants
               WHERE closedown=0 AND
                     NOT (MATCH(drink_round) AGAINST('1,2,3' IN BOOLEAN MODE))`;
  if (subway) { query += ` AND subway = '${subway}'`; }
  if (exit_quarter) { query += ` AND exit_quarter IN (${exit_quarter})`; }
  if (price_lunch) { query += ` AND (MATCH(price_lunch) AGAINST('${price_lunch}' IN BOOLEAN MODE))`; }
  if (price_dinner) { query += ` AND (MATCH(price_dinner) AGAINST('${price_dinner}' IN BOOLEAN MODE))`; }
  if (mood2) { query += ` AND (MATCH(mood2) AGAINST('${mood2}' IN BOOLEAN MODE))`; }
  if (food_name) { query += ` AND ${food_name_condition}`; }
  if (hate_food) { query += ` AND NOT (MATCH(food_name) AGAINST('${hate_food}' IN BOOLEAN MODE))`; }
  if (taste) { query += ` AND ${taste_flag} (MATCH(taste) AGAINST('"${taste}" -${hate_food}' IN BOOLEAN MODE))`; }
  if (food_type) { query += ` AND ${food_type_flag} (MATCH(food_type) AGAINST('${food_type}' IN BOOLEAN MODE))`; }
  query += ` ORDER BY RAND();`;
  console.log(query);

  models.sequelize.query(query).then(result => {
    if (result[0].length >= 2) {
      return res.status(200).json({success: true, try: 1, num:result[0].length, message: result[0].slice(0, 2)})
    } else {
      if (!exit_quarter || exit_quarter == '1,2,3,4') {
        return res.status(200).json({success: false, message: 'no result.'})
      } else {
        let query_next = `SELECT *
                          FROM restaurants
                          WHERE closedown=0 AND
                                NOT (MATCH(drink_round) AGAINST('1,2,3' IN BOOLEAN MODE))`;
        if (subway) { query_next += ` AND subway = ${subway}`; }
        if (price_lunch) { query_next += ` AND (MATCH(price_lunch) AGAINST('${price_lunch}' IN BOOLEAN MODE))`; }
        if (price_dinner) { query_next += ` AND (MATCH(price_dinner) AGAINST('${price_dinner}' IN BOOLEAN MODE))`; }
        if (mood2) { query_next += ` AND (MATCH(mood2) AGAINST('${mood2}' IN BOOLEAN MODE))`; }
        if (food_name) { query_next += ` AND ${food_name_condition}`; }
        if (hate_food) { query_next += ` AND NOT (MATCH(food_name) AGAINST('${hate_food}' IN BOOLEAN MODE))`; }
        if (taste) { query_next += ` AND ${taste_flag} (MATCH(taste) AGAINST('"${taste}" -${hate_food}' IN BOOLEAN MODE))`; }
        if (food_type) { query_next += ` AND ${food_type_flag} (MATCH(food_type) AGAINST('${food_type}' IN BOOLEAN MODE))`; }
        query_next += `ORDER BY RAND();`;
        console.log(query_next);
        models.sequelize.query(query_next).then(second_result => {
          if (second_result[0].length >= 2) {
            return res.status(200).json({success: true, try: 2, num: second_result[0].length, message: second_result[0].slice(0, 2)})
          } else {
            return res.status(200).json({success: false, message: 'no result.'})
          }
        }).catch( err => {
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
        });
      }
    }
  }).catch(err => {
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
  });
}

function verifyResultExist (req, res) {
  let {subway, hate_food, price_lunch, price_dinner, taste_list} = req.body;

  if (price_dinner === 'x') { //점심식사
    price_dinner = null;
  }
  if (price_lunch === 'x') { //저녁식사
    price_lunch = null;
  }

  let query = `SELECT *
               FROM restaurants
               WHERE closedown=0 AND
                     NOT (MATCH(drink_round) AGAINST('1,2,3' IN BOOLEAN MODE))`;
  if (subway) { query += ` AND subway = '${subway}'`; }
  if (price_lunch) { query += ` AND (MATCH(price_lunch) AGAINST('${price_lunch}' IN BOOLEAN MODE))`; }
  if (price_dinner) { query += ` AND (MATCH(price_dinner) AGAINST('${price_dinner}' IN BOOLEAN MODE))`; }
  if (hate_food) { query += ` AND NOT (MATCH(food_name) AGAINST('${hate_food}' IN BOOLEAN MODE))`; }
  query += ` AND `;

  let verifyResult = [];
  var exeQuery = function(taste) {
    const newQuery1 = query + `(match(taste) against('"${taste.option1}" -${hate_food}' in boolean mode)) LIMIT 2;`;
    const newQuery2 = query + `(match(taste) against('"${taste.option2}" -${hate_food}' in boolean mode)) LIMIT 2;`;

    models.sequelize.query(newQuery1).then(result => {
      let i = taste_list.indexOf(taste);
      if (result[0].length === 2) {                           // 1-1 있
        models.sequelize.query(newQuery2).then(result => {
          if (result[0].length === 2) {
            verifyResult.push({'index': i, 'valid': true});
          }  // 1-2 있
          else {
            verifyResult.push({'index': i, 'valid': false});
          }                        // 1-2 없
        }).catch( err => {
          return new Promise(reject => setTimeout(() => reject(err), 100));
        });
      } else {                                                // 1-1 없
        verifyResult.push({'index': i, 'valid': false});
      }
    }).catch( err => {
      return new Promise(reject => setTimeout(() => reject(err), 100));
    });
    return new Promise(resolve => setTimeout(() => resolve("ok"), 200));
  }

  var applyAll = taste_list.map(exeQuery);

  Promise.all(applyAll).then(() => {
    console.log("verifyResult : ", verifyResult);
    return res.status(200).json({success: true, valid: verifyResult});
  })
}

function getTwoRestaurant (req, res) {
    const kakao_id = req.body.kakao_id;
    const rest1 = req.body.rest1;
    const rest2 = req.body.rest2;

    models.sequelize.query(`SELECT * FROM restaurants WHERE id='${rest1}' UNION ALL SELECT * FROM restaurants WHERE id='${rest2}';`)
    .then(result => {
      if (result) {
        return res.status(200).json({success: true, message: result[0]})
      } else {
        return res.status(403).json({success: false, message: 'user update query failed.'})
      }
    })
    .catch(function (err) {
      return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    });
}

function getAllHistory (req, res) {
    const kakao_id = req.body.kakao_id;

    models.User.findOne({
        attributes: ['email'],
        where: {
            kakao_id: kakao_id
        }
    }).then(user_email => {
      if(user_email) {
        models.sequelize.query(`SELECT * FROM decide_histories WHERE email = '${user_email.email}' ORDER BY id DESC;`)
        .then(result => {
            if (result) {
                return res.status(200).json({success: true, message: result[0]})
            } else {
                return res.status(403).json({success: false, message: 'user update query failed.'})
            }
        })
        .catch(function (err){
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
        });
      }
      else {
        return res.status(401).json({message: 'Cant find user email : ' + err.message})
      }
    }).catch(err => {
        return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    });
}

function getSubwayHistory (req, res) {
    const kakao_id = req.body.kakao_id;
    const subway = req.body.subway;

    models.User.findOne({
        attributes: ['email'],
        where: {
            kakao_id: kakao_id
        }
    }).then(user_email => {
      if(user_email){
        models.sequelize.query('SELECT * FROM decide_histories WHERE email = '+"'"+user_email.email+"'"+' AND subway = '+"'"+subway+"'"+' ORDER BY id;')
        .then(result => {
            if (result) {
                return res.status(200).json({success: true, message: result[0]})
            } else {
                return res.status(403).json({success: false, message: 'no result'})
            }
        })
        .catch(function (err) {
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
        });
      }
      else {
        return res.status(401).json({message: 'Cant find user email : ' + err.message})
      }
    }).catch(err => {
        return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    });
}

function getCountHistory (req, res) {
    const kakao_id = req.body.kakao_id;

    models.User.findOne({
        attributes: ['email'],
        where: {
            kakao_id: kakao_id
        }
    }).then(user_email => {
      if (user_email) {
        models.sequelize.query('SELECT *,count(*) as cnt FROM decide_histories WHERE email = '+"'"+user_email.email+"'"+' GROUP BY res_name ORDER BY cnt DESC;')
        .then(result => {
            if (result) {
                return res.status(200).json({success: true, message: result[0]});
            } else {
                return res.status(403).json({success: false, message: 'no result'});
            }
        })
        .catch(function (err) {
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
        });
      }
      else {
        return res.status(401).json({message: 'Cant find user email : ' + err.message});
      }
    }).catch(err => {
        return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
    });
}

function updateSocket (req, res) {
    const email = req.body.email
    const socket_id = req.body.socket_id;
    models.User.update(
        {
            kakao_id: socket_id,
        },     // What to update
        {where: {
                email: email},
                silent: true
        })  // Condition
        .then(result => {
          if (result) {
            return res.status(200).json({success: true, message: 'User Socket Update complete.', email: email});
          } else {
            return res.status(403).json({success: false, message: 'no result'});
          }
        }).catch(function (err) {
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
    })
}

function updatePartLog (req, res) {
    const chat_log = req.body.chat_log;
    const emailValue = req.body.email;
    const targetcol = req.body.col;

    if (String(chat_log).length > 1000000) {
      chat_log = null;
    }
    models.User.update(
        {
            [targetcol]: chat_log,
        },     // What to update
        {where: {
                email: emailValue},
                logging: false
        })  // Condition
        .then(result => {
          if (result) {
            return res.status(200).json({success: true, message: 'User Socket Update complete.'});
          } else {
            return res.status(403).json({success: false, message: 'no result'});
          }
        })
        .catch(function (err) {
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
    })
}


function updateChatLog (req, res) {
    const chat_log = req.body.chat_log;
    const socket_id = req.body.socket_id;

    if (String(chat_log).length > 1000000) {
      chat_log = null;
    }

    models.User.update(
        {
            chat_log: chat_log,
            chat_log_jellylab: chat_log,
        },     // What to update
        {where: {
                kakao_id: socket_id},
                logging: false
        })  // Condition
        .then(result => {
          if (result) {
            return res.status(200).json({success: true, message: 'User Socket Update complete.'});
          } else {
            return res.status(403).json({success: false, message: 'no result'});
          }
        })
        .catch(function (err) {
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
    })
}


function getUserInfo (req, res) {
    console.log('getUserInfo called.');
    const kakao_id = req.params.kakao_id;
    let nowDate = new Date();
    nowDate.getTime();
    const now = nowDate;

    if (kakao_id) {
        models.User.findOne({
            where: {
                kakao_id: kakao_id
            }
        }).then(user => {
            if (!user) {
                return res.status(403).json({success: false, message: 'user not found with kakao_id: ' + kakao_id});
            }
            models.UserLog.findAll({
                where: {
                    kakao_id: kakao_id
                },
                order: [
                    // Will escape username and validate DESC against a list of valid direction parameters
                    ['id', 'DESC']
                ]
            }).then(userLog => {
                console.log('userLog findAll finished.')
                if (userLog) {
                    //console.log(userLog);
                    models.User.update({
                        exit: 0,
                        //updated_at: now
                    }, {
                        where: {kakao_id: kakao_id} // Condition
                    })
                    return res.status(200).json({success: true, message: 'user and user_log both found.', user_info: user, user_log: userLog});
                } else {
                    // Return when no data found
                    return res.status(403).json({success: false, message: 'No userLog found with given kakao_id.'});
                }
            }).catch(function (err) {
              return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
            })
        }).catch(function (err) {
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
        })
    } else {
        return res.status(401).json({success: false, message: 'kakao_id not given.'});
    }
}

function getUserInfoByEmail (req, res) {
    console.log('getUserInfo called.')
    const email = req.params.email;
    let nowDate = new Date();
    nowDate.getTime();
    const now = nowDate;

    if (email) {
        models.User.findOne({
            where: {
                email: email
            }
        }).then(user => {
            if (!user) {
                return res.status(403).json({success: false, message: 'user not found with email: ' + email})
            }
            models.UserLog.findAll({
                where: {
                    email: email
                },
                order: [
                    // Will escape username and validate DESC against a list of valid direction parameters
                    ['id', 'DESC']
                ]
            }).then(userLog => {
                console.log('userLog findAll finished.')
                if (userLog) {
                    //console.log(userLog);
                    models.User.update({
                        exit: 0,
                        //updated_at: now
                    }, {
                        where: {email: email} // Condition
                    })
                    return res.status(200).json({success: true, message: 'user and user_log both found.', user_info: user, user_log: userLog})
                } else {
                    // Return when no data found
                    return res.status(403).json({success: false, message: 'No userLog found with given email.'})
                }
            }).catch(function (err) {
              return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
            })
        }).catch(function (err) {
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
        })
    } else {
        return res.status(401).json({success: false, message: 'email not given.'})
    }
}

function getRestaurantInfo (req, res) {
    console.log('getRestaurantInfo called.');
    const id = req.body.id;

    models.sequelize.query('SELECT * FROM restaurants WHERE id= '+id+';').then(result => {
        if (result) {
            return res.status(200).json({success: true, message: result[0]})
        } else {
            return res.status(403).json({success: false, message: 'no result.'})
        }
    }).catch(function (err){
      return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    })
}

function getCafeInfo (req, res) {
    console.log('getCafeInfo called.');
    const id = req.body.id;

    models.sequelize.query('SELECT * FROM cafes WHERE id= '+id+';').then(result => {
        if (result){
            console.log('result: ' + result.toString())
            return res.status(200).json({success: true, message: result[0]})
        } else {
            console.log('result없음');
            return res.status(403).json({success: false, message: 'no result.'})
        }
    }).catch(function (err){
      return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    })
    //}
}

function updateUserStart (req, res) {
    console.log('updateUserStart called.')
    const kakao_id = req.body.kakao_id;
    // let nowDate = new Date();
    // nowDate.getTime();
    // const now = nowDate;

    models.User.update(
        {
            subway: null,
            freq_subway: null,
            exit_quarter: null,
            with_mood: null,
            rest1: null,
            rest2: null,
            cafe1: null,
            cafe2: null,
            taste: null,
            food_type: null,
            food_name: null,
            hate_food: null,
            mood2: null
        },     // What to update
        {where: {
                kakao_id: kakao_id}
        })  // Condition
        .then(result => {
          if (result) {
            return res.status(200).json({success: true, message: 'UserStart Update complete.'})
          } else {
            return res.status(403).json({success: false, message: 'no result'})
          }
        }).catch(function (err){
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    })
}

function updatePlaceStart (req, res) {
    console.log('updatePlaceStart called.')
    const kakao_id = req.body.kakao_id;
    // let nowDate = new Date();
    // nowDate.getTime();
    // const now = nowDate;

    models.User.update(
        {
            price_lunch: null,
            price_dinner: null,
            stack: null,
            rest_stack: '00',
            mood: null,
            mood2: null,
            taste: null,
            food_type: null,
            exit_quarter: null,
            food_name: null,

            lat: null,
            lng: null,
            mid_lat: 0,
            mid_lng: 0,
            cnt: 0
        },     // What to update
        {where: {
                kakao_id: kakao_id}
        })  // Condition
        .then(result => {
          if (result) {
            return res.status(200).json({success: true, message: 'UserStart Update complete.'})
          } else {
            return res.status(403).json({success: false, message: 'no result'})
          }
        }).catch(function (err){
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    })
}

function updateDrinkStart (req, res) {
    console.log('updateDrinkStart called.')
    const kakao_id = req.body.kakao_id;
    // let nowDate = new Date();
    // nowDate.getTime();
    // const now = nowDate;

    models.User.update(
        {
            mood1: null,
            mood2: null,
            rest1: null,
            rest2: null,
            taste: null,
            drink_type: null,
            drink_round: null,
            lat: null,
            lng: null,
            price_dinner: null,
            stack: null,
            rest_stack: '00',
        },     // What to update
        {where: {
                kakao_id: kakao_id}
        })  // Condition
        .then(result => {
          if (result) {
            return res.status(200).json({success: true, message: 'UserDrinkStart Update complete.'})
          } else {
            return res.status(403).json({success: false, message: 'no result'})
          }
        }).catch(function (err){
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    })
}

function updateCafeStart (req, res) {
    console.log('updateCafeStart called.')
    const kakao_id = req.body.kakao_id;
    // let nowDate = new Date();
    // nowDate.getTime();
    // const now = nowDate;

    models.User.update(
        {
            mood1: null,
            cafe1: null,
            cafe2: null,
            mainmenu_type: null,
            food_name: null,
            mood2: null,
        },     // What to update
        {where: {
                kakao_id: kakao_id}
        })  // Condition
        .then(result => {
          if (result) {
            return res.status(200).json({success: true, message: 'UserCafeStart Update complete.'})
          } else {
            return res.status(403).json({success: false, message: 'no result'})
          }
        }).catch(function (err){
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    })
}

function updateRest2 (req, res) {
    console.log('updateRest called.')
    const kakao_id = req.body.kakao_id;
    const rest1 = req.body.rest1;
    const rest2 = req.body.rest2;
    // let nowDate = new Date();
    // nowDate.getTime();
    // const now = nowDate;

    models.User.update(
        {
            rest1: rest1,
            rest2: rest2,
        },     // What to update
        {where: {
                kakao_id: kakao_id}
        })  // Condition
        .then(result => {
          if (result) {
            return res.status(200).json({success: true, message: 'UserRest2 Update complete.'})
          } else {
            return res.status(403).json({success: false, message: 'no result'})
          }
        }).catch(function (err){
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    })
}

function updateCafe2 (req, res) {
    console.log('updateCafe called.');
    const kakao_id = req.body.kakao_id;
    const cafe1 = req.body.cafe1;
    const cafe2 = req.body.cafe2;
    // let nowDate = new Date();
    // nowDate.getTime();
    // const now = nowDate;

    models.User.update(
        {
            cafe1: cafe1,
            cafe2: cafe2,
        },     // What to update
        {where: {
                kakao_id: kakao_id}
        })  // Condition
        .then(result => {
          if (result) {
            return res.status(200).json({success: true, message: 'UserCafe2 Update complete.'})
          } else {
            return res.status(403).json({success: false, message: 'no result'})
          }
        }).catch(function (err) {
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    })
}

function updatePlaceInfo (req, res) {
    console.log('updatePlaceInfo called.');
    const kakao_id = req.body.kakao_id;
    const lat = req.body.lat;
    const lng = req.body.lng;
    const cnt = req.body.cnt;
    // let nowDate = new Date();
    // nowDate.getTime();
    // const now = nowDate;

    models.User.update(
        {
            lat: lat,
            lng: lng,
            cnt: cnt
        },     // What to update
        {where: {
                kakao_id: kakao_id}
        })  // Condition
        .then(result => {
          if (result) {
            return res.status(200).json({success: true, message: 'updatePlaceInfo Update complete.'});
          } else {
            return res.status(403).json({success: false, message: 'no result'});
          }
        }).catch(function (err) {
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
      });
}

function updateMidInfo (req, res) {
    console.log('updateMidInfo called.')
    const kakao_id = req.body.kakao_id;
    const mid_lat = req.body.mid_lat;
    const mid_lng = req.body.mid_lng;
    // let nowDate = new Date();
    // nowDate.getTime();
    // const now = nowDate;

    models.User.update(
        {
            mid_lat: mid_lat,
            mid_lng: mid_lng,
        },     // What to update
        {where: {
                kakao_id: kakao_id}
        })  // Condition
        .then(result => {
          if (result) {
            return res.status(200).json({success: true, message: 'updatePlaceInfo Update complete.'})
          } else {
            return res.status(403).json({success: false, message: 'no result'})
          }
        }).catch(function (err){
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    })
}

function createDecideHistory (req, res) {
    const kakao_id = req.body.kakao_id;
    const rest1 = req.body.rest1;
    const rest2 = req.body.rest2;
    const rest_winner = req.body.rest_winner;
    const res_name = req.body.res_name;
    const subway = req.body.subway;
    // let nowDate = new Date();
    const date = moment().format('YYYYMMDD');

    models.User.findOne({
        attributes: ['email'],
        where: {
            kakao_id: kakao_id
        }
    }).then(user_email => {
      if(user_email){
        models.Decide_history.create({
            email: user_email.email,
            rest1: rest1,
            rest2: rest2,
            rest_winner: rest_winner,
            res_name: res_name,
            subway: subway,
            date: date
        })
        .then(result => {
          if (result) {
            return res.status(200).json({success: true, message: 'DecideHistory Update complete.'})
          } else {
            return res.status(403).json({success: false, message: 'no result'})
          }
        }).catch(function (err){
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
        });
      }else{
        return res.status(401).json({message: 'Cant find user email : ' + err.message})
      }
    }).catch(err => {
        return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    });
}

function createUserFeedback (req, res) {
    const kakao_id = req.body.kakao_id;
    const sex = req.body.sex;
    const birthday = req.body.birthday;
    const job = req.body.job;
    const feedback_content = req.body.feedback_content;
    let nowDate = new Date();
    const date = moment().format('YYYYMMDD');


    models.User_feedback.create({
        kakao_id: kakao_id,
        encrypted_kakao_id: kakao_id,
        sex: sex,
        birthday: birthday,
        job: job,
        feedback_content: feedback_content,
        date: date
    })
    .then(result => {
      if (result) {
        return res.status(200).json({success: true, message: 'UserFeedback Create complete.'})
      } else {
        return res.status(403).json({success: false, message: 'no result'})
      }
    }).catch(function (err) {
      return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    })
}

function getFeedbackInfo (req, res) {
    console.log('getFeedbackInfo called.')

    models.sequelize.query('SELECT * FROM user_feedbacks;').then(result => {
        if (result){
            console.log('result: ' + result.toString())
            return res.status(200).json({success: true, message: result})
        } else {
            console.log('result없음');
            return res.status(403).json({success: false, message: 'no result'})
        }
    }).catch(function (err) {
        return res.status(403).json({success: false, message: 'Unknown error while querying users table for update from ChatBot server. err: ' + err.message})
    })
    //}
}

function createUserLog (req, res){
    const kakao_id = req.body.kakao_id
    const scenario = req.body.scenario
    const state = req.body.state
    const content = req.body.content
    let date = moment().format('YYYY-MM-DD HH:mm');
    const type = req.body.type
    const answer_num = req.body.answer_num
    //let nowDate = new Date();
    //nowDate.getTime();
    //const now = nowDate;

    models.UserLog.create({
        kakao_id: kakao_id,
        encrypted_kakao_id: kakao_id,
        scenario: scenario,
        state: state,
        content: content,
        date: date,
        type: type,
        answer_num: answer_num
    }).then(userLog => {
      if (userLog) {
        return res.status(200).json({success: true, message: 'User Log and User both Update complete.'})
      } else {
        return res.status(403).json({success: false, message: 'no result'})
      }
    }).catch(function (err){
      return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    })
}

function updateLimitCnt (req, res) {
    console.log('updateMidInfo called.')
    const kakao_id = req.body.kakao_id;
    const limit_cnt = req.body.limit_cnt;
    const date = moment().format();

    // let nowDate = new Date();
    // nowDate.getTime();
    // const now = nowDate;

    if (limit_cnt === 1) {
      models.User.update(
          {
              limit_cnt: limit_cnt,
              decide_updated_at: date,
          },     // What to update
          {where: {
                  kakao_id: kakao_id}
          })  // Condition
          .then(result => {
            if (result) {
              return res.status(200).json({success: true, message: 'updateLimitCnt Update complete.'})
            } else {
              return res.status(403).json({success: false, message: 'no result'})
            }
          }).catch(function (err){
            return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
      });
    } else {
      models.User.update(
          {
              limit_cnt: limit_cnt,
          },     // What to update
          {where: {
                  kakao_id: kakao_id}
          })  // Condition
          .then(result => {
            if (result) {
              return res.status(200).json({success: true, message: 'updateLimitCnt Update complete.'})
            } else {
              return res.status(403).json({success: false, message: 'no result'})
            }
          }).catch(function (err){
            return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
      });
    }
}

function verifyLimit (req, res) { // 30분 당 5회 제한 판별 API함수
    console.log('verifyLimit called.')
    const kakao_id = req.body.kakao_id;
    const limit_cnt = req.body.limit_cnt; //현재 유저DB의 메뉴결정 횟수
    let decide_updated_at = req.body.decide_updated_at; //현재 유저의 마지막 메뉴결정 시간
    const now_time = moment();
    const last_select_min = now_time.diff(decide_updated_at, 'minutes');

    if (decide_updated_at === null) {
      decide_updated_at = '2000-01-01 00:00:00';
    }

    /*
    음식점 선택 횟수(limit_cnt)가 5이고 decide_updated_at이 null이 아닐 때(신규가입 유저 고려),
      마지막 선택 시간으로부터 30분이 지나면,
        음식점 선택 횟수를 0으로 초기화하고 시나리오 진행 가능(success)
      마지막 선택 시간으로부터 30분이 지나지 않았으면,
        시나리오 진행 불가(failed)
    음식점 선택 횟수가 5가 아닐 때,
      마지막 선택 시간으로부터 30분이 지나면,
        음식점 선택 횟수를 0으로 초기화하고 시나리오 진행 가능(success)
      마지막 선택 시간으로부터 30분이 지나지 않았으면,
        시나리오 진행 가능(success)
    */
    if (limit_cnt === 5) {
      if (last_select_min > 30) {
        models.User.update(
            {
                limit_cnt: 0,
            },     // What to update
            {where: {
                    kakao_id: kakao_id}
            })  // Condition
            .then(result => {
              if (result) {
                return res.status(200).json({result: 'success'})
              } else {
                return res.status(403).json({success: false, message: 'no result'})
              }
            }).catch(function (err){
              return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
        });
      } else {
        return res.status(200).json({result: 'failed'})
      }
    } else {
      if (last_select_min > 30) {
        models.User.update(
            {
                limit_cnt: 0,
            },     // What to update
            {where: {
                    kakao_id: kakao_id}
            })  // Condition
            .then(result => {
              if (result) {
                return res.status(200).json({result: 'success'})
              } else {
                return res.status(403).json({success: false, message: 'no result'})
              }
            }).catch(function (err){
              return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
        });
      } else {
        return res.status(200).json({result: 'success'})
      }
    }
}

function updateLimitCntDrink (req, res) {
    console.log('updateMidInfo called.')
    const kakao_id = req.body.kakao_id;
    const limit_cnt_drink = req.body.limit_cnt_drink;
    const date = moment().format();

    // let nowDate = new Date();
    // nowDate.getTime();
    // const now = nowDate;

    if (limit_cnt_drink === 1) {
      models.User.update(
          {
              limit_cnt_drink: limit_cnt_drink,
              decide_updated_at_drink: date,
          },     // What to update
          {where: {
                  kakao_id: kakao_id}
          })  // Condition
          .then(result => {
            if (result) {
              return res.status(200).json({success: true, message: 'updateLimitCntDrink Update complete.'})
            } else {
              return res.status(403).json({success: false, message: 'no result'})
            }
          }).catch(function (err){
            return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
      });
    } else {
      models.User.update(
          {
              limit_cnt_drink: limit_cnt_drink,
          },     // What to update
          {where: {
                  kakao_id: kakao_id}
          })  // Condition
          .then(result => {
            if (result) {
              return res.status(200).json({success: true, message: 'updateLimitCntDrink Update complete.'})
            } else {
              return res.status(403).json({success: false, message: 'no result'})
            }
          }).catch(function (err){
            return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
      });
    }
}

function verifyLimitDrink (req, res) { // 30분 당 5회 제한 판별 API함수
    console.log('verifyLimitDrink called.')
    const kakao_id = req.body.kakao_id;
    const limit_cnt_drink = req.body.limit_cnt_drink; //현재 유저DB의 메뉴결정 횟수
    let decide_updated_at_drink = req.body.decide_updated_at_drink; //현재 유저의 마지막 메뉴결정 시간
    const now_time = moment();
    const last_select_min = now_time.diff(decide_updated_at_drink, 'minutes');

    if (decide_updated_at_drink === null) {
      decide_updated_at_drink = '2000-01-01 00:00:00';
    }

    /*
    음식점 선택 횟수(limit_cnt)가 5이고 decide_updated_at이 null이 아닐 때(신규가입 유저 고려),
      마지막 선택 시간으로부터 30분이 지나면,
        음식점 선택 횟수를 0으로 초기화하고 시나리오 진행 가능(success)
      마지막 선택 시간으로부터 30분이 지나지 않았으면,
        시나리오 진행 불가(failed)
    음식점 선택 횟수가 5가 아닐 때,
      마지막 선택 시간으로부터 30분이 지나면,
        음식점 선택 횟수를 0으로 초기화하고 시나리오 진행 가능(success)
      마지막 선택 시간으로부터 30분이 지나지 않았으면,
        시나리오 진행 가능(success)
    */
    if (limit_cnt_drink === 5) {
      if (last_select_min > 30) {
        models.User.update(
            {
                limit_cnt_drink: 0,
            },     // What to update
            {where: {
                    kakao_id: kakao_id}
            })  // Condition
            .then(result => {
              if (result) {
                return res.status(200).json({result: 'success'})
              } else {
                return res.status(403).json({success: false, message: 'no result'})
              }
            }).catch(function (err){
              return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
        });
      } else {
        return res.status(200).json({result: 'failed'})
      }
    } else {
      if (last_select_min > 30) {
        models.User.update(
            {
                limit_cnt_drink: 0,
            },     // What to update
            {where: {
                    kakao_id: kakao_id}
            })  // Condition
            .then(result => {
              if (result) {
                return res.status(200).json({result: 'success'})
              } else {
                return res.status(403).json({success: false, message: 'no result'})
              }
            }).catch(function (err){
              return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
        });
      } else {
        return res.status(200).json({result: 'success'})
      }
    }
}

function updateLimitCntCafe (req, res) {
    console.log('updateMidInfo called.')
    const kakao_id = req.body.kakao_id;
    const limit_cnt_cafe = req.body.limit_cnt_cafe;
    const date = moment().format();

    // let nowDate = new Date();
    // nowDate.getTime();
    // const now = nowDate;

    if (limit_cnt_cafe === 1) {
      models.User.update(
          {
              limit_cnt_cafe: limit_cnt_cafe,
              decide_updated_at_cafe: date,
          },     // What to update
          {where: {
                  kakao_id: kakao_id}
          })  // Condition
          .then(result => {
            if (result) {
              return res.status(200).json({success: true, message: 'updateLimitCntCafe Update complete.'})
            } else {
              return res.status(403).json({success: false, message: 'no result'})
            }
          }).catch(function (err){
            return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
      });
    } else {
      models.User.update(
          {
              limit_cnt_cafe: limit_cnt_cafe,
          },     // What to update
          {where: {
                  kakao_id: kakao_id}
          })  // Condition
          .then(result => {
            if (result) {
              return res.status(200).json({success: true, message: 'updateLimitCntCafe Update complete.'})
            } else {
              return res.status(403).json({success: false, message: 'no result'})
            }
          }).catch(function (err){
            return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
      });
    }
}

function verifyLimitCafe (req, res) { // 30분 당 5회 제한 판별 API함수
    console.log('verifyLimitCafe called.')
    const kakao_id = req.body.kakao_id;
    const limit_cnt_cafe = req.body.limit_cnt_cafe; //현재 유저DB의 메뉴결정 횟수
    let decide_updated_at_cafe = req.body.decide_updated_at_cafe; //현재 유저의 마지막 메뉴결정 시간
    const now_time = moment();
    const last_select_min = now_time.diff(decide_updated_at_cafe, 'minutes');

    if (decide_updated_at_cafe === null) {
      decide_updated_at_cafe = '2000-01-01 00:00:00';
    }

    /*
    음식점 선택 횟수(limit_cnt)가 5이고 decide_updated_at이 null이 아닐 때(신규가입 유저 고려),
      마지막 선택 시간으로부터 30분이 지나면,
        음식점 선택 횟수를 0으로 초기화하고 시나리오 진행 가능(success)
      마지막 선택 시간으로부터 30분이 지나지 않았으면,
        시나리오 진행 불가(failed)
    음식점 선택 횟수가 5가 아닐 때,
      마지막 선택 시간으로부터 30분이 지나면,
        음식점 선택 횟수를 0으로 초기화하고 시나리오 진행 가능(success)
      마지막 선택 시간으로부터 30분이 지나지 않았으면,
        시나리오 진행 가능(success)
    */
    if (limit_cnt_cafe === 5) {
      if (last_select_min > 30) {
        models.User.update(
            {
                limit_cnt_cafe: 0,
            },     // What to update
            {where: {
                    kakao_id: kakao_id}
            })  // Condition
            .then(result => {
              if (result) {
                return res.status(200).json({result: 'success'})
              } else {
                return res.status(403).json({success: false, message: 'no result'})
              }
            }).catch(function (err){
              return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
        });
      } else {
        return res.status(200).json({result: 'failed'})
      }
    } else {
      if (last_select_min > 30) {
        models.User.update(
            {
                limit_cnt_cafe: 0,
            },     // What to update
            {where: {
                    kakao_id: kakao_id}
            })  // Condition
            .then(result => {
              if (result) {
                return res.status(200).json({result: 'success'})
              } else {
                return res.status(403).json({success: false, message: 'no result'})
              }
            }).catch(function (err){
              return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
        });
      } else {
        return res.status(200).json({result: 'success'})
      }
    }
}

function updateState (req, res) {
    const kakao_id = req.body.kakao_id;
    const scenario = req.body.scenario;
    const state = req.body.state;

    models.User.update(
        {
            scenario: scenario,
            state: state
        },     // What to update
        {where: {
                kakao_id: kakao_id}
        })  // Condition
        .then(result => {
          if (result) {
            return res.status(200).json({success: true, message: 'User State Update complete.'})
          } else {
            return res.status(403).json({success: false, message: 'no result'})
          }
        }).catch(function (err){
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    })
    //}
}

function updateStateEmail (req, res) {
    const emailValue = req.body.email;

    models.User.update(
        {
            scenario: '100',
            state: 'init'
        },     // What to update
        {where: {
                email: emailValue}
        })  // Condition
        .then(result => {
          if (result) {
            return res.status(200).json({success: true, message: 'User State Update complete.'})
          } else {
            return res.status(403).json({success: false, message: 'no result'})
          }
        }).catch(function (err){
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    })
    //}
}

function getAllSubway(req, res) {
    models.Restaurant.findAll({
        attributes: ['subway'],
        group: 'subway'
    }).then(result => {
        let term = req.query.term;
        console.log( `term : ${term}`);
        if (result) {
            let subway_array = result.reduce((acc,cur) => {
              acc.push(cur.subway);
              return acc;
            },[]);
            let result_array = subway_array.reduce((acc, cur) => {
              if (Hangul.search(cur, term, true) === 0) acc.push(cur);
              return acc;
            }, []);

            return res.status(200).json(result_array);
            // return '됨';
        } else {
            return res.status(403).json({error: 'no result'});
        }
    }).catch(function (err){
      return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    });
}

function getAllRestsaurant(req, res) {
    // models.Restaurant.findAll({
    //     attributes: ['res_name','subway'],
    //     group: ['res_name', 'subway']
    // }).then(result => {
    //     if (result) {
    //         let result_array = result.reduce((acc,cur) => {
    //           acc.push(cur.subway + ' ' + cur.res_name);
    //           return acc;
    //         },[]);
    //         return res.status(200).json(result_array);
    //         // return '됨';
    //     } else {
    //         return res.status(404).json({error: 'no result'});
    //     }
    // }).catch(function (err) {
    //   return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    // });
}

function getSimilarRestaurant (req, res) {
  const rest = req.body.rest;
  models.sequelize.query(`SELECT * FROM restaurants WHERE id = ${rest}`).then(result => {
    if (result[0].length === 1) {
      const {subway, food_type, price_dinner} = result[0][0];
      let query = `SELECT *
                   FROM restaurants
                   WHERE closedown=0 AND
                         id != '${rest}' AND
                         NOT (MATCH(drink_round) AGAINST('1,2,3' IN BOOLEAN MODE)) AND
                         subway = '${subway}'`;
      if (food_type) { query += ` AND MATCH(food_type) AGAINST('${food_type}')`; }
      if (price_dinner) { query += ` AND MATCH(price_dinner) AGAINST('${price_dinner}')`; }
      query += ' ORDER BY RAND() LIMIT 2;';
      console.log(query);

      models.sequelize.query(query).then(result2 => {
        if (result2[0].length >= 2) {
          return res.status(200).json({success: true, message: result2[0]});
        } else {
          return res.status(200).json({success: false, message: 'no result.'});
        }
      }).catch(function (err) {
        return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
      });
    } else {
      return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    }
  }).catch(function (err) {
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
  });
}

function getOtherRestaurant (req, res) {
  let {userid, rest1, rest2} = req.body;

  models.sequelize.query(`SELECT * FROM users WHERE id=${userid};`).then(result => {
    if (result[0].length === 1) {
      models.sequelize.query(`UPDATE users SET rest_stack = CONCAT(rest_stack, ',${rest1},${rest2}') WHERE id=${userid};`).then(() => {
        models.sequelize.query(`SELECT rest_stack FROM users WHERE id=${userid};`).then(rest_stack => {
          let {subway, exit_quarter, mood2, food_type, taste, hate_food, food_name, price_lunch, price_dinner, lat, lng} = result[0][0];
          let taste_flag = food_type_flag = '';

          if (exit_quarter === '999') { exit_quarter = null; }
          if (price_dinner === 'x') { price_dinner = null; }
          if (price_lunch === 'x') { price_lunch = null; }
          if (mood2 === '999' || mood2 === '998') { mood2 = null; }
          if (taste && taste.includes('!-')) {
            taste = taste.replace('!-','');
            taste_flag = 'NOT';
          } else if (taste === 'all') {
            taste = null;
          }
          if (food_type === '이국적') {
            food_type = '한식 일식 중식 양식';
            food_type_flag = 'NOT';
          } else if (food_type === 'all') {
            food_type = null;
          }

          let food_name_condition = '';
          if (food_name === 'x') {
            food_name = null;
          } else if (food_name) {
            let food_name_leng = food_name.split(',').length;
            if (food_name.includes(',')) {
              food_name_condition = `(food_name LIKE ("%${food_name.split(',')[0]}%")`;
              for (let i = 1; i < food_name_leng; i++) {
                food_name_condition += ` OR food_name LIKE ("%${food_name.split(',')[i]}%")`;
              }
              food_name_condition += ')';
            } else {
              food_name_condition = `food_name LIKE ("%${food_name}%")`;
            }
          }

          // 1. GPS 에서 다른식당보기
          if (lat && lng) {
            let query = `SELECT *
                         FROM restaurants
                         WHERE closedown=0 AND
                               id NOT IN (${rest_stack[0][0].rest_stack}) AND
                               NOT (MATCH(drink_round) AGAINST('1,2,3' IN BOOLEAN MODE)) AND
                               (lat - ${lat} < 0.1 AND lat - ${lat} > -0.1) AND
                               (lng - ${lng} < 0.1 AND lng - ${lng} > -0.1)`;
            if (price_lunch) { query += ` AND (MATCH(price_lunch) AGAINST('${price_lunch}' IN BOOLEAN MODE))`; }
            if (price_dinner) { query += ` AND (MATCH(price_dinner) AGAINST('${price_dinner}' IN BOOLEAN MODE))`; }
            if (hate_food) { query += ` AND NOT (MATCH(food_name) AGAINST('${hate_food}' IN BOOLEAN MODE))
                                        AND NOT (MATCH(taste) AGAINST('${hate_food}' IN BOOLEAN MODE))`; }
            query += `;`;
            console.log(query);

            models.sequelize.query(query).then(nears => {
              let list = nears[0];
              let nearsList = [];
              if (list.length > 1) {
                var fn = function distance(item) {
                  const p = 0.017453292519943295; // Math.PI / 180
                  const c = Math.cos;
                  let a = 0.5 - c((item.lat - lat) * p) / 2
                          + c(lat * p) * c(item.lat * p)
                          * (1 - c((item.lng - lng) * p)) / 2;
                  let result = 12742 * Math.asin(Math.sqrt(a));

                  if (result < 0.5) {
                    console.log(item.subway + item.res_name + ' >> ' + Math.floor(result*1000)+'m');
                    item['distance'] = Math.floor(result*1000);
                    nearsList.push(item);
                  }
                  return new Promise(resolve => setTimeout(() => resolve("ok"), 100));
                }

                var actions = list.map(fn);
                Promise.all(actions).then(() => {
                  if (nearsList.length >= 2) {
                    const shuffled = nearsList.sort(() => 0.5 - Math.random());
                    const rand_pick = shuffled.slice(0, 2);
                    return res.status(200).json({success: true, message: rand_pick, num: nearsList.length});
                  }
                  else {
                    res.status(200).json({success: false, message: 'no result.'});
                  }
                }).catch(err => {
                  return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
                });
              }
              else {
                res.status(200).json({success: false, message: 'no result.'});
              }
            }).catch(err => {
              return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
            });
          }

          // 2. 일반적인 다른식당보기
          else {
            let query = `SELECT *
                         FROM restaurants
                         WHERE closedown=0 AND
                               id NOT IN (${rest_stack[0][0].rest_stack}) AND
                               NOT (MATCH(drink_round) AGAINST('1,2,3' IN BOOLEAN MODE))`;
            if (subway) { query += ` AND subway = '${subway}'`; }
            if (exit_quarter) { query += ` AND exit_quarter IN (${exit_quarter})`; }
            if (price_lunch) { query += ` AND (MATCH(price_lunch) AGAINST('${price_lunch}' IN BOOLEAN MODE))`; }
            if (price_dinner) { query += ` AND (MATCH(price_dinner) AGAINST('${price_dinner}' IN BOOLEAN MODE))`; }
            if (mood2) { query += ` AND (MATCH(mood2) AGAINST('${mood2}' IN BOOLEAN MODE))`; }
            if (food_name) { query += ` AND ${food_name_condition}`; }
            if (hate_food) { query += ` AND NOT (MATCH(food_name) AGAINST('${hate_food}' IN BOOLEAN MODE))`; }
            if (taste) { query += ` AND ${taste_flag} (MATCH(taste) AGAINST('"${taste}" -${hate_food}' IN BOOLEAN MODE))`; }
            if (food_type) { query += ` AND ${food_type_flag} (MATCH(food_type) AGAINST('${food_type}' IN BOOLEAN MODE))`; }
            query += ` ORDER BY RAND();`;

            console.log(query);
            models.sequelize.query(query).then(result => {
              if (result[0].length >= 2) {
                return res.status(200).json({success: true, try: 1, num: result[0].length, message: result[0].slice(0, 2)});
              } else {
                return res.status(200).json({success: false, message: 'no result.'});
              }
            }).catch( err => {
              return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
            });
          }
        }).catch( err => {
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
        });
      }).catch(err => {
        return res.status(500).json({success: false, message: 'Update rest_stack has failed: ' + err.message});
      });
    }
    else {
      return res.status(400).json({success: false, message: 'No such user who has the requested id.'});
    }
  }).catch( err => {
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
  });
}

function getOtherDrinkRestaurant (req, res) {
  let {userid, rest1, rest2} = req.body;
  models.sequelize.query(`SELECT * FROM users WHERE id=${userid};`).then(result => {
    if (result[0].length === 1) {
      models.sequelize.query(`UPDATE users SET rest_stack = CONCAT(rest_stack, ',${rest1},${rest2}') WHERE id=${userid};`)
      .then(() => {
        models.sequelize.query(`SELECT rest_stack FROM users WHERE id=${userid};`).then(rest_stack => {
          let {lat, lng, subway, drink_round, price_dinner, mood1, mood2, drink_type} = result[0][0];
          let price_dinner_flag = mood2_flag = '';

          if (price_dinner) {
            if (price_dinner.includes('!')) {
              price_dinner_flag = 'NOT';
              price_dinner = price_dinner.replace(/\!/g,'');
            }
          }
          if (mood2) {
            if (mood2.includes('!')) {
              mood2_flag = 'NOT';
              mood2 = mood2.replace(/\!/g,'');
            }
          }
          if (drink_type) {
            if (drink_type === '888') {
              drink_type = null;
            } else {
              drink_type = drink_type.replace('양주&칵테일','양주');
              drink_type = drink_type.replace('맥주','생맥주, 병맥주');
            }
          }
          // 1. GPS 에서 다른식당보기
          if (lat && lng) {
            let query = `SELECT * FROM restaurants WHERE closedown=0 AND
                         (lat - ${lat} < 0.1 AND lat - ${lat} > -0.1) AND
                         (lng - ${lng} < 0.1 AND lng - ${lng} > -0.1) AND
                         id NOT in (${rest_stack[0][0].rest_stack})`;
            if (drink_round) { query += ` AND match(drink_round) against('${drink_round}' in boolean mode)`; }
            if (price_dinner) { query += ` AND ${price_dinner_flag} match(price_dinner) against('${price_dinner}' in boolean mode)`; }
            if (mood1) { query += ` AND match(mood) against('${mood1}' in boolean mode)`; }
            if (mood2) { query += ` AND ${mood2_flag} match(mood2) against('${mood2}' in boolean mode)`; }
            if (drink_type) { query += ` AND match(drink_type) against('${drink_type}' in boolean mode)`; }
            query += ';';
            console.log(query);

            models.sequelize.query(query).then(nears => {
              let list = nears[0];
              let nearsList = [];
              if (list.length > 1) {
                var fn = function distance(item) {
                  const p = 0.017453292519943295; // Math.PI / 180
                  const c = Math.cos;
                  let a = 0.5 - c((item.lat - lat) * p) / 2
                          + c(lat * p) * c(item.lat * p)
                          * (1 - c((item.lng - lng) * p)) / 2;
                  let result = 12742 * Math.asin(Math.sqrt(a));

                  if (result < 0.5) {
                    console.log(item.subway + item.res_name + ' >> ' + Math.floor(result*1000)+'m');
                    item['distance'] = Math.floor(result*1000);
                    nearsList.push(item);
                  }
                  return new Promise(resolve => setTimeout(() => resolve("ok"), 100));
                }

                var actions = list.map(fn);
                Promise.all(actions).then(() => {
                  if (nearsList.length >= 2) {
                    const shuffled = nearsList.sort(() => 0.5 - Math.random());
                    const rand_pick = shuffled.slice(0, 2);
                    return res.status(200).json({success: true, num: nearsList.length, message: rand_pick});
                  } else if (nearsList.length == 1) {
                    return res.status(200).json({success: true, num: 1, message: nearsList})
                  } else {
                    return res.status(200).json({success: false, num: 0, message: 'no result.'});
                  }
                }).catch(err => {
                  return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
                });
              }
              else {
                return res.status(200).json({success: false, message: 'no result.'});
              }
            }).catch(err => {
              return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
            });
          }

          // 2. 일반적인 다른식당보기
          else {
            let query = `SELECT * FROM restaurants WHERE closedown=0 AND
                         id NOT in(${rest_stack[0][0].rest_stack}) AND
                         subway = '${subway}'`;
            if (drink_round) { query += ` AND match(drink_round) against('${drink_round}' in boolean mode)`; }
            if (price_dinner) { query += ` AND ${price_dinner_flag} match(price_dinner) against('${price_dinner}' in boolean mode)`; }
            if (mood1) { query += ` AND match(mood) against('${mood1}' in boolean mode)`; }
            if (mood2) { query += ` AND ${mood2_flag} match(mood2) against('${mood2}' in boolean mode)`; }
            if (drink_type) { query += ` AND match(drink_type) against('${drink_type}' in boolean mode)`; }
            query += ' ORDER BY RAND();';
            console.log(query);
            models.sequelize.query(query).then(result => {
              if (result[0].length >= 2) {
                return res.status(200).json({success: true, num: result[0].length, message: result[0].slice(0, 2)});
              } else if (result[0].length == 1) {
                return res.status(200).json({success: true, num: 1, message: result[0]});
              } else {
                return res.status(200).json({success: false, num: 0, message: 'no result.'});
              }
            }).catch( err => {
              return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
            });
          }
        }).catch( err => {
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
        });
      }).catch(err => {
        return res.status(500).json({success: false, message: 'Update rest_stack has failed: ' + err.message});
      });
    }
    else {
      return res.status(400).json({success: false, message: 'No such user who has the requested id.'});
    }
  }).catch( err => {
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
  });
}

function getSimilarDrinkRestaurant (req, res) {
  const rest = req.body.rest;
  models.sequelize.query(`SELECT * FROM restaurants WHERE id = ${rest}`).then(select => {
    if (select[0].length !== 0) {
      const {subway, drink_type, price_dinner, mood, mood2} = select[0][0];
      let query = `SELECT * FROM restaurants WHERE
                     closedown=0 AND
                     id != '${rest}' AND
                     subway = '${subway}'`;
      if (drink_type) { query += ` AND MATCH(drink_type) AGAINST('${drink_type}')`; }
      if (price_dinner) { query += ` AND MATCH(price_dinner) AGAINST('${price_dinner}')`; }
      if (mood) { query += ` AND MATCH(mood) AGAINST('${mood}')`; }
      if (mood2) { query += ` AND MATCH(mood2) AGAINST('${mood2}')`; }
      query += ' ORDER BY RAND() LIMIT 2;';
      console.log(query);
      models.sequelize.query(query).then(result => {
        if (result[0].length === 2) {
          return res.status(200).json({success: true, num: 2, message: result[0]});
        } else if (result[0].length === 1) {
          return res.status(200).json({success: true, num: 1, message: result[0]});
        } else {
          return res.status(200).json({success: false, num: 0, message: 'no result.'});
        }
      }).catch(err => {
        return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
      });
    } else {
      return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    }
  }).catch(err => {
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
  });
}

function verifySubway (req, res) {
    console.log("here is verifYSubway");
    let subway;
    if ((req.body.subway !== undefined)){
        subway = req.body.subway;
    } else {
        return res.status(400).json({success: false, message: 'Parameters not properly given. Check parameter names (subway).',
            subway: req.body.subway});
    }

    models.Restaurant.findOne({
        where: {
            subway: subway
        }
    }).then(result => {
        if(result !== null) {
            res.status(200).json({result: 'success'})
        } else {
            res.status(200).json({result: 'no subway'})
        }
    }).catch(err => {
        return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    });
}

function verifySearchFood (req, res) {
    console.log("Here is verifySearchFood");

    let search_food, subway, query;

    if ((req.body.search_food !== undefined && req.body.search_food!=='' && req.body.search_food!==',' && req.body.search_food!==' ' && req.body.search_food!==', ')) {
        search_food = req.body.search_food;
    } else {
        return res.status(400).json({success: false, message: 'Parameters not properly given. Check parameter names (search_food).',
            search_food: req.body.search_food});
    }

    if ((req.body.subway !== undefined)){
        subway = req.body.subway;
    } else {
        return res.status(400).json({success: false, message: 'Parameters not properly given. Check parameter names (subway).',
            subway: req.body.subway});
    }

    if (typeof search_food == 'string') {
      query = `SELECT * FROM restaurants WHERE closedown=0 AND
        NOT (MATCH(drink_round) AGAINST('1,2,3' IN BOOLEAN MODE)) AND
        subway = '${subway}' AND
        (food_name LIKE '%${search_food}%' OR food_type LIKE '%${search_food}%' OR taste LIKE '%${search_food}%')
        ORDER BY rand() limit 2;`;
    } else {
      query = `SELECT * FROM restaurants WHERE closedown=0 AND
       NOT (MATCH(drink_round) AGAINST('1,2,3' IN BOOLEAN MODE)) AND
       subway='${subway}' AND
       (`;
      for (let i in search_food) {
        query += `(food_name LIKE '%${search_food[i]}%' OR food_type LIKE '%${search_food[i]}%' OR taste LIKE '%${search_food[i]}%') OR `;
      }
      query += ` false) ORDER BY rand() LIMIT 2;`;
    }

    console.log("Query : ", query);
    models.sequelize.query(query).then(result => {
        if (result[0].length == 2){
          return res.status(200).json({result: 'success', message: result[0]});
        } else if(result[0].length == 1) {
          return res.status(200).json({result: 'success', message: result[0]});
        } else {
          return  res.status(200).json({result: 'no food in this subway'})
        }
    }).catch(function (err){
      return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    })
}

function verifyMood2 (req, res) {
    console.log("verifyMood2 api called");
    let subway = req.body.subway;
    let filter = ['가벼운', '인스타', '깔끔', '큰프', '뷔페'];
    let filtered_list = [];

    var fn = function asyncAddList(item) {
      models.sequelize.query(`SELECT * FROM restaurants WHERE closedown=0 AND NOT (MATCH(drink_round) AGAINST('1,2,3' IN BOOLEAN MODE)) AND subway = '${subway}' AND mood2 LIKE("%${item}%") limit 2;`).then(result => {
            if (result[0].length === 2){
              filtered_list.push(item);
            }
        }).catch(function (err){
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
        })
        return new Promise(resolve => setTimeout(() => resolve('ok'), 100));
    }

    var actions = filter.map(fn);
    var results = Promise.all(actions);

    Promise.all(actions).then(() => {
      console.log(filtered_list);
      return res.status(200).json({result : filtered_list});
    });
}

function verifyDrinktypeList (req, res) {
    let {userid, subway} = req.body;
    models.sequelize.query(`SELECT * FROM users WHERE id=${userid};`).then(userData => {
      let {drink_round, subway, price_dinner, mood1, mood2} = userData[0][0];
      let price_dinner_flag = mood2_flag = '';

      if (price_dinner) {
        if (price_dinner.includes('!')) {
          price_dinner_flag = 'NOT';
          price_dinner = price_dinner.replace(/\!/g,'');
        }
      }
      if (mood2) {
        if (mood2.includes('!')) {
          mood2_flag = 'NOT';
          mood2 = mood2.replace(/\!/g,'');
        }
      }

      let query = `SELECT DISTINCT drink_type
                   FROM restaurants
                   WHERE closedown=0`
      if (subway) { query += ` AND subway = '${subway}'`; }
      if (drink_round) { query += ` AND MATCH(drink_round) AGAINST('${drink_round}' IN BOOLEAN MODE)`; }
      if (price_dinner) { query += ` AND ${price_dinner_flag} MATCH(price_dinner) AGAINST('${price_dinner}' IN BOOLEAN MODE)`; }
      if (mood1) { query += ` AND MATCH(mood) AGAINST('${mood1}' IN BOOLEAN MODE)`; }
      if (mood2) { query += ` AND ${mood2_flag} MATCH(mood2) AGAINST('${mood2}' IN BOOLEAN MODE)`; }
      query += ';';
      console.log(query);
      models.sequelize.query(query).then(result => {
        let list = [];
        // 쿼리 결과 식당들의 drink type을 ,로 파싱한 후 list에 전부 넣고 후에 중복 제거 후 response
        var parseFunc = (item) => {
          let types = item.drink_type.replace(/ /gi, '');
          types.split(',').forEach(element => {
            if (element.indexOf('맥주') != -1) {
              list.push('맥주');
            } else if (element === '양주' || element === '칵테일') {
              list.push('양주&칵테일');
            } else {
              list.push(element);
            }
          });
          return new Promise(resolve => setTimeout(() => resolve(), 50));
        }

        var action = result[0].map(parseFunc);
        Promise.all(action).then(() => {
          // list = Array.from(new Set(list));   // 중복 제거
          return res.status(200).json({success: true, message: Array.from(new Set(list))});
        }).catch(err => {
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
        })
      }).catch(err => {
        return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
      });
    }).catch(err => {
      return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
    });
}

function verifySubwayDrinktype (req, res) {
    let subway;
    if ((req.body.subway !== undefined)){
        subway = req.body.subway;
    } else {
        return res.status(401).json({success: false, message: 'Parameters not properly given. Check parameter names (subway).',
            subway: req.body.subway});
    }

    models.Restaurant.findOne({
        where: {
            subway: subway,
            drink_type: {
              [Op.ne]: null
            }
        }})
        .then(result => {
        if(result !== null) {
            res.status(200).json({result: 'success'})
        } else {
            res.status(200).json({result: 'no subway'})
        }
    }).catch(err => {
        return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    });
}

function verifySubwayThema (req, res) {
    const subway = req.body.subway;
    models.Cafe.findAll({
      where: {
        subway: subway
      }
    }).then(result => {
        if(result){
            let subway_array = result.reduce((acc,cur) => {
              // acc.push(cur.mainmenu_type);
              acc.push(cur);
              return acc;
            },[]);
            let result_array = subway_array.reduce((acc, cur) => {
              if (Hangul.search(cur.mainmenu_type, '테마', true) === 0) acc.push(cur);
              return acc;
            }, []);
            if(result_array){
              return res.status(200).json({result: 'success', result_array: result_array});
            } else {
              return res.status(200).json({result: 'fail'});
            }
        } else {
            return res.status(403).json({error: 'no result'});
        }
    }).catch(function (err){
      return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    });
}

function verifySubwayDetailThema (req, res) {
    const subway = req.body.subway;
    console.log("verifySubwayDetailThema called");
    const category_list = req.body.category_list;
    const condition = [];
    const leng = category_list.split(',').length;
    for (var i = 0; i < leng; i++) {
      condition.push(`${category_list.split(',')[i]}`);
    }
    console.log(condition);
    models.Cafe.findAll({
        where: {
            subway: subway,
            mainmenu_type: {
              [Op.or]: condition
            }
        }})
        .then(result => {
        if(result !== null) {
            res.status(200).json({result: 'success'})
        } else {
            res.status(200).json({result: 'no subway'})
        }
    }).catch(err => {
        return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    });
}

function crawlImage (req, res) {
  const res1 = req.body.res1;

  let url = 'https://search.naver.com/search.naver?where=image&sm=tab_jum&query='+encodeURIComponent(res1);

  client.fetch(url, param, function(err, $, resp){
      if(err){
          console.log(err);
          return;
      }
      let img_array = [];

      $('._img').each(function (idx) {
        img_array.push($(this).attr('data-source'));
      });
      return res.status(200).json({success: true, res1: img_array})

  });
}

function crawlTwoImage (req, res) {
  const content1 = req.body.content1;
  const content2 = req.body.content2;

  let url = 'https://search.naver.com/search.naver?where=image&sm=tab_jum&query='+encodeURIComponent(content1);
  let url2 = 'https://search.naver.com/search.naver?where=image&sm=tab_jum&query='+encodeURIComponent(content2);
  client.fetch(url, param, function(err, $, resp){
      if(err){
          console.log(err);
          return;
      }
      let img_array = [];
      let img_array2 = [];

      $('._img').each(function (idx) {
        img_array.push($(this).attr('data-source'));
      });
      client.fetch(url2, param, function(err, $, resp2){
          if(err){
              console.log(err);
              return;
          }
          $('._img').each(function (idx2) {
            img_array2.push($(this).attr('data-source'));
          });
          if(img_array && img_array2){
            return res.status(200).json({success: true, res1: img_array, res2: img_array2})
          }else{
            return res.status(200).json({success: false, res1: 'no_image', res2: 'no image'})
          }
      });
  });
}

function previousRegisterUser (req, res) {
    //  let email_example = String(Math.floor(Math.random() * 100000) + 1);
     let kakao_id;
     if (req.body){
         kakao_id = req.body.kakao_id
     } else {
         return res.status(400).json({success: false, message: 'Parameters not properly given. Check parameter names (kakao_id).'})
     }
     if (!kakao_id){
         return res.status(403).json({success: false, message: 'Kakao_id not given in Body. Check parameters.'})
     }
     models.User.findOne({
         where: {
             kakao_id: kakao_id
         }
     }).then(user => {
         if (user){
             models.User.update(
               {
                 scenario: '100',
                 state: 'init'
               },     // What to update
               {where: {
                       kakao_id: kakao_id}
               })  // Condition
               .then(result => {
                 return res.status(403).json({success: false, message: 'user with same kakao_id already exists'});
               })
         } else {
             models.User.create({
                 kakao_id: req.body.kakao_id,
                 email: req.body.email,
                 password: req.body.password,
                 //encrypted_kakao_id: encrypted_kakao_id,
                 scenario: '100',
                 state: 'init',
                 social: false,
                 registered: '-1',
             }).then(user => {
                 return res.status(200).json({success: true, message: 'user created.', user: user})
             }).catch(function (err){
               return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
             });
         }
     })
 }

 function registerOnetimeUser (req, res) {
     const email=req.body.email;
     const name=req.body.name;
     const pwd=req.body.password;

     models.User.create({
         email: email,
         password: pwd,
         name: name,
         //encrypted_kakao_id: encrypted_kakao_id,
         scenario: '100',
         state: 'init',
         social: false,
         registered: '-1',
     }).then(user => {
       if(user){
         return res.status(200).json({success: true, message: 'onetime user created.', user: user});
       } else{
         return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
       }
     }).catch(err => {
         return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
     });
 }

 function getPartLog (req, res) {
     const email = req.body.email;
     const targetcol = req.body.col;
     const now_date = moment();

     models.User.findOne({
         attributes: [targetcol, 'updated_at'],
         where: {
             email: email
         }
     }).then(result => {
       if(result){
         const last_date = result.updated_at;
         const disconn_min = now_date.diff(last_date, 'minutes');

         if (disconn_min > 10) { // 마지막 접속으로 시나리오 진행으로부터 10분이 지나면 접속끊음으로 판단
           models.User.update(
             {
               scenario: '100',
               state: 'init'
             },     // What to update
             {where: {
                     email: email}
             })  // Condition
             .then(update_result => {
               return res.status(200).json({success: true, message: result[targetcol], disconn_type: 'permanent'});
             }).catch(err => {
                 return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
             });
         } else { // 마지막 접속으로부터 10분 이하 이내로 다시 접속 시, 일시적 접속 끊김으로 판단
           return res.status(200).json({success: true, message: result[targetcol], disconn_type: 'temporary'});
         }
       }else{
         return res.status(401).json({message: 'Cant find user email : ' + err.message})
       }
     }).catch(err => {
         return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
     });
 }

 function getChatLog (req, res) {
     const email = req.body.email;
     const now_date = moment();

     models.User.findOne({
         attributes: ['chat_log', 'updated_at'],
         where: {
             email: email
         }
     }).then(result => {
       if(result){
         const last_date = result.updated_at;
         const disconn_min = now_date.diff(last_date, 'minutes');

         if (disconn_min > 10) { // 마지막 접속으로 시나리오 진행으로부터 10분이 지나면 접속끊음으로 판단
           models.User.update(
             {
               scenario: '100',
               state: 'init'
             },     // What to update
             {where: {
                     email: email}
             })  // Condition
             .then(update_result => {
               return res.status(200).json({success: true, message: result.chat_log, disconn_type: 'permanent'});
             }).catch(err => {
                 return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
             });
         } else { // 마지막 접속으로부터 10분 이하 이내로 다시 접속 시, 일시적 접속 끊김으로 판단
           return res.status(200).json({success: true, message: result.chat_log, disconn_type: 'temporary'});
         }
       }else{
         return res.status(401).json({message: 'Cant find user email : ' + err.message})
       }
     }).catch(err => {
         return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
     });
 }

 function deleteChatLog (req, res) {
     const email = req.body.email;
     models.User.findOne({
         attributes: ['chat_log'],
         where: {
             email: email
         }
     }).then(user => {
        if(user){
          models.User.update(
            {
             chat_log: null,
             scenario: '100',
             state: 'init',
            },     // What to update
            {where: {
                   email: email}
            })  // Condition
            .then(result => {
             return res.status(200).json({success: true, message: result.chat_log});
            }).catch(err => {
               return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
            });
        } else{
           return res.status(401).json({message: 'Cant find user email : ' + err.message})
        }
     }).catch(err => {
         return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
     });
 }

 function deletePartLog (req, res) {
     const email = req.body.email;
     const targetcol = req.body.col;
     models.User.findOne({
         attributes: [targetcol],
         where: {
             email: email
         }
     }).then(user => {
        if(user){
          models.User.update(
            {
             [targetcol]: null,
             scenario: '100',
             state: 'init',
            },     // What to update
            {where: {
                   email: email}
            })  // Condition
            .then(result => {
             return res.status(200).json({success: true, message: result[targetcol]});
            }).catch(err => {
               return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
            });
        } else{
           return res.status(401).json({message: 'Cant find user email : ' + err.message})
        }
     }).catch(err => {
         return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
     });
 }

 function getSubwayListHistory (req, res) {
     const email = req.query.email;

     models.sequelize.query(`SELECT p.subway, p.date
FROM decide_histories AS p
WHERE date=(SELECT MAX(date) FROM decide_histories WHERE subway = p.subway AND email = '${email}') GROUP BY subway ORDER BY date LIMIT 5;`).then(result => {
       if (result) {
         let user_subway_array = result[0].reduce((acc,cur) => {
           let history_date = moment(cur.date).format('MM.DD');
           acc.push({
             'subway': cur.subway,
             'date': history_date
           });
           return acc;
         },[]);
         return res.status(200).json(user_subway_array);
       } else {
         return res.status(200).json([]);
       }
     }).catch(function (err){
       return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
     })
 }

 function findSubwayDrinkType(req, res) {
   const subway = req.body.subway;
   const exit_quarter = req.body.exit_quarter;

   models.sequelize.query(`SELECT drink_type FROM restaurants WHERE
     subway = '${subway}' and exit_quarter IN (${exit_quarter}) GROUP BY drink_type;`).then(result => {
         if(result){
             let drink_type_array = result[0].reduce((acc,cur) => {
               if (String(cur.drink_type).includes(',')) {
                 cur = cur.drink_type.split(',');
                 cur.forEach(function(obj){
                   if (String(obj).includes('맥주')) {
                     acc.push('맥주');
                   } else if (String(obj).includes('양주')) {
                     acc.push('양주&칵테일');
                   } else {
                     acc.push(obj);
                   }
                 });
               } else {
                 if (String(cur.drink_type).includes('맥주')) {
                  acc.push('맥주');
                } else if (String(cur.drink_type).includes('양주')) {
                  acc.push('양주&칵테일');
                } else {
                  acc.push(cur.drink_type);
                }
               }
               return acc;
             },[]);
             let uniq_array = drink_type_array.reduce(function(a,b){
             	if ((a.indexOf(b) < 0) && b !== null ) a.push(b);
             	return a;
             },[]);

             return res.status(200).json(uniq_array);
         }else{
             return res.status(403).json({error: 'no result'});
         }
     }).catch(function (err){
       return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
     })
 }

 function getDrinkRestaurant (req, res) {
   let {lat, lng, subway, drink_round, price_dinner, mood, mood2, drink_type} = req.body;
   let price_dinner_flag = mood2_flag = '';
   console.log(`lng : ${lng}, lat : ${lat}, drink_round : ${drink_round}, subway : ${subway}, price_dinner : ${price_dinner}, mood2 : ${mood2}, mood : ${mood}, drink_type : ${drink_type}`);

   if (price_dinner) {
     if (price_dinner.includes('!')) {
       price_dinner_flag = 'NOT';
       price_dinner = price_dinner.replace(/\!/g,'');
     }
   }
   if (mood2) {
     if (mood2.includes('!')) {
       mood2_flag = 'NOT';
       mood2 = mood2.replace(/\!/g,'');
     }
   }
   if (drink_type) {
     if (drink_type === '888') {
       drink_type = null;
     } else {
       drink_type = drink_type.replace('양주&칵테일','양주');
       drink_type = drink_type.replace('맥주','생맥주, 병맥주');
     }
   }
   //lng, lat 값이 있는 경우
   if (lat && lng) {
     let query = `SELECT * FROM restaurants WHERE closedown=0 AND
                  (lat - ${lat} < 0.1 AND lat - ${lat} > -0.1) AND
                  (lng - ${lng} < 0.1 AND lng - ${lng} > -0.1)`;
     if (drink_round) { query += ` AND match(drink_round) against('${drink_round}' in boolean mode)`; }
     if (price_dinner) { query += ` AND ${price_dinner_flag} match(price_dinner) against('${price_dinner}' in boolean mode)`; }
     if (mood) { query += ` AND match(mood) against('${mood}' in boolean mode)`; }
     if (mood2) { query += ` AND ${mood2_flag} match(mood2) against('${mood2}' in boolean mode)`; }
     if (drink_type) { query += ` AND match(drink_type) against('${drink_type}' in boolean mode)`; }
     query += ';';
     console.log(query);

     models.sequelize.query(query).then(result => {
       let list = result[0];
       let resultList = [];
       if (list.length > 1) {
         var fn = function distance(item) {
           const p = 0.017453292519943295; // Math.PI / 180
           const c = Math.cos;
           const a = 0.5 - c((item.lat - lat) * p) / 2
                   + c(lat * p) * c(item.lat * p)
                   * (1 - c((item.lng - lng) * p)) / 2;
           const result = 12742 * Math.asin(Math.sqrt(a));
           if (result < 0.5) {
             console.log(item.res_name + " >> " + Math.floor(result*1000)+'m');
             item['distance'] = Math.floor(result*1000);
             resultList.push(item);
           }
           return new Promise(resolve => setTimeout(() => resolve("ok"), 100));
         }

         var actions = list.map(fn);
         Promise.all(actions).then(() => {
           if (resultList.length >= 2) {
             const shuffled = resultList.sort(() => 0.5 - Math.random());
             const rand_pick = shuffled.slice(0, 2);
             return res.status(200).json({success: true, num: resultList.length, message: rand_pick});
           } else if (resultList.length == 1) {
             return res.status(200).json({success: true, num: 1, message: resultList});
           } else {
             return res.status(200).json({success: false, num: 0, message: 'no result.'});
           }
         }).catch(err => {
           return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
         });
       }
       else {
         return res.status(200).json({success: false, message: 'no result.'});
       }
     }).catch(err => {
       return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
     });
   }

   else {
     let query = `SELECT * FROM restaurants WHERE closedown=0 AND
                  subway = '${subway}'`;
     if (drink_round) { query += ` AND match(drink_round) against('${drink_round}' in boolean mode)`; }
     if (price_dinner) { query += ` AND ${price_dinner_flag} match(price_dinner) against('${price_dinner}' in boolean mode)`; }
     if (mood) { query += ` AND match(mood) against('${mood}' in boolean mode)`; }
     if (mood2) { query += ` AND ${mood2_flag} match(mood2) against('${mood2}' in boolean mode)`; }
     if (drink_type) { query += ` AND match(drink_type) against('${drink_type}' in boolean mode)`; }
     query += ' ORDER BY RAND();';
     console.log(query);
     models.sequelize.query(query).then(result => {
       if (result[0].length >= 2) {
         return res.status(200).json({success: true, num: result[0].length, message: result[0].slice(0, 2)})
       } else if (result[0].length == 1) {
         return res.status(200).json({success: true, num: 1, message: result[0]})
       } else {
         return res.status(200).json({success: false, num: 0, message: 'no result'})
       }
     }).catch(err => {
       return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
     });
   }
 }

function getCafe(req, res) {
  let subway = req.body.subway_cafe;
  let exit_quarter = req.body.exit_quarter;
  let mainmenu_type = req.body.mainmenu_type;
  console.log(`getCafe함수에서 subway : ${subway}, exit_quarter : ${exit_quarter}, mainmenu_type : ${mainmenu_type}`);

  var condition;
  const cLeng = mainmenu_type.split(',').length;
  if(mainmenu_type.includes('!')) {
    condition = `(mainmenu_type LIKE ("%테마%") and mainmenu_type not LIKE ("%${mainmenu_type.split(',')[0].split('!')[1]}%")`;
    for (var i = 1; i < cLeng; i++) {
      condition += ` and mainmenu_type not LIKE ("%${mainmenu_type.split(',')[i].split('!')[1]}%")`;
    }
    condition += ')';
  } else {
    condition = `(mainmenu_type LIKE ("%${mainmenu_type.split(',')[0]}%")`;
    for (var i = 1; i < cLeng; i++) {
      condition += ` or mainmenu_type LIKE ("%${mainmenu_type.split(',')[i]}%")`;
    }
    condition += ')';
  }
  console.log(condition);
  models.sequelize.query(`SELECT * from cafes where subway = '${subway}' and exit_quarter in (${exit_quarter}) and ` + condition + ` order by RAND() LIMIT 1;`).then(result => {
      if (result[0].length !== 0){
        models.sequelize.query(`SELECT * from cafes where id != '${result[0].id}' and subway = '${subway}' and exit_quarter in (${exit_quarter}) and mainmenu_type LIKE ("%테마%") order by RAND() LIMIT 1;`).then(result2 => {
            if (result2[0].length !== 0){
              return res.status(200).json({success: true, message: '2', result: [result[0], result2[0]]})
            } else {
              models.sequelize.query(`SELECT * from cafes where id != '${result[0].id}' and subway = '${subway}' and mainmenu_type LIKE ("%테마%") order by RAND() LIMIT 1;`).then(result3 => {
                  if (result3[0].length !== 0){
                    return res.status(200).json({success: true, message: '1', result: [result[0], result3[0]]})
                  } else {
                    return res.status(500).json({success: false})
                  }
             }).catch(function (err){
                return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
              })
            }
       }).catch(function (err){
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
        })
      } else {
        models.sequelize.query(`SELECT * from cafes where subway = '${subway}' and ` + condition + ` order by RAND() LIMIT 1;`).then(result => {
            if (result[0].length !== 0){
              models.sequelize.query(`SELECT * from cafes where id != '${result[0].id}' and subway = '${subway}' and mainmenu_type LIKE ("%테마%") order by RAND() LIMIT 1;`).then(result2 => {
                  if (result2[0].length !== 0){
                    return res.status(200).json({success: true, message: '1', result: [result[0], result2[0]]})
                  } else {
                    return res.status(500).json({success: false})
                  }
             }).catch(function (err){
                return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
              })
            } else {
              return res.status(500).json({success: false})
            }
        }).catch(function (err){
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
        })
      }
  }).catch(function (err){
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
  })
}

function getCafe2(req, res) {
  let subway = req.body.subway_cafe;
  let exit_quarter = req.body.exit_quarter;
  let mainmenu_type = req.body.mainmenu_type;
  let mood1 = req.body.mood1;
  let query1, query2, query3;
  if (mood1 === null || mood1 === '전체포함') {
    mood1 = '';
    query1 = `SELECT * from cafes where subway = '${subway}' and exit_quarter in (${exit_quarter}) and not match(mood2) against('큰프') and match(mainmenu_type) against ('${mainmenu_type}') order by RAND() LIMIT 2;`;
    query2 = `SELECT * from cafes where subway = '${subway}' and exit_quarter in (${exit_quarter}) and match(mainmenu_type) against ('${mainmenu_type}') order by RAND() LIMIT 2;`;
    query3 = `SELECT * from cafes where subway = '${subway}' and match(mainmenu_type) against ('${mainmenu_type}') order by RAND() LIMIT 2;`;
  } else {
    query1 = `SELECT * from cafes where subway = '${subway}' and exit_quarter in (${exit_quarter}) and not match(mood2) against('큰프') and match(mainmenu_type) against ('${mainmenu_type}') and mood1 not LIKE ('%포장만%') order by RAND() LIMIT 2;`;
    query2 = `SELECT * from cafes where subway = '${subway}' and exit_quarter in (${exit_quarter}) and match(mainmenu_type) against ('${mainmenu_type}') and mood1 not LIKE ('%포장만%') order by RAND() LIMIT 2;`;
    query3 = `SELECT * from cafes where subway = '${subway}' and match(mainmenu_type) against ('${mainmenu_type}') and mood1 not LIKE ('%포장만%') order by RAND() LIMIT 2;`;
  }
  console.log(`getCafe2함수에서 subway : ${subway}, exit_quarter : ${exit_quarter}, mainmenu_type : ${mainmenu_type}, mood1 : ${mood1}`);
  models.sequelize.query(query1).then(result => {
      if (result[0].length !== 0){
        // 2개 발견
        if (result[0].length >= 2) {
          return res.status(200).json({success: true, message: '2', result: result[0]})
        }
        // 1개만 발견
        else {
          models.sequelize.query(query2).then(result => {
            if (result[0].length >= 2) {
              return res.status(200).json({success: true, message: '1', result: result[0]})
            } else {
              models.sequelize.query(query3).then(result => {
                if (result[0].length >= 2) {
                  return res.status(200).json({success: true, message: '0', result: result[0]})
                } else {
                  return res.status(500).json({success: false})
                }
              }).catch(function (err){
                return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
              })
            }
          }).catch(function (err){
            return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
          })
        }

      }
      else {
        models.sequelize.query(query3).then(result => {
          if (result[0].length >= 2) {
            return res.status(200).json({success: true, message: '0', result: result[0]})
          } else {
            return res.status(500).json({success: false})
          }
        }).catch(function (err){
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
        })
      }
  }).catch(function (err){
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
  })
}

function getCafeTest(req, res) {
  console.log("getCafeTest arrived.");
  let subway = req.body.subway_cafe;
  let mainmenu_type = req.body.mainmenu_type;
  let query1, query2, query3;

  query1 = `SELECT * from cafes where subway = '${subway}' and not match(mainmenu_type) against ('${mainmenu_type}') order by RAND() LIMIT 2;`;
  query2 = `SELECT * from cafes where subway = '${subway}' and not match(mainmenu_type) against ('${mainmenu_type}') order by RAND() LIMIT 2;`;
  query3 = `SELECT * from cafes where subway = '${subway}' and not match(mainmenu_type) against ('${mainmenu_type}') order by RAND() LIMIT 2;`;

  models.sequelize.query(query1).then(result => {
      if (result[0].length !== 0){
        // 2개 발견
        if (result[0].length >= 2) {
          return res.status(200).json({success: true, message: '2', result: result[0]})
        }
        // 1개만 발견
        else {
          models.sequelize.query(query2).then(result => {
            if (result[0].length >= 2) {
              return res.status(200).json({success: true, message: '1', result: result[0]})
            } else {
              models.sequelize.query(query3).then(result => {
                if (result[0].length >= 2) {
                  return res.status(200).json({success: true, message: '0', result: result[0]})
                } else {
                  return res.status(500).json({success: false})
                }
              }).catch(function (err){
                return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
              })
            }
          }).catch(function (err){
            return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
          })
        }
      }
      else {
        models.sequelize.query(query3).then(result => {
          if (result[0].length >= 2) {
            return res.status(200).json({success: true, message: '0', result: result[0]})
          } else {
            return res.status(500).json({success: false})
          }
        }).catch(function (err){
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
        })
      }
  }).catch(function (err){
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
  })
}

function getCafe3(req, res) {
  const kakao_id = req.body.kakao_id;
  let subway = req.body.subway_cafe;
  let exit_quarter = req.body.exit_quarter;
  let mood1 = req.body.mood1;
  console.log(`getCafe3함수에서 subway : ${subway}, exit_quarter : ${exit_quarter}, mood1 : ${mood1}`);
  let query;
  if (mood1.includes('&&')) {
    console.log("&& included");
    models.sequelize.query(`SELECT * from cafes where subway = '${subway}' and exit_quarter in (${exit_quarter}) and not match(mood2) against('큰프') and mood1 in ('수다,노트북') order by RAND() LIMIT 2;`).then(result => {
        if (result[0].length !== 0){
          // 2개 발견
          if (result[0].length >= 2) {
            return res.status(200).json({success: true, message: '2', result: result[0]})
          }
          // 1개만 발견
          else {
            models.sequelize.query(`SELECT * from cafes where subway = '${subway}' and exit_quarter in (${exit_quarter}) and mood1 in ('수다,노트북') order by RAND() LIMIT 2;`).then(result => {
              if (result[0].length >= 2) {
                return res.status(200).json({success: true, message: '1', result: result[0]})
              } else {
                models.sequelize.query(`SELECT * from cafes where subway = '${subway}' and mood1 in ('수다,노트북') order by RAND() LIMIT 2;`).then(result => {
                  if (result[0].length >= 2) {
                    return res.status(200).json({success: true, message: '0', result: result[0]})
                  } else {
                    return res.status(500).json({success: false})
                  }
                }).catch(function (err){
                  return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
                })
              }
            }).catch(function (err){
              return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
            })
         }
        }
        else {
          models.sequelize.query(`SELECT * from cafes where subway = '${subway}' and mood1 in ('수다,노트북') order by RAND() LIMIT 2;`).then(result => {
            if (result[0].length >= 2) {
              return res.status(200).json({success: true, message: '0', result: result[0]})
            } else {
              return res.status(500).json({success: false})
            }
          }).catch(function (err){
            return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
          })
        }
    }).catch(function (err){
      return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    })
  } else {
    console.log("&& not included");
    models.sequelize.query(`SELECT * from cafes where subway = '${subway}' and exit_quarter in (${exit_quarter}) and not match(mood2) against('큰프') and match(mood1) against ('${mood1}') order by RAND() LIMIT 2;`).then(result => {
        if (result[0].length !== 0){
          // 2개 발견
          if (result[0].length >= 2) {
            return res.status(200).json({success: true, message: '2', result: result[0]})
          }
          // 1개만 발견
          else {
            models.sequelize.query(`SELECT * from cafes where subway = '${subway}' and exit_quarter in (${exit_quarter}) and match(mood1) against ('${mood1}') order by RAND() LIMIT 2;`).then(result => {
              if (result[0].length >= 2) {
                return res.status(200).json({success: true, message: '1', result: result[0]})
              } else {
                models.sequelize.query(`SELECT * from cafes where subway = '${subway}' and match(mood1) against ('${mood1}') order by RAND() LIMIT 2;`).then(result => {
                  if (result[0].length >= 2) {
                    return res.status(200).json({success: true, message: '0', result: result[0]})
                  } else {
                    return res.status(500).json({success: false})
                  }
                }).catch(function (err){
                  return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
                })
              }
            }).catch(function (err){
              return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
            })
         }
        }
        else {
          models.sequelize.query(`SELECT * from cafes where subway = '${subway}' and match(mood1) against ('${mood1}') order by RAND() LIMIT 2;`).then(result => {
            if (result[0].length >= 2) {
              return res.status(200).json({success: true, message: '0', result: result[0]})
            } else {
              return res.status(500).json({success: false})
            }
          }).catch(function (err){
            return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
          })
        }
    }).catch(function (err){
      return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
    })
  }
}

function getCafe4(req, res) {
  let subway = req.body.subway_cafe;
  let exit_quarter = req.body.exit_quarter;
  let mainmenu_type = req.body.mainmenu_type;
  let food_name = req.body.food_name;
  let mood2 = req.body.mood2;
  if(food_name === null || food_name === 'null') {
    food_name = '';
  }
  if(mood2 === null || mood2 === 'null') {
    mood2 = '';
  }
  console.log(`getCafe4함수에서 subway : ${subway}, exit_quarter : ${exit_quarter}, mainmenu_type : ${mainmenu_type}, food_name : ${food_name}, mood2 : ${mood2}`);

  models.sequelize.query(`SELECT * from cafes where subway = '${subway}' and exit_quarter in (${exit_quarter}) and not match(mood2) against('큰프') and mood2 LIKE '%${mood2}%' and match(mainmenu_type) against ('${mainmenu_type}') and food_name LIKE '%${food_name}%' order by RAND() LIMIT 2;`).then(result => {
      if (result[0].length !== 0){
        // 2개 발견
        if (result[0].length >= 2) {
          return res.status(200).json({success: true, message: '2', result: result[0]})
        }
        // 1개만 발견
        else {
          models.sequelize.query(`SELECT * from cafes where subway = '${subway}' and exit_quarter in (${exit_quarter}) and mood2 LIKE '%${mood2}%' and match(mainmenu_type) against ('${mainmenu_type}') and food_name LIKE '%${food_name}%' order by RAND() LIMIT 2;`).then(result => {
            if (result[0].length >= 2) {
              return res.status(200).json({success: true, message: '1', result: result[0]})
            } else {
              models.sequelize.query(`SELECT * from cafes where subway = '${subway}' and mood2 LIKE '%${mood2}%' and match(mainmenu_type) against ('${mainmenu_type}') and food_name LIKE '%${food_name}%' order by RAND() LIMIT 2;`).then(result => {
                if (result[0].length >= 2) {
                  return res.status(200).json({success: true, message: '0', result: result[0]})
                } else {
                  return res.status(500).json({success: false})
                }
              }).catch(function (err){
                return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
              })
            }
          }).catch(function (err){
            return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
          })
        }
      }
      else {
        models.sequelize.query(`SELECT * from cafes where subway = '${subway}' and mood2 LIKE '%${mood2}%' and match(mainmenu_type) against ('${mainmenu_type}') and food_name LIKE '%${food_name}%' order by RAND() LIMIT 2;`).then(result => {
          if (result[0].length >= 2) {
            return res.status(200).json({success: true, message: '0', result: result[0]})
          } else {
            return res.status(500).json({success: false})
          }
        }).catch(function (err){
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
        })
      }
  }).catch(function (err){
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
  })
}

function getCafe5(req, res) {
  console.log(req.body);
  let subway = req.body.subway_cafe;
  let exit_quarter = req.body.exit_quarter;
  let mainmenu_type = req.body.mainmenu_type;
  let food_name = req.body.food_name;
  let query1, query2, query3;
  if (mainmenu_type === null) {
    mainmenu_type = '';
  } else {
    mainmenu_type = req.body.mainmenu_type;
  }
  if (food_name === null) {
    food_name = '';
    query1 = `SELECT * from cafes where subway = '${subway}' and exit_quarter in (${exit_quarter}) and not match(mood2) against('큰프') and mainmenu_type LIKE ('%${mainmenu_type}%') order by RAND() LIMIT 2;`;
    query2 = `SELECT * from cafes where subway = '${subway}' and exit_quarter in (${exit_quarter}) and mainmenu_type LIKE ('%${mainmenu_type}%') order by RAND() LIMIT 2;`;
    query3 = `SELECT * from cafes where subway = '${subway}' and mainmenu_type LIKE ('%${mainmenu_type}%') order by RAND() LIMIT 2;`;
  } else {
    query1 = `SELECT * from cafes where subway = '${subway}' and exit_quarter in (${exit_quarter}) and not match(mood2) against('큰프') and mainmenu_type LIKE ('%${mainmenu_type}%') and match(food_name) against('${food_name}') order by RAND() LIMIT 2;`;
    query2 = `SELECT * from cafes where subway = '${subway}' and exit_quarter in (${exit_quarter}) and mainmenu_type LIKE ('%${mainmenu_type}%') and match(food_name) against('${food_name}') order by RAND() LIMIT 2;`;
    query3 = `SELECT * from cafes where subway = '${subway}' and mainmenu_type LIKE ('%${mainmenu_type}%') and match(food_name) against('${food_name}') order by RAND() LIMIT 2;`;
  }
  console.log(`getCafe5함수에서 subway : ${subway}, exit_quarter : ${exit_quarter}, mainmenu_type : ${mainmenu_type}, food_name : ${food_name}`);

  models.sequelize.query(query1).then(result => {
      if (result[0].length !== 0){
        // 2개 발견
        if (result[0].length >= 2) {
          return res.status(200).json({success: true, message: '2', result: result[0]})
        }
        // 1개만 발견
        else {
          models.sequelize.query(query2).then(result => {
            if (result[0].length >= 2) {
              return res.status(200).json({success: true, message: '1', result: result[0]})
            } else {
              models.sequelize.query(query3).then(result => {
                if (result[0].length >= 2) {
                  return res.status(200).json({success: true, message: '0', result: result[0]})
                } else {
                  return res.status(500).json({success: false})
                }
              }).catch(function (err){
                return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
              })
            }
          }).catch(function (err){
            return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
          })
        }
      }
      else {
        models.sequelize.query(query3).then(result => {
          if (result[0].length >= 2) {
            return res.status(200).json({success: true, message: '0', result: result[0]})
          } else {
            return res.status(500).json({success: false})
          }
        }).catch(function (err){
          return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
        })
      }
  }).catch(function (err){
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message})
  })
}

function updateMBTILogs(req, res) {
  const {socket_id, user_name, type, E, O, S, P, stack} = req.body;

  const query = `INSERT INTO MBTI_logs (socket_id, name, type, E, O, S, P, stack) VALUES ('${socket_id}', '${user_name}', '${type}', ${E}, ${O}, ${S}, ${P}, '${stack}');`;
  console.log(query);
  models.sequelize.query(query).then(() => {
    console.log('MBTI log saved.');
    return res.status(200).json({success: true});
  }).catch(err => {
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
  })
}

function addChelinguideItem(req, res) {
  const {user_id, res_name, region, subway, rating, comment, mood, price, img_urls} = req.body;
  const getInfo_query = `SELECT * FROM restaurants WHERE res_name='${res_name}' AND region='${region}' AND subway='${subway}';`;
  console.log(getInfo_query);
  models.sequelize.query(getInfo_query).then(result => {
    if (result[0].length === 0) {
      // 1. 유저이미지x & DB에 없는식당
      if (!img_urls || img_urls.length === 0) {
        console.log("1. 유저이미지x & DB에 없는식당");
        const res_images = [];
        const url = 'https://search.naver.com/search.naver?where=image&sm=tab_jum&query='+encodeURIComponent(`${subway} ${res_name}`);

        client.fetch(url, param, function(err, $, resp) {
          if (err) {
            console.log(err);
            return;
          }
          new Promise((resolve, reject) => {
            if ($('._img')['0']) {
              res_images.push($('._img')['0']['attribs']['data-source']);
              if ($('._img')['1']) {
                res_images.push($('._img')['1']['attribs']['data-source']);
                if ($('._img')['2']) {
                  res_images.push($('._img')['2']['attribs']['data-source']);
                  if ($('._img')['3']) {
                    res_images.push($('._img')['3']['attribs']['data-source']);
                    if ($('._img')['4']) {
                      res_images.push($('._img')['4']['attribs']['data-source']);
                    }
                  }
                }
              }
            }
            resolve();
          }).then(() => {
            const query = `INSERT INTO user_chelinguides (user_id, rating, comment, res_name, res_region, res_subway, res_mood, res_price, res_image1, res_image2, res_image3, res_image4, res_image5)
              VALUES ('${user_id}', ${rating}, '${comment}', '${res_name}', '${region}', '${subway}', ${mood?`'${mood}'`:'NULL'}, ${price?`'${price}'`:'NULL'},
              ${res_images[0]?`'${res_images[0]}'`:'NULL'}, ${res_images[1]?`'${res_images[1]}'`:'NULL'}, ${res_images[2]?`'${res_images[2]}'`:'NULL'}, ${res_images[3]?`'${res_images[3]}'`:'NULL'}, ${res_images[4]?`'${res_images[4]}'`:'NULL'});`;
            console.log(query);
            models.sequelize.query(query).then(() => {
              console.log('슐랭가이드 item added.');
              return res.status(200).json({success: true});
            }).catch(err => {
              return res.status(500).json({success: false, message: 'INSERT Fail. ' + err.message});
            });

          }).catch(err => {
            return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
          });
        });
      }

      // 2. 유저이미지o & DB에 없는식당
      else {
        console.log("2. 유저이미지o & DB에 없는식당");
        const query = `INSERT INTO user_chelinguides (user_id, rating, comment, res_name, res_region, res_subway, res_mood, res_price, res_image1, res_image2, res_image3, res_image4, res_image5)
          VALUES ('${user_id}', ${rating}, '${comment}', '${res_name}', '${region}', '${subway}', ${mood?`'${mood}'`:'NULL'}, ${price?`'${price}'`:'NULL'},
          ${img_urls[0]?`'${img_urls[0]}'`:'NULL'}, ${img_urls[1]?`'${img_urls[1]}'`:'NULL'}, ${img_urls[2]?`'${img_urls[2]}'`:'NULL'}, ${img_urls[3]?`'${img_urls[3]}'`:'NULL'}, ${img_urls[4]?`'${img_urls[4]}'`:'NULL'});`;
        console.log(query);
        models.sequelize.query(query).then(() => {
          console.log('슐랭가이드 item added.');
          return res.status(200).json({success: true});
        }).catch(err => {
          return res.status(500).json({success: false, message: 'INSERT Fail. ' + err.message});
        });
      }
    }
    else {
      const {id, mood2, food_type, food_name} = result[0][0];
      let res_price = (result[0][0].price_dinner) ? result[0][0].price_dinner : result[0][0].price_lunch;
      if (res_price) {
        res_price = res_price.replace('4', '4만원 이상').replace('1', '1만원 대').replace('0', '1만원 미만');
        if (res_price.includes('2') && res_price.includes('3')) {
          res_price = res_price.replace('2,', '').replace('3', '2~3만원 대');
        } else if (res_price.includes('2') || res_price.includes('3')) {
          res_price = res_price.replace('2', '2~3만원 대');
          res_price = res_price.replace('3', '2~3만원 대');
        }
      }
      // 3. 유저이미지x & DB에 있는식당
      if (!img_urls || img_urls.length === 0) {
        console.log("3. 유저이미지x & DB에 있는식당");
        const res_images = [];
        const url = 'https://search.naver.com/search.naver?where=image&sm=tab_jum&query='+encodeURIComponent(`${result[0][0].subway} ${result[0][0].res_name}`);

        client.fetch(url, param, function(err, $, resp) {
          if (err) {
              console.log(err);
              return;
          }
          new Promise((resolve, reject) => {
            if ($('._img')['0']) {
              res_images.push($('._img')['0']['attribs']['data-source']);
              if ($('._img')['1']) {
                res_images.push($('._img')['1']['attribs']['data-source']);
                if ($('._img')['2']) {
                  res_images.push($('._img')['2']['attribs']['data-source']);
                  if ($('._img')['3']) {
                    res_images.push($('._img')['3']['attribs']['data-source']);
                    if ($('._img')['4']) {
                      res_images.push($('._img')['4']['attribs']['data-source']);
                    }
                  }
                }
              }
            }
            resolve();
          }).then(() => {
            const query = `INSERT INTO user_chelinguides (user_id, rating, comment, res_id, res_name, res_region, res_subway, res_food_type, res_food_name, res_mood, res_price, res_image1, res_image2, res_image3, res_image4, res_image5)
              VALUES ('${user_id}', ${rating}, '${comment}', ${id}, '${res_name}', '${region}', '${subway}', '${food_type}', '${food_name}', '${mood?mood:mood2}', '${price?price:res_price}',
              ${res_images[0]?`'${res_images[0]}'`:'NULL'}, ${res_images[1]?`'${res_images[1]}'`:'NULL'}, ${res_images[2]?`'${res_images[2]}'`:'NULL'}, ${res_images[3]?`'${res_images[3]}'`:'NULL'}, ${res_images[4]?`'${res_images[4]}'`:'NULL'});`;
            console.log(query);
            models.sequelize.query(query).then(() => {
              console.log('슐랭가이드 item added.');
              return res.status(200).json({success: true});
            }).catch(err => {
              return res.status(500).json({success: false, message: 'INSERT SQL 에러 ' + err.message});
            });

          }).catch(err => {
            return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
          });
        });
      }
      // 4. 유저이미지o & DB에 있는식당
      else {
        console.log("4. 유저이미지o & DB에 있는식당");
        const query = `INSERT INTO user_chelinguides (user_id, rating, comment, res_id, res_name, res_region, res_subway, res_food_type, res_food_name, res_mood, res_price, res_image1, res_image2, res_image3, res_image4, res_image5)
          VALUES ('${user_id}', ${rating}, '${comment}', ${id}, '${res_name}', '${region}', '${subway}', '${food_type}', '${food_name}', '${mood?mood:mood2}', '${price?price:res_price}',
          ${img_urls[0]?`'${img_urls[0]}'`:'NULL'}, ${img_urls[1]?`'${img_urls[1]}'`:'NULL'}, ${img_urls[2]?`'${img_urls[2]}'`:'NULL'}, ${img_urls[3]?`'${img_urls[3]}'`:'NULL'}, ${img_urls[4]?`'${img_urls[4]}'`:'NULL'});`;
        console.log(query);
        models.sequelize.query(query).then(() => {
          console.log('슐랭가이드 item added.');
          return res.status(200).json({success: true});
        }).catch(err => {
          return res.status(500).json({success: false, message: 'Insert SQL 에러' + err.message});
        });
      }
    }

  }).catch(err => {
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
  });
}

function modifyChelinguideItem(req, res) {
  const {id, user_id, res_name, region, subway, rating, comment, price, mood, img_urls} = req.body;

  let query = `UPDATE user_chelinguides
               SET res_name='${res_name}', res_region='${region}', res_subway='${subway}', rating=${rating},
                   comment='${comment}', res_price='${price}', res_mood='${mood}'`;
  if (img_urls) {
    query += `, res_image1=${img_urls[0] ? `'${img_urls[0]}'` : 'NULL'} `;
    query += `, res_image2=${img_urls[1] ? `'${img_urls[1]}'` : 'NULL'} `;
    query += `, res_image3=${img_urls[2] ? `'${img_urls[2]}'` : 'NULL'} `;
    query += `, res_image4=${img_urls[3] ? `'${img_urls[3]}'` : 'NULL'} `;
    query += `, res_image5=${img_urls[4] ? `'${img_urls[4]}'` : 'NULL'} `;
  }
  query += `WHERE id=${id};`
  console.log(query);
  models.sequelize.query(query).then(result => {
    console.log('슐랭가이드 item modified.');
    return res.status(200).json({success: true});
  }).catch(err => {
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
  });
}

function deleteChelinguideItem(req, res) {
  const {user_id, id} = req.body;
  const query = `DELETE FROM user_chelinguides WHERE user_id='${user_id}' AND id='${id}';`;
  console.log(query);
  models.sequelize.query(query).then(result => {
    console.log('슐랭가이드 item deleted.');
    return res.status(200).json({success: true});
  }).catch(err => {
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
  });
}

function getChelinguideList(req, res) {
  const {user_id, region, subway, sortby} = req.body;
  let query = `SELECT * FROM user_chelinguides WHERE user_id='${user_id}' AND res_region='${region}' AND res_subway='${subway}' `;
  if (sortby === 'res_name' || sortby === '이름순') {
    query += `ORDER BY res_name;`;
  } else if (sortby === 'rating' || sortby === '별점순') {
    query += `ORDER BY rating DESC;`;
  } else if (sortby === 'updated_at' || sortby === '최신순') {
    query += `ORDER BY updated_at DESC;`;
  } else {
    query += ';';
  }

  console.log(query);
  models.sequelize.query(query).then(result => {
    return res.status(200).json({success: true, num: result[0].length, message: result[0]});
  }).catch(err => {
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
  });
}

function getChelinguideItemInfo(req, res) {
  const {user_id, id} = req.body;
  const query = `SELECT * FROM user_chelinguides WHERE user_id='${user_id}' AND id='${id}';`;
  console.log(query);
  models.sequelize.query(query).then(result => {
    return res.status(200).json({success: true, message: result[0]});
  }).catch(err => {
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
  });
}

function savePlan(req, res) {
  const {name, password, plan_type} = req.body;
  const query = `INSERT INTO tour_users VALUES('${name}', '${password}', '${plan_type}');`;
  console.log(query);
  models.sequelize.query(query).then(result => {
    console.log("Insert Succeed");
    return res.status(200).json({success: true});
  }).catch(err => {
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
  });
}

function searchPlan(req, res) {
  const {name, password} = req.body;
  const query = `SELECT * FROM tour_users WHERE name='${name}' AND password='${password}';`;
  console.log(query);
  models.sequelize.query(query).then(result => {
    if (result[0] && result[0].length > 0) {
      return res.status(200).json({success: true, message: result[0]});
    } else {
      return res.status(200).json({success: false, message: 'no result'});
    }
  }).catch(err => {
    return res.status(500).json({success: false, message: 'Internal Server or Database Error. err: ' + err.message});
  });
}

module.exports = {
    crawlTwoImage: crawlTwoImage,
    crawlImage: crawlImage,

    verifyToken: verifyToken,
    checkTokenVerified: checkTokenVerified,
    registerUser: registerUser,
    login: login,
    socialLogin: socialLogin,
    logout: logout,
    sendNewPassword: sendNewPassword,
    sendInquiry: sendInquiry,
    memberWithdraw: memberWithdraw,
    updatePassword: updatePassword,
    updateSocket: updateSocket,
    getChatLog: getChatLog,
    deleteChatLog: deleteChatLog,

    previousRegisterUser: previousRegisterUser,
    updateUser: updateUser,
    updateLimitCnt: updateLimitCnt,
    updateState: updateState,
    updateChatLog: updateChatLog,

    updateStateEmail: updateStateEmail,
    updatePartLog: updatePartLog,
    deletePartLog: deletePartLog,
    getPartLog: getPartLog,
    registerOnetimeUser: registerOnetimeUser,
    loginOnetime: loginOnetime,

    getUserInfo: getUserInfo,
    getRestaurant: getRestaurant,
    getTwoRestaurant: getTwoRestaurant,
    getRestaurantInfo: getRestaurantInfo,
    updateUserStart: updateUserStart,
    updatePlaceStart: updatePlaceStart,
    updatePlaceInfo: updatePlaceInfo,
    updateMidInfo: updateMidInfo,
    updateRest2: updateRest2,
    getSubwayHistory: getSubwayHistory,
    verifyLimit: verifyLimit,
    createUserLog: createUserLog,
    createUserFeedback: createUserFeedback,
    getCountHistory: getCountHistory,
    getAllHistory: getAllHistory,
    getFeedbackInfo: getFeedbackInfo,
    getAllSubway: getAllSubway,
    getAllRestsaurant: getAllRestsaurant,
    getSimilarRestaurant: getSimilarRestaurant,
    getOtherRestaurant: getOtherRestaurant,
    getOtherDrinkRestaurant: getOtherDrinkRestaurant,
    verifySearchFood: verifySearchFood,
    verifySubway: verifySubway,
    verifySubwayDrinktype: verifySubwayDrinktype,
    verifySubwayThema: verifySubwayThema,
    verifySubwayDetailThema: verifySubwayDetailThema,
    getSubwayListHistory: getSubwayListHistory,
    getUserInfoByEmail: getUserInfoByEmail,
    findSubwayDrinkType: findSubwayDrinkType,
    getDrinkRestaurant: getDrinkRestaurant,
    getSimilarDrinkRestaurant: getSimilarDrinkRestaurant,
    updateDrinkStart: updateDrinkStart,
    updateLimitCntDrink: updateLimitCntDrink,
    verifyLimitDrink: verifyLimitDrink,
    updateLimitCntCafe: updateLimitCntCafe,
    verifyLimitCafe: verifyLimitCafe,
    updateCafeStart: updateCafeStart,
    updateCafe2: updateCafe2,
    getCafe: getCafe,
    getCafe2: getCafe2,
    getCafe3: getCafe3,
    getCafe4: getCafe4,
    getCafe5: getCafe5,
    getCafeInfo: getCafeInfo,
    createDecideHistory: createDecideHistory,
    getCafeTest: getCafeTest,
    verifyMood2: verifyMood2,
    verifyResultExist: verifyResultExist,
    getNearRestaurant: getNearRestaurant,
    getRestaurantSubway: getRestaurantSubway,
    setRestaurantLatLng: setRestaurantLatLng,
    updateClosedown: updateClosedown,
    verifyDrinktypeList: verifyDrinktypeList,
    updateMBTILogs: updateMBTILogs,
    addChelinguideItem: addChelinguideItem,
    modifyChelinguideItem: modifyChelinguideItem,
    deleteChelinguideItem: deleteChelinguideItem,
    getChelinguideList: getChelinguideList,
    getChelinguideItemInfo: getChelinguideItemInfo,
    savePlan: savePlan,
    searchPlan: searchPlan,
}

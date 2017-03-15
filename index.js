var express = require('express'),
    config =  require('./config'),
    session = require('express-session'),
    SessionStore = require('connect-redis')(session),
    log = console.log,
    redis = new require('ioredis')(config.redisUrl),
    mongoose = require('mongoose'),
    Promise = require('bluebird'),
    Schema = mongoose.Schema,
    bodyParser = require('body-parser'),
    bcrypt = require('bcryptjs'),
    bcryptGenSalt  = Promise.promisify(bcrypt.genSalt),
    bcryptHash     = Promise.promisify(bcrypt.hash),
    bcryptCompare  = Promise.promisify(bcrypt.compare),
    app = express();


function generatePasswordHash(password) {
    // Generate a new salt
    return bcryptGenSalt().then(function (salt) {
        // Hash the provided password with bcrypt
        return bcryptHash(password, salt);
    });
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

function uid(len) {
    var buf = [],
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        charlen = chars.length,
        i;

    for (i = 1; i < len; i = i + 1) {
        buf.push(chars[getRandomInt(0, charlen - 1)]);
    }

    return buf.join('');
}

var userSchema = new Schema({
    id:  String,
    password: String,
    type:   String,
    create_date: { type: Date, default: new Date().toLocaleString() },
});

var User = mongoose.model('User', userSchema);

mongoose.connect("mongodb://127.0.0.1:27017/usermicroservice");
mongoose.Promise = Promise;
app.set('trust proxy', 1);

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(session({
    name: 'session',
    store: new SessionStore({
        client: redis
    }),
    proxy: true,
    resave: true,
    saveUninitialized: true,
    secret: 'nice boat',
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

app.get('/', function (req, res) {
    res.send(req.session);
});

app.get('/setup/', function (req, res) {
    var user = new User({ id: req.query.userID, password: req.query.password});
    User.findOne({id: req.query.userID}).exec().then(function (data) {
        if (data) {
            res.redirect('/login/?userID=' + req.query.userID + '&password=' + req.query.password);
        } else {
            generatePasswordHash(user.password).then(function(hash) {
                user.password = hash;
                user.save().then(function (data) {
                    res.redirect('/login/?userID=' + req.query.userID + '&password=' + req.query.password);
            });
            });
        }
    });

});

app.get('/login/', function(req, res) {
    User.findOne({id: req.query.userID}).exec().then(function (data) {
        if (data) {
            bcryptCompare(req.query.password, data.password).then(function(matched) {
                if (matched) {
                    data = data.toObject();
                    delete data.password;
                    req.session.user = data;
                    req.session.save();
                    var token = uid(256);
                    redis.set('token:'+ token, req.session.user.id, 'EX',30 * 24 * 3600)
                        .then(function () {
                            res.json({msg: 'ok', token: token});
                        })
                    } else {
                    res.json({msg: 'wrong userID or password'});
                }
            });
        } else {
            res.json({msg: 'no user'});
        }
    });
});

app.get('/token/', function(req, res){
    if (req.session && req.session.user) {
        var token = uid(256);
        redis.set('token:'+ token, req.session.user.id, 'EX',30 * 24 * 3600)
            .then(function () {
                res.send(token);
            })
    }
});

app.get('/user/', function(req, res) {
   if (req.session && req.session.user) {
       res.send(req.session.user);
   } else if (req.query.userToken){
       redis.get('token:'+ req.query.userToken).then(function (userID) {
          if (userID) {
              User.findOne({id: userID}).exec().then(function (data) {
                  data = data.toObject();
                  delete data.password;
                  res.json({msg: 'ok', user: data});
              });
          } else {
              res.json({msg: 'need login'});
          }
       });
   } else {
       res.json({msg: 'need login'});
   }
});

app.listen(config.port);

console.log("Server is listening: " + config.port);


process.on("uncaughtException", function (err) {
    console.log(err);
});

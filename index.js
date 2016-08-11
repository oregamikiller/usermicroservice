var express = require('express'),
    config =  require('./config'),
    session = require('express-session'),
    SessionStore = require('connect-redis')(session),
    log = console.log,
    redis = new require('ioredis')(config.redisUrl),
    MongoClient = require('mongodb').MongoClient,
    mongoose = require('mongoose'),
    Promise = require('bluebird'),
    Schema = mongoose.Schema,
    app = express();

MongoClient.connect("mongodb://localhost:27017/usermicroservice", function (err, mdb) {
    db = mdb;
});


var userSchema = new Schema({
    id:  String,
    password: String,
    type:   String,
    create_date: { type: Date, default: Date.now },
});

var User = mongoose.model('User', userSchema);

mongoose.connect("mongodb://localhost:27017/usermicroservice");
mongoose.Promise = Promise;
app.set('trust proxy', 1);
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
    log(req.session);
    res.send(req.session);
});

app.get('/setup/', function (req, res) {
    console.log(req.query.userID, req.query.password);
    var user = new User({ id: req.query.userID, password: req.query.password});
    User.findOne({id: req.query.userID}).exec().then(function (data) {
        if (data) {
            res.send('already exist');
        } else {
            user.save().then(function (data) {
                res.send(data);
            });
        }
    });

});

app.listen(80);



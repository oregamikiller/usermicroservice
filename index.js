var express = require('express'),
    config =  require('./config'),
    session = require('express-session'),
    SessionStore = require('connect-redis')(session),
    log = console.log,
    redis = new require('ioredis')(config.redisUrl),
    MongoClient = require('mongodb').MongoClient,
    db          = null,
    app = express();


MongoClient.connect("mongodb://localhost:27017/usermicroservice", function (err, mdb) {
    db = mdb;
});
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
    console.log(req.query.userID);
    db.collection("users").insert({id: req.query.userID})
    res.send(req.query.userID);
});

app.listen(80);



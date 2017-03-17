
'use strict';

const path = require('path');
const logger = require('morgan');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const passport = require('passport');


let app = express();
let expressWs = require('express-ws')(app);

app.use(logger('dev'));

app.use('/assets', express.static('assets'));

app.use(cookieParser());

//app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({}));

app.use(session({
    secret: 'mushy hallucinations',
    resave: false,
    saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());
let requireAuth = (req, res, next) => { if (!req.isAuthenticated()) res.status(400).send(); else next() };

app.use('/user', require('./users'));
app.ws('/socket', require('./connection'));

const media = require('./media');
app.use('/uploads', requireAuth, media.router);
app.use('/media', requireAuth, media.allowAccess, express.static('data/media'));


app.get('*', function (req, res) {
    res.sendFile(path.normalize(path.join(__dirname, "../index.html")));
})

app.listen(3000, function () {
    console.log('app is listening on port 3000!');
})

module.exports = app;


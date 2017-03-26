
'use strict';

const path = require('path');
const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const World = require('./world');


let router = express.Router();
let saltRounds = 10;
let minPassword = 6;
let maxPassword = 32;

passport.use(new LocalStrategy(function(username, password, done) {
    let player = World.Player.find(username);
    if (!player || !bcrypt.compareSync(password, player.password))
        return done(null, false, { message: "Invalid username or password" });
    else
        return done(null, { id: player.id, player: player });
}));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    let player = World.DB.get_object(id, World.Player);
    if (!player)
        done(null, { id: -1 });
    else
        done(null, { id: id, player: player });
});

const authenticate = function (req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err); }
        if (!user) { return res.status(400).json({ authenticated: false, error: "Invalid username or password" }); }
        req.logIn(user, function() {
            res.json({ authenticated: true, prefs: user.player.get_prefs() });
        });
    })(req, res, next);
};



router.get('/info', function(req, res, next) {
    if (!req.isAuthenticated() || !req.user || !req.user.player)
        res.json({ authenticated: false });
    else
        res.json({ authenticated: true, prefs: req.user.player.get_prefs() });
});

router.post('/login', function(req, res, next) {
    authenticate(req, res, next);
});

router.put('/signup', function(req, res, next) {
    if (!req.body.username || World.Player.find(req.body.username))
        res.status(400).json({ authenticated: false, error: "That username is already taken" });
    else if (req.body.password.length < minPassword)
        res.status(400).json({ authenticated: false, error: "Passwords must be at least " + minPassword + " characters long" });
    else if (req.body.password.length > maxPassword)
        res.status(400).json({ authenticated: false, error: "Passwords can be no longer than " + maxPassword + " characters long" });
    else {
        // TODO verify email??
        let hash = bcrypt.hashSync(req.body.password, saltRounds);
        let player = World.Player.create_new(req.body.username, hash, req.body.email);
        authenticate(req, res, next);
    }
});

router.post('/passwd', function(req, res, next) {
    // TODO change password
    //bcrypt.hash(req.body.password, function (hash) { console.log(hash); });
    //db.run('UPDATE notes SET `password`="' + req.body.title + '", `body`="' + req.body.body + '" WHERE `username`="' + req.body.username + '"', function (err, row) {
});

module.exports = router;


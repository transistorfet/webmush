
'use strict';

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
    let user = World.Player.find(username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return done(null, false, { message: "Invalid username or password" });
    }
    return done(null, user);
}));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    // TODO just return the id??
    //let user = World.Objects[id];
    let user = { id: id, player: id };
    done(null, user);
});


router.post('/login', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err); }
        if (!user) { return res.status(400).json({ authenticated: false, error: "Invalid username or password" }); }
        req.logIn(user, function() {
            res.status(200).send({ authenticated: true });
        });
    })(req, res, next);
});

router.put('/signup', function(req, res, next) {
    if (!req.body.username || World.Player.find(req.body.username))
        return res.status(400).json({ authenticated: false, error: "That username is already taken" });
    if (req.body.password.length < minPassword)
        return res.status(400).json({ authenticated: false, error: "Passwords must be at least " + minPassword + " characters long" });
    if (req.body.password.length > maxPassword)
        return res.status(400).json({ authenticated: false, error: "Passwords can be no longer than " + maxPassword + " characters long" });
    // TODO verify email??

    let hash = bcrypt.hashSync(req.body.password, saltRounds);
    let player = World.Player.createNew(req.body.username, hash, req.body.email);

    passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err); }
        if (!user) { return res.status(400).json({ authenticated: false, error: "Invalid username or password" }); }
        req.logIn(user, function() {
            res.status(200).send({ authenticated: true });
        });
    })(req, res, next);
});

router.post('/passwd', function(req, res, next) {
    // TODO change password
    //bcrypt.hash(req.body.password, function (hash) { console.log(hash); });
    //db.run('UPDATE notes SET `password`="' + req.body.title + '", `body`="' + req.body.body + '" WHERE `username`="' + req.body.username + '"', function (err, row) {
});




/*
const sqlite3 = require("sqlite3").verbose();
let db = new sqlite3.Database('data.db');

db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, email TEXT, player TEXT)");

passport.use(new LocalStrategy(function(username, password, done) {
    db.get("SELECT id,username,password FROM users WHERE username=?", username, function (err, user) {
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
    });
}));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    db.get("SELECT id,username,email,player FROM users WHERE id=?", id, function (err, user) {
        user.player = parseInt(user.player);
        done(err, user);
    });
});


router.post('/login', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        console.log(err, user, info);
        if (err) { return next(err); }
        if (!user) { return res.status(400).json({ authenticated: false, error: "Invalid username or password" }); }
        req.logIn(user, function() {
            res.status(200).send({ authenticated: true });
        });
    })(req, res, next);
});

router.put('/signup', function(req, res, next) {
    if (!req.body.username) // || user already exists
        return res.status(400).json({ authenticated: false, error: "That username is already taken" });
    if (req.body.password.length < minPassword)
        return res.status(400).json({ authenticated: false, error: "Passwords must be at least " + minPassword + " characters long" });
    if (req.body.password.length > maxPassword)
        return res.status(400).json({ authenticated: false, error: "Passwords can be no longer than " + maxPassword + " characters long" });
    // TODO verify email??

    let hash = bcrypt.hashSync(req.body.password, saltRounds);
    let player = World.createNewPlayer(req.body.username, hash, req.body.email);
    db.run('INSERT INTO users (username,password,email,player) VALUES ("' + req.body.username + '", "' + hash + '", "' + req.body.email + '", "' + player + '")', function (err, row) {
        passport.authenticate('local', function(err, user, info) {
            if (err) { return next(err); }
            if (!user) { return res.status(400).json({ authenticated: false, error: "Invalid username or password" }); }
            req.logIn(user, function() {
                res.status(200).send({ authenticated: true });
            });
        })(req, res, next);
    });
});
*/

/*
router.post('/user/:id', function(req, res, next) {
  db.run('UPDATE notes SET `title`="' + req.body.title + '", `body`="' + req.body.body + '" WHERE `id`="' + req.params.id + '"', function (err, row) {
    console.log(err, row);
    res.setHeader('Content-Type', 'application/json');
    res.status(!err ? 200 : 404);
    res.send(JSON.stringify(!err ? true : false));
  });
});

router.delete('/user/delete/:id', function(req, res, next) {
  db.run('DELETE FROM notes WHERE `id`="' + req.params.id + '"', function (err, row) {
    console.log(err, row);
    res.setHeader('Content-Type', 'application/json');
    res.status(!err ? 200 : 404);
    res.send(JSON.stringify(!err ? true : false));
  });
});
*/




module.exports = router;


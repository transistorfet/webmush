
'use strict';

const express = require('express');
const sqlite3 = require("sqlite3").verbose();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

let router = express.Router();
let db = new sqlite3.Database('data.db');

db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, email TEXT, player TEXT)");


//router.post('/login', passport.authenticate('local', {
    //successRedirect: '/world',
    //failureRedirect: '/login',
//}));

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

/*
router.post('/login', function(req, res, next) {
  db.get("SELECT id,username,password FROM users WHERE username=?", req.body.username, function (err, rows) {
    if (!rows || rows.password != req.body.password) {
      res.json({"error": "Invalid username or password"});
    }
    else {
      res.json({"success": "Successfully logged in"});
    }
  });
});
*/

router.put('/register', function(req, res, next) {
  db.run('INSERT INTO users (username,password) VALUES ("' + req.body.username + '", "' + req.body.password + '")', function (err, row) {
    console.log(err, row);
    res.setHeader('Content-Type', 'application/json');
    res.status(!err ? 200 : 404);
    res.send(JSON.stringify(!err ? true : false));
  });
});

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

passport.use(new LocalStrategy(function(username, password, done) {
    db.get("SELECT id,username,password FROM users WHERE username=?", username, function (err, user) {
        if (!user || user.password != password) {
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


module.exports = router;


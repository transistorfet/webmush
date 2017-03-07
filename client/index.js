
'use strict';
 
const m = require('mithril');

const Page = require('./components/layout');
const Users = require('./components/users');
const Welcome = require('./components/welcome');
const World = require('./components/world');


document.addEventListener('DOMContentLoaded', function ()
{
    m.route.prefix('');

    m.route(document.getElementById('main'), '/', {
        '/': Page(Welcome),
        '/world': Page(World),
        '/login': Page(Users.Login),
        '/signup': Page(Users.SignUp),
    });
});


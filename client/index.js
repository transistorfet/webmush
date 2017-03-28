
'use strict';

require('../css/normalize.css');
require('../css/style.css');
require('../css/navbar.css');


const m = require('mithril');

const Page = require('./layout');
const Users = require('./users');
const Media = require('./media/components');
const World = require('./world/components');
const Welcome = require('./welcome');


document.addEventListener('DOMContentLoaded', function ()
{
    m.route.prefix('');

    m.route(document.getElementById('main'), '/', {
        '/': Page(Welcome),
        '/login': Page(Users.Login),
        '/signup': Page(Users.SignUp),
        '/world': Page(World, true),
        '/manage': Page(Media.Manager, true),
    });
});


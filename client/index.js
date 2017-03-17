
'use strict';
 
const m = require('mithril');

const Page = require('./layout');
const User = require('./user/components');
const Media = require('./media/components');
const World = require('./world/components');
const Welcome = require('./welcome');


document.addEventListener('DOMContentLoaded', function ()
{
    m.route.prefix('');

    m.route(document.getElementById('main'), '/', {
        '/': Page(Welcome),
        '/login': Page(User.Login),
        '/signup': Page(User.SignUp),
        '/world': Page(World, true),
        '/manage': Page(Media.Manager, true),
    });
});


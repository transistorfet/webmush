
'use strict';

const m = require('mithril');

const websocket = require('./websocket');
const UserInfo = require('./user/model');

const Page = function(content, require)
{
    return {
        view: function (vnode) {
            if (require)
                websocket.connect();
            return [
                UserInfo.prefs.theme ? m('style', UserInfo.prefs.theme) : '',
                m('div', { id: 'side-nav', class: "navbar horizontal" }, m(SideNav)),
                m('div', { id: 'content' }, [
                    m(content),
                ]),
            ];
        },
    };
};

const UserNav = {
    view: function (vnode) {
        if (websocket.isConnected())
            return m('a', { href: "/login", oncreate: m.route.link, onclick: () => { websocket.disconnect() } }, "Logout");
        else 
            return [
                m('a', { href: "/login", oncreate: m.route.link }, "Login"),
                " | ",
                m('a', { href: "/signup", oncreate: m.route.link }, "Sign Up"),
            ];
    },
}

const SideNav = {
    view: function (vnode) {
        return m('ul', [
            m('li', [
                m('a', { href: "#" }, "Places"),
                m('ul', [
                    m('li', m('a', { href: "/home", oncreate: m.route.link }, "Home")),
                    m('li', m('a', { href: "/world", oncreate: m.route.link }, "World")),
                ]),
            ]),
            websocket.isConnected() ? m('li', [
                m('a', { href: "#" }, "You"),
                m('ul', [
                    m('li', m('a', { href: "/profile", oncreate: m.route.link }, "Profile")),
                    m('li', m('a', { href: "/manage", oncreate: m.route.link }, "Uploads")),
                ]),
            ]) : '',
            m('div', { id: 'user-nav' }, m(UserNav)),
        ]);
    },
}

module.exports = Page;
 


'use strict';

const m = require('mithril');

const Page = function(content)
{
    return {
        view: function (vnode) {
            return [
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
        return m('a', { href: "/login" }, "Login");
    },
}

const SideNav = {
    view: function (vnode) {
        return m('ul', [
            m('li', [
                m('a', { href: "#" }, "Places"),
                m('ul', [
                    m('li', m('a', { href: "/home" }, "Home")),
                ]),
            ]),
            m('li', m('a', { href: "/things" }, "Things")),
            m('div', { id: 'user-nav' }, m(UserNav)),
        ]);
    },
}

module.exports = Page;
 

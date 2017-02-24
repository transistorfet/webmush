 
'use strict';

const m = require('mithril');


const Login = {
    username: '',
    password: '',
    error: '',

    onsubmit: function (e) {
        e.preventDefault();

        m.request({
            method: "POST",
            url: '/user/login',
            data: {
                username: Login.username,
                password: Login.password,
            },
            //serialize: function(data) { return m.buildQueryString(data) },
        }).then(function (response) {
            if (response.authenticated)
                m.route.set('/world');
        }).catch(function (response) {
            Login.error = response.error;
        });
    },
    view: function (vnode) {
        //return m('form', { method: "POST", action: "/user/login" }, [
        return m('form', { onsubmit: Login.onsubmit }, [
            Login.error ? m('span', { class: "error" }, Login.error) : m('span'),
            m('div', { class: "form-item" }, [
                m('label', "Username"),
                m('input', { type: "text", name: "username", onchange: m.withAttr('value', (x) => { Login.username = x }) }),
            ]),
            m('div', { class: "form-item" }, [
                m('label', "Password"),
                m('input', { type: "password", name: "password", onchange: m.withAttr('value', (x) => { Login.password = x }) }),
            ]),
            m('input', { type: "submit", value: "Login" }),
        ]);
    },
};

const Register = {
    view: function (vnode) {
        return m('form', { method: "POST", action: "/user/register" }, [
            m('div', { class: "form-item" }, [
                m('label', "Username"),
                m('input', { type: "text", name: "username" }),
            ]),
            m('input', { type: "password", name: "password" }),
            m('br'),
            m('input', { type: "password", name: "retype_password" }),
            m('br'),
            m('input', { type: "text", name: "email" }),
            m('br'),
            m('input', { type: "submit", value: "Register" }),
        ]);
    },
};

module.exports = {
    Login,
    Register,
};


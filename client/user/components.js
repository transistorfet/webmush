 
'use strict';

const m = require('mithril');

const UserInfo = require('./model');

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
                username: this.username,
                password: this.password,
            },
            //serialize: function(data) { return m.buildQueryString(data) },
        }).then(function (response) {
            if (response.authenticated) {
                console.log("PREFS", response.prefs);
                UserInfo.prefs = response.prefs;
                m.route.set('/world');
            }
        }).catch(function (response) {
            this.error = response.error;
        }.bind(this));
    },

    view: function (vnode) {
        //return m('form', { method: "POST", action: "/user/login" }, [
        return m('form', { onsubmit: this.onsubmit.bind(this) }, [
            this.error ? m('span', { class: "error" }, this.error) : m('span'),
            m('div', { class: "form-item" }, [
                m('label', "Username"),
                m('input', { type: "text", name: "username", onchange: m.withAttr('value', (x) => { this.username = x }) }),
            ]),
            m('div', { class: "form-item" }, [
                m('label', "Password"),
                m('input', { type: "password", name: "password", onchange: m.withAttr('value', (x) => { this.password = x }) }),
            ]),
            m('input', { type: "submit", value: "Login" }),
        ]);
    },
};

const SignUp = {
    username: '',
    password: '',
    retype: '',
    email: '',
    error: '',

    onsubmit: function (e) {
        e.preventDefault();
        console.log(this.username, this.password, this.retype, this.email);

        if (this.password != this.retype) {
            this.error = "The passwords entered to do match";
            return;
        }

        m.request({
            method: "PUT",
            url: '/user/signup',
            data: {
                username: this.username,
                password: this.password,
                email: this.email,
            },
        }).then(function (response) {
            if (response.authenticated) {
                UserInfo.prefs = response.prefs;
                m.route.set('/world');
            }
        }).catch(function (response) {
            this.error = response.error;
        }.bind(this));
    },

    view: function (vnode) {
        return m('form', { onsubmit: this.onsubmit.bind(this) }, [
            this.error ? m('span', { class: "error" }, this.error) : m('span'),
            m('div', { class: "form-item" }, [
                m('label', "Username"),
                m('input', { type: "text", name: "username", onchange: m.withAttr('value', (x) => { this.username = x }) }),
            ]),
            m('div', { class: "form-item" }, [
                m('label', "Password"),
                m('input', { type: "password", name: "password", onchange: m.withAttr('value', (x) => { this.password = x }) }),
            ]),
            m('div', { class: "form-item" }, [
                m('label', "Retype Password"),
                m('input', { type: "password", name: "retype_password", onchange: m.withAttr('value', (x) => { this.retype = x }) }),
            ]),
            m('div', { class: "form-item" }, [
                m('label', "Email"),
                m('input', { type: "text", name: "email", onchange: m.withAttr('value', (x) => { this.email = x }) }),
            ]),
            m('input', { type: "submit", value: "Register" }),
        ]);
    },
};

module.exports = {
    Login,
    SignUp,
};


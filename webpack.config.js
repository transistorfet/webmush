 
const path = require("path");

module.exports = {
    context: path.join(__dirname, "client"),
    entry: "./index.js",

    output: {
        path: path.join(__dirname, "assets/js"),
        filename: "bundle.js",
    },

    resolve: {
        extensions: ['.js', '.jsx'],
    },
};


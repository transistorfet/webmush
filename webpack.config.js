 
const path = require("path");
const ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
    context: path.join(__dirname, "client"),
    entry: "./index.js",

    output: {
        path: path.join(__dirname, "build"),
        filename: "bundle.js",
    },

    resolve: {
        extensions: ['.js', '.jsx', '.css'],
    },

    module: {
        rules: [
            {
                test: /\.css$/,
                use: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use: "css-loader"
                })
            }
        ]
    },
    plugins: [
        new ExtractTextPlugin("styles.css"),
    ]
};


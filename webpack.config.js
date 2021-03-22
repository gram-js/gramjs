const path = require('path')
const webpack = require('webpack');

module.exports = {
    entry: path.resolve(__dirname, 'gramjs/index.ts'),

    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },

            {
                test: /\.js$/,
                use: 'babel-loader',
                exclude: /node_modules/,
            },

            {
                test: /\.tl$/i,
                loader: 'raw-loader',
            },
        ],
    },

    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        fallback: {
            'fs': false,
            'path': require.resolve("path-browserify") ,
            'net': false,
            'crypto': false,
            "os": require.resolve("os-browserify/browser"),
            "util": false,
            "assert": false,
            "stream": false,
            "constants": false
        },
    },
    mode: 'development',
    plugins: [
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
    ],

    output: {
        library: 'gramjs',
        libraryTarget: 'umd',
        auxiliaryComment: 'Test Comment',
        filename: 'gramjs.js',
        path: path.resolve(__dirname, 'browser'),
    },
}

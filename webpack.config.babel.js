module.exports = {
    entry: './gramjs/index.js',
    mode: 'development',
    node: {
        fs: 'empty',
    },
    module: {
        rules: [{
            test: /\.js$/,
            use: {

                loader: 'babel-loader',
                options: {
                    presets: [
                        '@babel/preset-env',
                    ],
                    plugins: [
                        '@babel/plugin-proposal-class-properties',
                    ],
                },
            },
        },
        ],
    },
    output: {
        path: __dirname + '/browser',
        filename: 'gramjs.js',
        libraryTarget: 'var',
        library: 'gramjs',
    },
}

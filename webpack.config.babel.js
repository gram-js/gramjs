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
        filename: 'gramjs.js',
        libraryTarget: 'var',
        library: 'gramjs',
    },
}

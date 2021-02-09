module.exports = {
    entry: './gramjs/index.ts',
    mode: 'development',
    resolve: {
        extensions: ['.js', '.ts', '.tsx'],
    },
    node: {
        fs: 'empty',
        net: 'empty',
    },
    module: {
        rules: [
            {   test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: [
                    /node_modules/,
                ],
            },
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.(woff(2)?|ttf|eot|svg|png|jpg|tgs)(\?v=\d+\.\d+\.\d+)?$/,
                loader: 'file-loader',
                options: {
                    name: '[name].[contenthash].[ext]',
                },
            },
            {
                test: /\.wasm$/,
                type: 'javascript/auto',
                loader: 'file-loader',
                options: {
                    name: '[name].[contenthash].[ext]',
                },
            },
            {
                test: /\.tl$/i,
                loader: 'raw-loader',
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

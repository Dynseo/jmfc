let path = require('path');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = env => {
    let buildDir = 'app/build/';
    let entryScript = './src/js/mainScript.js';
    let outputFilename = 'jmfc-system.bundle.js';
    let mode = env && env.production ? 'production' : 'development';

    let scssRule = {
        test: /\.(s*)css$/,
        use: ['style-loader', 'css-loader']
    };

    let vueRule = {
        test: /\.vue$/,
        loader: 'vue-loader'
    };

    let publicPath = env.production ? buildDir : `/${buildDir}`
    return {
        mode: mode,
        entry: entryScript,
        plugins: [
            new VueLoaderPlugin(),
            new CopyWebpackPlugin({
                patterns: [
                    { from: 'app/lib', to: 'app/lib' },
                    { from: 'app/css', to: 'app/css' },
                    { from: 'app/img', to: 'app/img' },
                    // Ensure pictograms are available from the app root on mobile (Capacitor webDir)
                    { from: 'pictograms', to: path.resolve(__dirname, 'app/pictograms') },
                    { from: 'live_metadata.json', to: 'live_metadata.json' },
                    { from: 'grd_base', to: 'grd_base' }
                ]
            })
        ],
        output: {
            path: path.resolve(__dirname, buildDir),
            publicPath: publicPath,
            filename: outputFilename,
            chunkFilename: '[name].bundle.js',
        },
        resolve: {
            alias: {
                vue: 'vue/dist/vue.esm.js',
                predictionary: 'predictionary/src/index.mjs'
            }
        },
        devServer: {
            static: {
                directory: path.resolve(__dirname),
                watch: true
            },
            host: '0.0.0.0',
            port: 9095,
            open: false,
            hot: true,
            client: {
                overlay: true
            }
        },
        externals: {
            jquery: '$',
            PouchDB: 'PouchDB'
        },
        module: {
            rules: [scssRule, vueRule]
        }
    };
};
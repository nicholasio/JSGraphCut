var path = require('path');
var webpack = require('webpack');

module.exports = {
	entry: './src/app.js',
	output: {
		path: path.resolve(__dirname, 'build'),
		filename: 'main.bundle.js'
	},
	module: {
		loaders: [
			{
				test: /\.js$/,
				exclude: /(node_modules|bower_components)/,
				loader: 'babel-loader',
				query: {
					presets: ['es2015']
				}
			}
		]
	},
	stats: {
		colors: true
	},
	devServer: {
		historyApiFallback: true,
		contentBase: path.resolve(__dirname, 'build')
	},
	devtool: 'source-map',
	plugins:[
		new webpack.optimize.UglifyJsPlugin({
			sourceMap: true
		})
	]
};
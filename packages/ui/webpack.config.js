const path = require("path");
const webpack = require("webpack");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const SpriteLoaderPlugin = require('svg-sprite-loader/plugin');

function loadImages() {
  return [
    {
      test: /\.(gif|jpg|jpeg|png)(\?.*)?$/,
      loader: 'url-loader',
      options: {
        limit: 8192,
      },
    },
    {
      test: /\.(svg)(\?.*)?$/,
      loader: 'svg-url-loader',
      issuer: /\.scss$/,
      options: {
        limit: 8192,
      },
    },
    {
      test: /\.(svg)(\?.*)?$/,
      loader: 'svg-inline-loader',
      include: /node_modules/,
      options: {
        limit: 8192,
      },
    },
    {
      test: /\.svg$/,
      exclude: /fonts/,
      loader: 'svg-sprite-loader',
      issuer: /\.tsx?$/,
      options: {
        symbolId: 'icon-[folder]-[name]',
        spriteFilename: 'icons-[hash].svg',
        esModule: false
      }
    }
  ];
}

function loadFonts() {
  return {
    test: /(\.(eot|ttf|woff(2)?)|\/fonts\/.+\/?.+\.svg)(\?v=\d+\.\d+\.\d+)?/,
    loader: 'url-loader',
    options: {
      limit: 10000
    }
  };
}

function loadSASS() {
  return {
    test: /\.scss$/,
    use: ['style-loader', 'css-loader?sourceMap', 'sass-loader?sourceMap'],
  };
};

module.exports = {
  optimization: {
    minimizer: [new UglifyJsPlugin({ parallel: true })]
  },
  mode: "development",
  entry: "./src/index.tsx",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist")
  },
  devtool: "source-map",
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    alias: {
      cldr: 'cldrjs/dist/cldr',
      globalize: 'globalize/dist/globalize'
    }
  },
  module: {
    rules: [
      ...loadImages(),
      loadFonts(),
      loadSASS(),
      {
        test: /\.jsx?$/,
        include: /src/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader"
          }
        ]
      }, {
        test: /\.tsx?$/,
        include: /src/,
        exclude: /node_modules/,
        use: [{
          loader: 'ts-loader',
        }],
      }, {
        test: /\.css$/,
        include: /public/,
        use: [{
          loader: 'style-loader',
        }, {
          loader: 'css-loader',
        }],
      }, {
        test: /\.svg$/,
        include: /src/,
        use: [{
          loader: 'file-loader',
        }],
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      inject: false,
      template: './src/index.ejs',
      title: 'LTI Advantage Test'
    }),
    new webpack.ProvidePlugin({
      "window.jQuery": "jquery"
    }),
    new SpriteLoaderPlugin()
  ]
};

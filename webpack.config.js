const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    background: './src/background/background.ts',
    sidePanel: './src/components/SidePanel.tsx',
    devtools: './src/devtools.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'src/components/SidePanel.html',
      filename: '../sidePanel.html',
      chunks: ['sidePanel'],
      inject: 'body',
      scriptLoading: 'blocking'
    }),
    // DevTools HTML is manually created to avoid webpack template issues
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/styles/critical.css',
          to: 'critical.css'
        }
      ]
    })
  ],
  mode: 'development',
  devtool: 'cheap-module-source-map',
  optimization: {
    minimize: true, // Enable minification for better performance
    splitChunks: {
      chunks: 'all',
      maxSize: 50000, // 50KB max chunks
      cacheGroups: {
        // Split React into its own bundle
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          chunks: 'all',
          priority: 40,
        },
        // Split large vendor libraries separately
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 30,
          maxSize: 100000, // 100KB max for vendor chunks
        },
        // Components into separate chunks  
        components: {
          test: /[\\/]src[\\/]components[\\/]/,
          name: 'components',
          chunks: 'async', // Only async chunks for lazy loaded components
          priority: 20,
          minSize: 5000,
        },
        // Utils bundle
        utils: {
          test: /[\\/]src[\\/]utils[\\/]/,
          name: 'utils',
          chunks: 'all',
          priority: 10,
          minSize: 0,
        },
        // Common/shared code
        common: {
          name: 'common',
          chunks: 'all',
          minChunks: 2,
          priority: 5,
          minSize: 5000,
          reuseExistingChunk: true,
        }
      }
    }
  }
}; 
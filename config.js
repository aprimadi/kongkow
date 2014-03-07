var config = {
  development: {
    mode: 'development',
    port: 3000,
    assets: {
      debug: true
    }
  },
  staging: {
    mode: 'staging',
    port: 3000,
    assets: {
      debug: false
    }
  },
  production: {
    mode: 'production',
    port: 3000,
    assets: {
      debug: false
    }
  }
};

module.exports = function(mode) {
  return config[mode || process.argv[2] || 'development'] || config.development;
};
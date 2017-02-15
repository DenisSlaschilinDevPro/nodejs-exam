module.exports = {
  application: {
    port: 3000
  },
  redis: {
    options: {
      host: 'localhost',
      port: '6379'
    },
    expires: 60 * 60 * 24
  }
};

const config = require('config');
const redis = require('redis');
const bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const client = redis.createClient(config.redis.options);

client.on('error', err => console.log('Error ' + err));

function addToSet(name, value) {
  return client.saddAsync(name, value);
}

function readSet(name) {
  return client.smembersAsync(name);
}

function expireSet(name) {
  return client.expireAsync(name, config.redis.expires);
}

function deleteSet(name) {
  return client.delAsync(name);
}

function isSetExists(name) {
  return client.existsAsync(name);
}

module.exports = {
  addToSet,
  readSet,
  expireSet,
  deleteSet,
  isSetExists
};

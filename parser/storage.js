const config = require('config');
const redis = require('redis');
const bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const client = redis.createClient(config.redis.options);

client.on('error', err => console.log('Error ' + err));

function addToSet(name, value) {
  return client.saddAsync(name, value).then(res => {
    console.log(res);
  });
}

function readSet(name) {
  return client.smembersAsync(name);
}

module.exports = {
  addToSet,
  readSet
};

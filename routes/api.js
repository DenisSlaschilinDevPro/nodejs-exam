const co = require('co');
const express = require('express');
const router = express.Router();
const parser = require('../parser/parser');
const redisStorage = require('../parser/storage');

// You should handle all possible errors that could appear during processing the request.
// The easiest solution is to warp everything into promise/generator and use the final catch to deliver error message to the client.

// Here is example of with generators:
router.get('/search', (req, res) => co(function *(){
  const query = req.query;
  const elementsSetName = parser.getElementsSetName(query.url, query.element, query.level);
  const exists = yield redisStorage.isSetExists(elementsSetName);
  if (exists === 1) {
    const elementsArray = yield* getExistingResult(query, elementsSetName);
    res.render('search', { searchUrl: query.url, searchElement: query.element, elementsArray });
  } else {
    const elementsArray = yield* addNewResult(query);
    res.render('search', {searchUrl: query.url, searchElement: query.element, elementsArray});
  }
})
.catch(err => res.sendStatus(err.statusCode || 500).json(err.message)));

function *getExistingResult(query, elementsSetName){
  redisStorage.expireSet(elementsSetName);
  const elementsArray = yield redisStorage.readSet(elementsSetName);
  return elementsArray;
}

function *addNewResult(query){
  const searchObj = JSON.stringify({
    url: query.url,
    level: query.level,
    element: query.element
  });
  yield redisStorage.addToSet('search-list', searchObj);
  const elementsArray = yield parser.parseUrl([query.url], query.url, query.element, query.level, 1)
  return elementsArray;
}

// Here is example with existing promisified methods:
router.get('/search/list', (req, res) => redisStorage.readSet('search-list')
  .then(searchList => res.json(searchList))
  .catch(err => res.sendStatus(err.statusCode || 500).json(err.message)));

// Here is example with new Promise:
router.delete('/search', (req, res) => new Promise((resolve, reject) => {
  const elementsSetName = parser.getElementsSetName(req.query.url, req.query.element, req.query.level);
  deleteExistingResult(elementsSetName)
    .then(() => res.sendStatus(200).end())
    .catch(reject);
})
.catch(err => res.sendStatus(err.statusCode || 500).json(err.message)));

function deleteExistingResult(elementsSetName) {
  return redisStorage.isSetExists(elementsSetName)
    .then(exists => {
      if (exists !== 1) {
        const err = new Error('Not Found');
        err.statusCode = 404;
        throw err;
      }
      return redisStorage.deleteSet(elementsSetName);
    });
}

module.exports = router;

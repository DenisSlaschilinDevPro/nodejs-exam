const express = require('express');
const router = express.Router();
const parser = require('../parser/parser');
const redisStorage = require('../parser/storage');

router.get('/search', (req, res) => {
  const elementsSetName = parser.getElementsSetName(req.query.url, req.query.element, req.query.level);

  redisStorage.isSetExists(elementsSetName).then(exists => {
    if (exists === 1) {
      redisStorage.expireSet(elementsSetName);
      redisStorage.readSet(elementsSetName).then(elementsArray => {
        res.render('search', { searchUrl: req.query.url, searchElement: req.query.element, elementsArray });
      });
    } else {
      redisStorage.addToSet('search-list', JSON.stringify({
        url: req.query.url,
        level: req.query.level,
        element: req.query.element
      }));
      parser.parseUrl([req.query.url], req.query.url, req.query.element, req.query.level, 1).then(elementsArray => {
        res.render('search', {searchUrl: req.query.url, searchElement: req.query.element, elementsArray});
      });
    }
  });
});

router.get('/search/list', (req, res) => {
  redisStorage.readSet('search-list').then(searchList => {
    res.json(searchList);
  });
});

router.delete('/search', (req, res) => {
  const elementsSetName = parser.getElementsSetName(req.query.url, req.query.element, req.query.level);

  redisStorage.isSetExists(elementsSetName).then(exists => {
    if (exists === 1) {
      redisStorage.deleteSet(elementsSetName);
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  });
});

module.exports = router;

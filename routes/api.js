const express = require('express');
const router = express.Router();
const parser = require('../parser/parser');

router.get('/search', (req, res, next) => {
  parser.parseUrl(req.query, 0);

  res.render('search', { searchUrl: req.query.url, searchElement: req.query.element });
});

module.exports = router;

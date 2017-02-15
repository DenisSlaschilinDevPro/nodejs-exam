const url = require('url');
const got = require('got');
const cheerio = require('cheerio');
const redisStorage = require('./storage');

const LEVEL = 1;

let depthLevelIsReached = false;
// let allLinksArray = [];
// let allElementsArray = [];

function parseUrl(queryObj, currentLevel) {
  const targetUrl = queryObj.url;
  const targetElement = queryObj.element;
  const depthLevel = queryObj.level || LEVEL;

  if (currentLevel <= depthLevel) {
    got(targetUrl)
        .then(response => {
          if (response) {
            domParser(response.body, targetUrl, targetElement, depthLevel, currentLevel);
          }
        })
        .catch(error => {
          console.log(error);
        });
  }
}

function domParser(body, targetUrl, targetElement, depthLevel, currentLevel) {
  let $ = cheerio.load(body);

  const allLinks = $('a');
  const allTargetElements = $(targetElement);

  allLinksArray = allLinksArray.concat(createLinksArray(allLinks, targetUrl));
  allElementsArray = allElementsArray.concat(createElementsArray(allTargetElements));

  if (currentLevel < depthLevel) {
    allLinksArray.forEach(currentLink => {
      parseUrl({
        url: currentLink,
        element: targetElement,
        level: depthLevel
      }, currentLevel + 1)
    });
  } else if (!depthLevelIsReached) {
    depthLevelIsReached = true;
    // console.log(allLinksArray);
    // console.log(allElementsArray);
    // console.log(allLinksArray.length);
    // console.log(allElementsArray.length);
  }
}

function addLinksToRedis(allLinks, targetUrl) {
  const linksNumber = allLinks.length;

  for (let i = 0; i < linksNumber; i++ ) {
    const currentLinkHref = allLinks[i].attribs.href;

    if (currentLinkHref && isExternalLink(targetUrl, currentLinkHref)) {
      redisStorage.addToSet('links', currentLinkHref);
    }
  }
}

function createLinksArray(allLinks, targetUrl) {
  const linksNumber = allLinks.length;
  let filteredLinksArray = [];

  for (let i = 0; i < linksNumber; i++ ) {
    const currentLinkHref = allLinks[i].attribs.href;

    if (currentLinkHref && isExternalLink(targetUrl, currentLinkHref) && !allLinksArray.includes(currentLinkHref)) {
      filteredLinksArray.push(currentLinkHref);
    }
  }
  return filteredLinksArray;
}

function isExternalLink(searchUrl, link) {
  const parsedUrl = url.parse(searchUrl);
  const parsedLink = url.parse(link);
  return parsedLink.protocol &&
         parsedLink.protocol.includes('http') && 
         parsedLink.host !== parsedUrl.host;
}

function createElementsArray(allTargetElements) {
  const targetElementsNumber = allTargetElements.length;
  let elementsArray = [];

  for (let i = 0; i < targetElementsNumber; i++ ) {
    const currentElement = cheerio.load(allTargetElements[i]);
    elementsArray.push(currentElement.html());
  }
  return elementsArray;
}

redisStorage.addToSet('links', 'one');
redisStorage.addToSet('links', 'two');
redisStorage.readSet('links').then(res => console.log(res.length));

module.exports = {
  parseUrl
};

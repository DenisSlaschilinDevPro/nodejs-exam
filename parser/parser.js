const url = require('url');
const got = require('got');
const Q = require('q');
const cheerio = require('cheerio');
const redisStorage = require('./storage');

let allLinksArray = [];

// It didnt return any result back to the user before this small refactoring
// Please learn more about chaining promises, passing results between them, error-handling
// Also this code is hard to read, so it should be splitted to smaller parts and covered by logs

function parseUrl(urlArray, targetUrl, targetElement, depthLevel = 1, currentLevel, isLast = false) {
  return new Promise((resolve, reject) => {
    //you dont need the whole-function try-catch here because promise will handle that for you
    let promisesArray = [];

    urlArray.forEach(currentUrl => promisesArray.push(got(currentUrl)));
    if (currentLevel <= depthLevel) {
      Q.allSettled(promisesArray)
          .then(results => Promise.all(
              results.map((result, idx) => {
                if (result.state === "fulfilled") {
                  const isLast = idx === results.length - 1;
                  return domParser(result.value.body, targetUrl, targetElement, depthLevel, currentLevel, isLast);
                } else {
                  console.log(result.reason);
                }
              })
            ))
          .then(resolve).catch(reject);
    } else if (isLast) {
      const elementsSetName = getElementsSetName(targetUrl, targetElement, depthLevel);
      redisStorage.readSet(elementsSetName)
        .then(resolve).catch(reject);
    }
  })
}

function domParser(body, targetUrl, targetElement, depthLevel, currentLevel, isLast) {
  let $ = cheerio.load(body);

  const allLinks = $('a');
  const allTargetElements = $(targetElement);
  const elementsSetName = getElementsSetName(targetUrl, targetElement, depthLevel);

  const externalLinksArray = getExternalLinksArray(allLinks, targetUrl);
  allLinksArray = allLinksArray.concat(externalLinksArray);
  return addElementsToRedis(allTargetElements, elementsSetName)
    .then(() => {
      return parseUrl(externalLinksArray, targetUrl, targetElement, depthLevel, currentLevel + 1, isLast);
    });
}

function getExternalLinksArray(allLinks, targetUrl) {
  const linksNumber = allLinks.length;
  let filteredLinksArray = [];

  for (let i = 0; i < linksNumber; i++ ) {
    const currentLinkHref = allLinks[i].attribs.href;

    if (currentLinkHref && isExternalLink(targetUrl, currentLinkHref) &&
        !allLinksArray.includes(currentLinkHref) && !filteredLinksArray.includes(currentLinkHref)) {
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

function addElementsToRedis(allTargetElements, elementsSetName) {
  const promises = [];
  const targetElementsNumber = allTargetElements.length;
  for (let i = 0; i < targetElementsNumber; i++ ) {
    const currentElement = cheerio.load(allTargetElements[i]);
    promises.push(
      redisStorage.addToSet(elementsSetName, currentElement.html())
        .then(() => redisStorage.expireSet(elementsSetName))
    );
  }
  return Promise.all(promises);
}

function getElementsSetName(targetUrl, targetElement, depthLevel) {
  return `${targetUrl}-${targetElement}-${depthLevel}`;
}

module.exports = {
  parseUrl,
  getElementsSetName
};

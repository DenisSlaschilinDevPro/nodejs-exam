const url = require('url');
const got = require('got');
const Q = require('q');
const cheerio = require('cheerio');
const redisStorage = require('./storage');

let allLinksArray = [];

function parseUrl(urlArray, targetUrl, targetElement, depthLevel = 1, currentLevel, isLast = false) {
  return new Promise((resolve, reject) => {
    try {
      let promisesArray = [];

      urlArray.forEach(currentUrl => promisesArray.push(got(currentUrl)));

      if (currentLevel <= depthLevel) {
        Q.allSettled(promisesArray)
            .then(results => {
              results.forEach((result, idx, results) => {
                if (result.state === "fulfilled") {
                  const isLast = idx === results.length - 1;
                  domParser(result.value.body, targetUrl, targetElement, depthLevel, currentLevel, isLast);
                } else {
                  console.log(result.reason);
                }
              });
            });
      } else if (isLast) {
        const elementsSetName = getElementsSetName(targetUrl, targetElement, depthLevel);
        redisStorage.readSet(elementsSetName).then(res => {
          resolve(res);
        });
      }
    } catch(err) {
      reject(err);
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
  addElementsToRedis(allTargetElements, elementsSetName);

  parseUrl(externalLinksArray, targetUrl, targetElement, depthLevel, currentLevel + 1, isLast);
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
  const targetElementsNumber = allTargetElements.length;

  for (let i = 0; i < targetElementsNumber; i++ ) {
    const currentElement = cheerio.load(allTargetElements[i]);
    redisStorage.addToSet(elementsSetName, currentElement.html());
    redisStorage.expireSet(elementsSetName);
  }
}

function getElementsSetName(targetUrl, targetElement, depthLevel) {
  return `${targetUrl}-${targetElement}-${depthLevel}`;
}

module.exports = {
  parseUrl,
  getElementsSetName
};

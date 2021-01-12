const css2xpath = require("css2xpath");
const PupElement = require("./pup_page.js");

class PupPage {
  constructor(pup) {
    this.pup = pup;
    this._alertDidFinish = null;
    this._alert = {};
    this._postRequest = {};
  }

  get page() {
    return this.pup.page;
  }

  wait(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  async setRequestInterception(b) {
    await this.page.setRequestInterception(b);
  }

  async reload(options) {
    if (options) {
      return await this.page.reload(options);
    } else {
      return await this.page.reload({
        timeout: 30000,
        waitUntil: "networkidle2"
      });
    }
  }

  async content() {
    return await this.page.content();
  }

  async cookies(urls) {
    let ret = urls ?
      (await this.page.cookies(urls)) : (await this.page.cookies());
    return ret;
  }

  async title() {
    return await this.page.title();
  }

  async waitForText(text) {
    let xpath = `//*[contains(text(), "${text}")]`;
    await this.page.waitForXPath(xpath);
  }

  async waitForSelector(selector) {
    return await this.page.waitForSelector(selector);
  }

  async waitFor(milliseconds=1000) {
    await this.page.waitForTimeout(milliseconds);
  }

  get mouse() {
    return this.page.mouse;
  }

  async screenshot(opts={}) {
    return await this.page.screenshot(opts);
  }

  async takeScreenshot() {
    await this.screenshot({
      path: "./screenshots/"+ Date.now() +".png",
      fullPage: false
    });
  }

  async findElements(selector) {
    //let xpath = css2xpath(selector);
    /*await this.page.waitForXPath(xpath);*/
    //return await this.page.$x(xpath);
    return await this.page.$$(selector);
  }

  async findBySelectors(selector) {
    let _elements = await this.findElements(selector);
    let retElements = [];
    for(var i=0; i<_elements.length; i++) {
      retElements.push(new PupElement(this, _elements[i]));
    }
    return retElements;
  }

  async findBySelector(selector) {
    let elements = await this.findElements(selector);
    if (elements.length > 0) {
      return new PupElement(this, elements[0]);
    } else {
      return null;
    }
  }

  async findElementWithTag(tagName) {
    return await this.findBySelector(tagName);
  }

  async findElementsWithTag(tagName) {
    return await this.findBySelectors(tagName);
  }

  onAlertAccept() {
    this._alertDidFinish = null;
    var that = this;
    this.page.on("dialog", async (dialog) => {
      that._alert = {
        type: dialog.type(),
        message: dialog.message()
      };

      setTimeout(async function() {
        await dialog.accept();
        that._alertDidFinish = true;
      }, 1000);
    });
  }


  async waitForAlertToFinish() {
    return new Promise((resolve, reject) => {
      var that = this;
      var tries = 0;
      var _intervalVal;
      _intervalVal = setInterval(function() {
        if (tries < 300) {
          if (that._alertDidFinish) {
            that._alertDidFinish = null;
            clearInterval(_intervalVal);
            resolve(that._alert);
          }
        } else {
          reject(false);
        }
        tries += 1;
      }, 100);
    });
  }

  onRequestIntercept(opts={}) {
    this.onRequest({
      pattern: opts['pattern'],
      methods: opts['methods'],
      collect: opts['collect'],
      respond: opts['respond']
    });
  }

  onRequest(opts) {
    if (!opts['pattern']) {
      throw new Exception("Regex pattern is required");
    }
    if (!opts['methods'] || opts['methods'].length === 0) {
      throw new Exception("At least one HTTP request method is required");
    }

    var that = this;
    that._onRequests = [];

    this.page.on('request', (request) => {
      if (opts['methods'].includes(request.method()) &&
        opts['pattern'].test(request.url())) 
      {
          if (opts['collect'] === true) {
            that._onRequests.push({
              url: request.url(),
              isNavigationRequest: request.isNavigationRequest(),
              method: request.method(),
              headers: request.headers(),
              postData: request.postData()
            });
          }

          if (opts['respond']) {
            request.respond({
              content: opts['respond']['contentType'],
              body: opts['respond']['body']
            });
            return;
          }
        }
      request.continue();
    });
  }

  onResponseIntercept(opts={}) {
    this.onResponse({
      pattern: opts['pattern'],
      methods: opts['methods'],
      collect: opts['collect']
    });
  }

  onResponse(opts) {
    if (!opts['pattern']) {
      throw new Exception("Regex pattern is required");
    }
    if (!opts['methods'] || opts['methods'].length === 0) {
      throw new Exception("At least one HTTP request method is required");
    }

    var that = this;
    that._onResponses = [];

    this.page.on('response', async (response) => {
      if (opts['methods'].includes(response.request().method()) &&
        opts['pattern'].test(response.url())) 
      {
          if (opts['collect'] === true) {
            that._onResponses.push({
              url: response.url(),
              isNavigationRequest: response.request().isNavigationRequest(),
              method: response.request().method(),
              headers: response.headers(),
              body: await response.text()
            });
          }
        }
    });
  }

  async waitForResponseIntercept() {
    return new Promise((resolve, reject) => {
      var that = this;
      var tries = 0;
      var _intervalVal;
      _intervalVal = setInterval(function() {
        if (tries < 300) {
          if (that._onResponses && that._onResponses.length > 0) {
            let responses = that._onResponses;
            that._onResponses = [];
            clearInterval(_intervalVal);
            resolve(responses);
          }
        } else {
          reject(false);
        }
        tries += 1;
      }, 100);
    });
  }

  async waitForRequestIntercept() {
    return new Promise((resolve, reject) => {
      var that = this;
      var tries = 0;
      var _intervalVal;
      _intervalVal = setInterval(function() {
        if (tries < 300) {
          if (that._onRequests && that._onRequests.length > 0) {
            let requests = that._onRequests;
            that._onRequests = [];
            clearInterval(_intervalVal);
            resolve(requests);
          }
        } else {
          reject(false);
        }
        tries += 1;
      }, 100);
    });
  }
}

module.exports = PupPage;
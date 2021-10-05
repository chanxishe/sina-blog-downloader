
require('dotenv').config();

import init from './init';
import { SINA_ARTICLE_LIST_URL_PREFIX, SINA_BLOG_URL_PREFIX } from './constants';

const _ = require('lodash');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

init();

async function getUid() {
  const blogUrl = process.env.SINA_BLOG_URL_TO_DOWNLOAD;
  if (_.isEmpty(blogUrl)) {
    throw new Error('No blog to download');
  }

  const dom = await JSDOM.fromURL(blogUrl, {
    runScripts: "dangerously"
  });

  // Example element: <meta http-equiv="mobile-agent" content="format=html5; url=http://blog.sina.cn/dpool/blog/u/1215172700">
  const metaList = dom.window.document.querySelectorAll('meta');
  const meta = _.find(metaList, (m: any) => new RegExp('url=http://blog\.sina\.cn/dpool/blog/u/(\\w+)').test(m.content));
  if (_.isUndefined(meta)) {
    throw new Error('Failed to find uid');
  }
  return meta.content.match('url=http://blog\.sina\.cn/dpool/blog/u/(\\w+)')[1];
}


async function main() {
  // Get uid
  const uid = await getUid();
  console.log(uid);


}

main();

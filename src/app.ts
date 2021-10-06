
require('dotenv').config();

import init from './init';
import { SINA_ARTICLE_LIST_URL_PREFIX, SINA_BLOG_URL_PREFIX } from './constants';

const _ = require('lodash');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const acorn = require("acorn");

init();

async function getUid() {
  const blogUrl = process.env.SINA_BLOG_URL_TO_DOWNLOAD;
  if (_.isEmpty(blogUrl)) {
    throw new Error('No blog to download');
  }

  const dom = await JSDOM.fromURL(blogUrl, {
    // runScripts: "dangerously"
  });

  // Example element: <meta http-equiv="mobile-agent" content="format=html5; url=http://blog.sina.cn/dpool/blog/u/1215172700">
  const metaList = dom.window.document.querySelectorAll('meta');
  const meta = _.find(metaList, (m: any) => new RegExp('url=http://blog\.sina\.cn/dpool/blog/u/(\\w+)').test(m.content));
  if (_.isUndefined(meta)) {
    throw new Error('Failed to find uid');
  }
  return meta.content.match('url=http://blog\.sina\.cn/dpool/blog/u/(\\w+)')[1];
}

async function getArticleIdList(uid: string, pageIndex: number) {
  // Get article count. Example Url: http://blog.sina.com.cn/s/articlelist_1215172700_0_1.html
  const url = `${SINA_ARTICLE_LIST_URL_PREFIX}${uid}_0_${pageIndex+1}.html`;
  console.log(`Article list page url: ${url}`);
  const dom = await JSDOM.fromURL(url);
  const scriptList = dom.window.document.querySelectorAll('script');
  const script = _.find(scriptList, (s: any) => _.includes(s.text, '$blogArticleSortArticleids'));
  if (_.isUndefined(script)) {
    throw new Error('Failed to find script with $blogArticleSortArticleids');
  }
  const estree = acorn.parse(script.text, {ecmaVersion: 2015});
  const scopeVariables = _.get(estree, 'body.0.declarations.0.init.properties', []);
  const blogArticleSortArticleids = _.find(scopeVariables, (v: any) => v.key.name === '$blogArticleSortArticleids');
  return _.map(blogArticleSortArticleids.value.elements, 'value');
}

async function getBlogInfo(uid: string) {
  // Get blog info from the 1st article list page. Example Url: http://blog.sina.com.cn/s/articlelist_1215172700_0_1.html
  const url = `${SINA_ARTICLE_LIST_URL_PREFIX}${uid}_0_1.html`;
  console.log(`Get blog info from page: ${url}`);
  const dom = await JSDOM.fromURL(url);

  // Get blog title
  const titleElement = dom.window.document.querySelector('title');
  const blogName = titleElement.text.match('博文_(\\W+)_新浪博客')[1];

  // Get article count
  const titleSpanList = dom.window.document.querySelectorAll('span.title');
  const span = _.find(titleSpanList, (s: any) => new RegExp('全部博文<em>\\((\\d*)\\)</em>').test(s.innerHTML));
  if (_.isUndefined(span)) {
    throw new Error('Failed to find blog count');
  }
  const articleCount = _.parseInt(span.innerHTML.match('全部博文<em>\\((\\d*)\\)</em>')[1]);

  // Calculate blog page count (50 articles per page)
  const articlePageCount = _.ceil(articleCount / 50);
  let articleIdList: string[] = [];

  for await (const pageIndex of _.range(articlePageCount)) {
    const articleIdListOfPage = await getArticleIdList(uid, pageIndex);
    articleIdList = _.concat(articleIdList, articleIdListOfPage);
  }

  return {
    blogName,
    articleCount,
    articleIdList
  };
}


async function main() {
  // Get uid
  const uid = await getUid();
  console.log(`Uid: ${uid}`);

  // Get article info
  const articleInfo = await getBlogInfo(uid);
  console.log(articleInfo);
}

main();

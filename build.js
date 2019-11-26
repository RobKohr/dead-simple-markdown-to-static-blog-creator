const fs = require('fs');
const { execSync } = require('child_process');
const marked = require('marked');
const ejs = require('ejs');


const config = require('./config/local.json');
const blogPath = config.source;
const outputPath = './public';
execSync('rm -rf public/*');
execSync(`cp -R ${blogPath}/* public/`);
execSync(`mkdir public/a/`);
// I reduced articles to just a, and this is to handle backwards
// compatability for links already out there. Isn't needed for others.
if(config.siteTitle==='Ten-Ton Creations'){
  execSync(`ln -s public/a/ public/articles`);
}
execSync(`mkdir public/tags`);

function getFile(path) {
  return fs.readFileSync(path, 'utf8');
}


let contents = getFile(outputPath + '/blog.md')
//fix all image paths to be based on root of the site
contents = contents.split('(images/').join('(/images/');
let currentArticle = null;
const articles = [];
contents = contents.split('\n');
const maxLinesOnHome = 5;
let homeLineCount = 0;
let homeText = '';
readMoreShown = false;
let allTags = [];
contents.forEach((line, index) => {
  let skip = false;
  if (line.substr(0, 2) === '##' && line.substr(2, 1) !== '#') {
    if (currentArticle) {
      endArticle(currentArticle);
    }
    startArticle(line);
    currentArticle.text += line + '\n';
    line = linkifyHeader(line);
  } else {
    let isSpecialLine = false;
    if (line.includes('@date=')) {
      currentArticle.date = line.replace('@date=', '');
      line = `<div class="date">${currentArticle.date}</div>`;
      isSpecialLine = true;
    }

    if (line.includes('@tags=')) {
      isSpecialLine = true;
      currentArticle.tags = line.replace('@tags=', '').split(',').map(tag=>tag.trim());
      allTags = allTags.concat(currentArticle.tags);
      currentArticle.rssDescription += ' #'+currentArticle.tags.join(' #')+' ';

      tags = currentArticle.tags.map(tag => {
        return `<a class="tag" href="/tags/${tag}">${tag}</a> `;
      });
      line = '<p class="tags">Tags: ' + tags.join(' ') + '</p>';
    }

    if (currentArticle) {
      currentArticle.text += line + '\n';
      if(!isSpecialLine){
        currentArticle.rssDescription+=' '+line+' ';
      }
    }
    if (line) {
      homeLineCount++;
    }
  }
  if (homeLineCount <= maxLinesOnHome) {
    homeText += line + '\n';
  } else if (!readMoreShown) {
    homeText += `\n[read more](${currentArticle.link})\n`;
    readMoreShown = true;
  }
});

endArticle(currentArticle);

marked.setOptions({
  renderer: new marked.Renderer(),
  highlight: function(code) {
    return require('highlight.js').highlightAuto(code).value;
  },
  pedantic: false,
  gfm: true,
  breaks: false,
  sanitize: false,
  smartLists: true,
  smartypants: false,
  xhtml: false
});

let mainTemplate = ejs.compile(getFile(blogPath+'/layout.ejs'));
let rssTemplate = ejs.compile(getFile('./rss.ejs'));
let tagTemplate = ejs.compile(getFile('./tags.ejs'));


const index = mainTemplate({ title: 'home', body: '<div id="main">' + marked(homeText) + '</div>', ...config});
fs.writeFileSync(outputPath + '/index.html', index);

articles.forEach(article => {
  article.html = marked(article.text);
  const articlePage = mainTemplate({ title: article.title, body: '<div id="article">' + article.html+ '</div>', ...config });
  execSync(`mkdir public${article.link}`);
  fs.writeFileSync(`public${article.link}` + '/index.html', articlePage);
});
function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

allTags = allTags.filter(onlyUnique);
const tagsBody = tagTemplate({ tags:allTags, ...config });
const tagsPage = mainTemplate({ title: 'tags', body: '<div id="tags">' + tagsBody + '</div>', ...config});
fs.writeFileSync(outputPath + '/tags/index.html', tagsPage);

allTags.forEach(tag => {
  const matchedArticles = [];
  let tagPage = `<h2>Items tagged with <em>${tag}</em></h2>\n\n`;
  articles.forEach(article => {
    if (article.tags && article.tags.includes(tag)) {
      matchedArticles.push(article);
    }
  });
  matchedArticles.forEach(article => {
    tagPage += '\n' + linkifyHeader(article.title) + '\n';
    tagPage += '\n'+article.text.split('\n').slice(1,8).join('\n')+'\n';
    tagPage += `\n [Read More](${article.link})\n`
  });
  const tagPageHtml = mainTemplate({ title: 'tagged ' + tag, body: '<div id="tags">' + marked(tagPage) + '</div>', ...config});
  execSync(`mkdir ./public/tags/${tag}`);
  fs.writeFileSync(`./public/tags/${tag}/index.html`, tagPageHtml);
});

const rss = rssTemplate({ articles, ...config });
fs.writeFileSync(outputPath + '/rss.xml', rss);


function endArticle() {
  articles.push(currentArticle);
  homeLineCount = 0;
  readMoreShown = false;
}

function titleFromLine(line) {
  return line.replace('##', '').trim();
}
function linkifyHeader(line) {
  const title = titleFromLine(line);
  const link = titleToArticleLink(title);
  const replacement = `[${title}](${link})`;
  return '## ' + replacement;
}

function startArticle(line) {
  const article = {
    title: titleFromLine(line),
    rssDescription: titleFromLine(line)
  };
  article.link = titleToArticleLink(article.title);
  article.text = '';
  currentArticle = article;
  return currentArticle;
}

function titleToArticleLink(title) {
  return (
    '/a/' +
    title
      .trim()
      .split(' ')
      .join('-')
  );
}

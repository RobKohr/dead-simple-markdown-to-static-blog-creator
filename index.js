const fs = require('fs');
const { execSync } = require('child_process');
const marked = require('marked');
const ejs = require('ejs');

const config = require('./config/local.json');
const blogPath = config.source;
const outputPath = './public';
execSync('rm -rf public/*');
execSync(`cp -R ${blogPath}/* public/`);
execSync(`mkdir public/articles/`);
execSync(`mkdir public/tags`);

function getFile(path) {
  return fs.readFileSync(path, 'utf8');
}

let contents = getFile(outputPath + '/blog.md');
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
    if (line.includes('@tags=')) {
      currentArticle.tags = line.replace('@tags=', '').split(',');
      allTags = allTags.concat(currentArticle.tags);
      tags = currentArticle.tags.map(tag => {
        return `<a class="tag" href="/tags/${tag}">${tag}</a> `;
      });
      line = '<p class="tags">Tags: ' + tags.join(' ') + '</p>';
    }
    if (currentArticle) {
      currentArticle.text += line + '\n';
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

let template = ejs.compile(getFile(blogPath+'/layout.ejs'));
const index = template({ title: 'home', body: '<div id="main">' + marked(homeText) + '</div>' });
fs.writeFileSync(outputPath + '/index.html', index);

articles.forEach(article => {
  const articleHtml = template({ title: article.title, body: '<div id="article">' + marked(article.text) + '</div>' });
  execSync(`mkdir public${article.link}`);
  fs.writeFileSync(`public${article.link}` + '/index.html', articleHtml);
});
function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

allTags.filter(onlyUnique).forEach(tag => {
  const matchedArticles = [];
  let tagPage = '';
  articles.forEach(article => {
    if (article.tags && article.tags.includes(tag)) {
      matchedArticles.push(article);
    }
  });
  matchedArticles.forEach(article => {
    tagPage += '\n' + linkifyHeader(article.title) + '\n';
    tagPage += '\n'+article.text.split('\n').slice(1,8).join('\n')+'\n';
  });
  const tagPageHtml = template({ title: 'tagged ' + tag, body: '<div id="tags">' + marked(tagPage) + '</div>' });
  execSync(`mkdir ./public/tags/${tag}`);
  fs.writeFileSync(`./public/tags/${tag}/index.html`, tagPageHtml);
});

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
    title: titleFromLine(line)
  };
  article.link = titleToArticleLink(article.title);
  article.text = '';
  currentArticle = article;
  return currentArticle;
}

function titleToArticleLink(title) {
  return (
    '/articles/' +
    title
      .trim()
      .split(' ')
      .join('-')
  );
}

const express = require('express');
const app = express();
const port = config.port;
app.use(express.static('public'));

app.listen(port, () => console.log(`Example app listening on port http://127.0.0.1:${port}`));

This very simple package will generate a static blog website from a single markdown file with h2 header tags on top of each separate article.

From this single md file, it will create:
* the home page at public/index.html with links to individual articles
* Individual articles
* tag pages that list articles
* an rss feed

## Requirements
* This project requires some linux style commands, so it will only work on Mac OS X and Linux machines

## Setup
* cp ./config/exampleCopyToLocal.json local.json
* cp -R _ExampleBlogDirectory Blog
* npm install
* npm run build
  * This will empty and rebuild the static files in the public directory. It will also launch a mini-webserver at http://localhost:2121 so that you can view the results. It is recommended that you host the public directory's static files under something like nginx as it is runs faster than node for serving static content
* Edit these files and rebuild to modify the site:
  * ./Blog/blog.md
  * ./Blog/site.css
  * ./Blog/layout.ejs

## Warning
* Don't edit or save anything in the public directory. It is wiped out with each rebuild

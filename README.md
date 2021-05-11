# amp-convertor

`amp-converter-parser.ts` is the convertor, it replaces normal tags into amp tags and clean up other invalid tags.

```
cd amp-convertor

npm i --g serve
npm i --g ts-node
yarn install

// to start local dev server
server

// convert blog home page
ts-node amp-converter-parser.ts https://cloudbet-blog-en.webflow.io/ ./build/amp/home.amp.html

// convert Cloudbet home page
ts-node amp-converter-parser.ts https://www.cloudbet-weglot.com/ ./build/amp/cb.amp.html 1
ts-node amp-converter-parser.ts https://cloudbet-page.webflow.io/lp-dash-sportsbook-casino ./build/amp/dash.amp.html 2

// convert single post page
ts-node amp-converter-parser.ts https://www.cloudbet.com/en/blog/posts/cloudbet-always-growing ./build/amp/post.amp.html
ts-node amp-converter-parser.ts https://cloudbet-blog-en.webflow.io/posts/ncaa-buzzer-beater-heartbreak-well-help-ease-the-pain ./build/amp/post-2.amp.html

// convert categories - previews page
ts-node amp-converter-parser.ts https://cloudbet-blog-en.webflow.io/categories/previews?eda8cc54_page=2 ./build/amp/categories.amp.html
ts-node amp-converter-parser.ts https://cloudbet-blog-en.webflow.io/categories/in-the-cloud ./build/amp/categories-2.amp.html

// convert tags - bitcoin page
ts-node amp-converter-parser.ts https://cloudbet-blog-en.webflow.io/tags/bitcoin?5fe33004_page=2 ./build/amp/tags.amp.html
```

## To verify AMP format
Inside of `amp-converter-parser.ts`, the `main` function return a amp html source as string by default. Also, accepting output file path as an argument, so that you may verift the amp page locally.

To verify, start local server with `serve`, go to, for example, http://localhost:5000/build/amp/blog-categories.amp#development=1. `#development=1` is need to trigger the amp validation. Open browser developer console then you will see amp validation messages.

## To prepare common css file
It would be more dynamic if the amp-css is prepared by fetching all style sheet links in a page then purging, merging them together but that takes more request time. So A `common.min.css` file is prepared for all of the pages. Basically, firstly copying all html source of all pages, in this case, the home, single post, tags and categories pages into one html file, do the same for css, copy them into a single css file. Also add any additional css if needed. Then use `purgecss` to obtain a css file with only used css. Then using `uglifycss` to minify it.

```
// for example
purgecss --content all.html --css all.css --output build/css
uglifycss common.css common.min.css
```


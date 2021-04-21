# amp-convertor

- `global-replace.js` is the convertor, it replaces normal tags into amp tags and clean up other invalid tags.
- here has 4 `blog-{something}.html` which are simple some source copy of the webflow blog pages. Use global-replace.js to test against them.
- since all JS is removed from the page, some `workarounds.css` and `workaround.html` are for the workaround.
- `common-head.html` includes amp-boilerplate and google font links.

```
cd amp-convertor

npm i --g serve
npm i
npm run tsc

// to start local dev server
server

// convert a page
node build/ts/amp-converter.js https://stg.cloudbet.com/en/blog <basic_auth_username> <basic_auth_password> ./build/amp/blog-home.amp.html
```

Inside of `amp-convertor.ts`, the `main` function return a amp html source as string by default. Also, accepting output file path as the 4th argument, so that you may verift the amp page locally.

To verify, go to, for example, http://localhost:5000/build/amp/blog-categories.amp#development=1. #development=1 is need to trigger the amp validation. Open browser developer console then you will see amp validation messages.

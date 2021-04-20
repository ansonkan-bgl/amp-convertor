#amp-convertor

- `global-replace.js` is the convertor, it replaces normal tags into amp tags and clean up other invalid tags
- here has 4 `blog-{something}.html` which are simple some source copy of the webflow blog pages. Use global-replace.js to test against them.
- since all JS is removed from the page, some `workarounds.css` and `workaround.html` are for the workaround
- `common-head.html` includes amp-boilerplate and google font links

```
// to start local dev server
cd amp-convertor
server

// convert a page
node global-replace.js
```

To verify, go to, for example, http://localhost:5000/build/amp/blog-categories.amp#development=1. #development=1 is need to trigger the amp validation. Open browser developer console then you will see amp validation messages

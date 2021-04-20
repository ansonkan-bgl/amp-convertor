const fs = require('fs')
const { PurgeCSS } = require('purgecss')
const axios = require('axios');

async function main() {
  const inputPath = './blog-categories.html'
  const outputPath = './build/amp/blog-categories.amp.html'
  const headPath = './common-head.html'
  const workaroundHTMLPath = './workaround.html'
  const workaroundCSSPath = './workaround.css'

  // original HTML source
  let html = fs.readFileSync(inputPath, { encoding: 'utf8', flag: 'r' });

  // common amp-boilerplate and google font links
  const ampHead = fs.readFileSync(headPath, { encoding: 'utf8', flag: 'r' });

  // since the original NAV button in mobile view is controlled by js, this is a css version of that
  const navWorkaroundHTML = fs.readFileSync(workaroundHTMLPath, { encoding: 'utf8', flag: 'r' });
  const navWorkaroundCSS = fs.readFileSync(workaroundCSSPath, { encoding: 'utf8', flag: 'r' });
  html = html.replace(/(class=.button.subscribe-button.w-button.>[\s\S]*?<\/a><\/div>[\s\S]*?)<div.class="menu-button w-nav-button">[\s\S]*?<div class="menu-icon">[\s\S]*?<div class="menu-line-top"><\/div>[\s\S]*?<div class="menu-line-middle"><\/div>[\s\S]*?<div class="menu-line-bottom"><\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>/g, `$1${navWorkaroundHTML}`)

  // START - collect all external/internal CSS, merge them then purge unused css
  const rawCSS = []
  const cssLinks = html.match(/<link\s*href="(.+)"\s*rel="stylesheet"\s*type="text\/css"\s*\/>/g);
  if (cssLinks) {
    for (let link of cssLinks) {
      const match = link.match(/<link\s*href="(.+)"\s*rel="stylesheet"\s*type="text\/css"\s*\/>/)
      if (match[1]) {
        const result = await axios.get(match[1])
        rawCSS.push(result.data)
      }
    }
  }

  const purgedResult = await new PurgeCSS().purge({
    content: [{ raw: html, extension: 'html' }],
    css: [{ raw: rawCSS.join(' ') }]
  })

  const cssList = [
    ...(purgedResult ? purgedResult.map(x => x.css) : []),
    navWorkaroundCSS
  ]

  const styleBlocks = html.match(/<style>([\s\S]*?)<\/style>/g)
  if (styleBlocks) {
    for (let block of styleBlocks) {
      cssList.push(block.replace('<style>', '').replace('</style>', ''))
    }
  }

  const ampCSS = cssList
    .join(' ')
    .replace(/\s\s+/g, ' ')
    .replace(/!important/g, '')
  // END - collect all external/internal CSS, merge them then purge unused css

  html = html.replace(/<html/g, '<html ⚡ ')
  html = html.replace(/<script[\s\S]*?<\/script>/gm, '')
  html = html.replace(/<link[\s\S]*?rel="stylesheet"\s*type="text\/css"\s*\/>/gm, '')
  html = html.replace(/<style[\s\S]*?<\/style>/gm, '')
  html = html.replace(/<form id="wf-form-Footer-Form"/gm, '<form id="wf-form-Footer-Form" action="/" target="_top" ')
  html = html.replace(/<form action="\/search" class="search-form w-form">/gm, '<form action="/search" class="search-form w-form" target="_top">')
  html = html.replace(/(<div.class="connect-icon"><)img([\s\S]*?alt=""[\s\S]*?)\/>(<\/div>)/g, '$1amp-img$2 height="18" width="18"></amp-img>$3')

  html = html.replace(/(banner-sidebar w-inline-block.><)img([\s\S]*?alt=..)\/>/g, '$1amp-img$2 height="400" width="300"></amp-img>')

  html = html.replace(/(social-icon.*?w-inline-block.><)img([\s\S]*?)\/>/g, '$1amp-img$2 height="18" width="18"></amp-img>')
  html = html.replace(/(class="button-icon.*?".*?)\/>/g, '$1 height="18" width="18"></amp-img>')
  html = html.replace(/(instagram-photo-link[\s\S]*?w-inline-block.><)img([\s\S]*?)\/>/g, '$1amp-img$2 width="50" height="50" heights="(min-width:500px) 100%, 100%"></amp-img>')
  
  html = html.replace(/<img/g, '<amp-img')

  html = html.replace(/(class=.mini-icon-grey.*?)\/>/g, '$1 height="14" width="14"></amp-img>')
  html = html.replace(/(class=.nav-logo.*?)\/>/g, '$1 height="28"></amp-img>')
  html = html.replace(/(class=.footer-v1-logo.*?)\/>/g, '$1 height="43" width="213.02"></amp-img>')
  html = html.replace(/(class=.mini-icon.*?)\/>/g, '$1 height="14" width="14"></amp-img>')
  html = html.replace(/(class=.more-link-arrow-hover.*?)\/>/g, '$1 height="14" width="14"></amp-img>')
  html = html.replace(/(class=.more-link-arrow.*?)\/>/g, '$1 height="14" width="14"></amp-img>')
  html = html.replace(/(class=.category-arrow.*?)\/>/g, '$1 height="16" width="16"></amp-img>')
  
  html = html.replace(/(x.svg.[\s\S]*?alt=.*?)\/>/g, '$1 height="12" width="12"></amp-img>')
  html = html.replace(/(class=.nav-arrow.*?)\/>/g, '$1 height="16" width="16"></amp-img>')

  // have not found the regex bug yet, but something is causing the replace for .mini-icon-grey adding height and width into a link, so this will remove them
  html = html.replace(/(<link.rel=.prerender[\s\S]*?.)height[\s\S]*?width[\s\S]*?(>)/g, '$1$2')

  html = html.replace(/<\/head>/, `<style amp-custom>${ampCSS}</style>${ampHead}</head>`)

  fs.writeFile(outputPath, html, { flag: 'w' }, function (error) {
    if (error) console.error(error)
  })
}

main()
import fs from 'fs';
import axios from 'axios';
import cheerio from 'cheerio';
const minify = require('html-minifier').minify;

function getAllAttributes (node: any): Array<any> {
  return node.attributes || Object.keys(node.attribs).map(
    name => ({ name, value: node.attribs[name] })
  );
}

async function main(url: string, username: string, password: string, outputPath: string): Promise<string> {
  if (!url) {
    throw new Error('URL is missing...')
  }

  // const inputPath = './blog-home.html'
  // const outputPath = './build/amp/blog-home.amp.html'
  const headPath: string = './common-head.html'
  const workaroundHTMLPath: string = './workaround.html'
  // const workaroundCSSPath: string = './workaround.css'
  const commonCSSPath: string = './common.min.css'
  const navLinkPath: string = './nav-link.html'

  // original HTML source
  // let html = fs.readFileSync(inputPath, { encoding: 'utf8', flag: 'r' });
  let html: string = ''
  try {
    const pageResult = await axios.get(url, {
      auth: {
        username,
        password
      }
    })
    html = pageResult.data
  } catch (error) {
    console.log('--------------------')
    console.log('Have troubles getting html source from the URL...')
    console.error(error)
    throw error
  }

  const $ = cheerio.load(html);

  const links = $('.w-nav-menu[role=navigation] a.nav-link').toArray()
  const navInfo = links.map((link) => {
    const l = $(link)
    return [l.attr('href') || '', l.text()]
  })

  // common amp-boilerplate and google font links
  const ampHead = fs.readFileSync(headPath, { encoding: 'utf8', flag: 'r' });

  // since the original NAV button in mobile view is controlled by js, this is a css version of that
  // const workaroundCSS: string = fs.readFileSync(workaroundCSSPath, { encoding: 'utf8', flag: 'r' });
  let workaroundHTML: string = fs.readFileSync(workaroundHTMLPath, { encoding: 'utf8', flag: 'r' });
  let navLink: string = fs.readFileSync(navLinkPath, { encoding: 'utf8', flag: 'r' });
  if (navInfo) {
    const navLinksHTML = []
    for (const info of navInfo) {
      const [href, text] = info
      navLinksHTML.push(navLink.replace('{{href}}', href).replace('{{text}}', text))
    }
    workaroundHTML = workaroundHTML.replace('{{nav-links}}', navLinksHTML.join(''))
  }

  const workaroundWrapper = $(`<label for="workaround-overlay-menu__checkbox" id="workaround-overlay-menu__label"></label>`);
  $('.menu-button.w-nav-button').wrap(workaroundWrapper)
  $('#Navigation').append(workaroundHTML)

  let ampCSS: string = ''
  try {
    const commonCSS: string = fs.readFileSync(commonCSSPath, { encoding: 'utf8', flag: 'r' });
    ampCSS = commonCSS
  } catch (error) {
    console.log('--------------------')
    console.log('Have troubles preparing purged css...')
    console.log(error)
    throw error;
  }

  $('html').attr('⚡', '')
  $('script').remove()
  $('style').remove()
  $('link[rel=stylesheet]').remove()
  $('head').append($(`<style amp-custom>${ampCSS}</style>${ampHead}`))
  $('form').toArray().forEach(node => {
    if (!$(node).attr('action')) {
      $(node).attr('action', '/')
    }

    if (!$(node).attr('target')) {
      $(node).attr('target', '_top')
    }
  })

  function converToAmpImg (query: string, width: number, height: number, heights?: string) {
    const root = $(query)
    if (!root) return

    const nodes = root.toArray()
    if (!nodes || nodes.length === 0) return

    const ampImg = $(`<amp-img height="${height}" width="${width}" ${heights ? heights : ''}></amp-img>`)

    nodes.forEach(n => {
      const attributes = getAllAttributes(n)
      const ampImgClone = ampImg.clone()
      attributes.forEach(attr => ampImgClone.attr(attr.name, attr.value))
      $(n).replaceWith(ampImgClone)
    })
  }

  converToAmpImg('.connect-icon img', 18, 18)
  converToAmpImg('.mini-icon-grey', 14, 14)
  converToAmpImg('.banner-sidebar.w-inline-block img', 300, 400)
  converToAmpImg('.social-icon.w-inline-block img', 18, 18)
  converToAmpImg('.button-icon', 18, 18)
  converToAmpImg('.instagram-photo-link img', 50, 50, '(min-width:500px) 100%, 100%')
  converToAmpImg('.nav-logo', 160.94, 28)
  converToAmpImg('.footer-v1-logo', 213.02, 43)
  converToAmpImg('.mini-icon', 14, 14)
  converToAmpImg('.more-link-arrow-hover', 14, 14)
  converToAmpImg('.more-link-arrow', 14, 14)
  converToAmpImg('.category-arrow', 16, 16)
  converToAmpImg('.close-button.w-inline-block img', 12, 12)
  converToAmpImg('.nav-arrow', 16, 16)
  converToAmpImg('.post-popup-close img', 12, 12)

  html = minify($.html(), {
    minifyCSS: true,
    minifyJS: true,
    removeComments: true
  })

  // this is a workaround fix for the minify function inserting both normal and encoded single quote together causing a invalid url in div element error
  html = html
    .replace(/'&quot;/g, '\'')
    .replace(/&quot;'/g, '\'')

  if (outputPath) {
    try {
      fs.writeFile(outputPath, html, { flag: 'w' }, function (error) {
        if (error) console.error(error)
      })
    } catch (error) {
      console.log('--------------------')
      console.log('Have troubles writing output html into a file...')
      console.error(error)
    }
  }
  return html
}

// console.log(process.argv);
// main('https://stg.cloudbet.com/en/blog', './build/amp/blog-home.amp.html')
const args = process.argv.slice(2)
main(args[0], args[1], args[2], args[3])
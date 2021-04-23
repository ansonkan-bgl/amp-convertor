import fs from 'fs';
import path from 'path';
import axios from 'axios';
import cheerio from 'cheerio';
import htmlMinify from 'html-minifier';

const commonCSS: string = fs.readFileSync(path.join(__dirname, 'common.min.css'), { encoding: 'utf8', flag: 'r' });
const ampHead = '<style amp-boilerplate> body{-webkit-animation: -amp-start 8s steps(1, end) 0s 1 normal both; -moz-animation: -amp-start 8s steps(1, end) 0s 1 normal both; -ms-animation: -amp-start 8s steps(1, end) 0s 1 normal both; animation: -amp-start 8s steps(1, end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility: hidden}to{visibility: visible}}@-moz-keyframes -amp-start{from{visibility: hidden}to{visibility: visible}}@-ms-keyframes -amp-start{from{visibility: hidden}to{visibility: visible}}@-o-keyframes -amp-start{from{visibility: hidden}to{visibility: visible}}@keyframes -amp-start{from{visibility: hidden}to{visibility: visible}}</style><noscript> <style amp-boilerplate> body{-webkit-animation: none; -moz-animation: none; -ms-animation: none; animation: none}</style></noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto"/><link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Noto%20Sans%20HK"/><link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Open%20Sans"/><script async custom-element="amp-form" src="https://cdn.ampproject.org/v0/amp-form-0.1.js"></script><script async src="https://cdn.ampproject.org/v0.js"></script>';
const workaroundHTML = '<input type="checkbox" class="workaround-overlay-menu workaround-overlay-menu__checkbox" id="workaround-overlay-menu__checkbox" style="display: none;"><nav role="navigation" id="workaround-overlay-menu__overlay-menu" class="workaround-overlay-menu workaround-overlay-menu__overlay-menu nav-menu-v1 w-nav-menu" data-nav-menu-open="">{{nav-links}}</nav>'
const navLink = '<a href="{{href}}" class="nav-link w-inline-block"><div>{{text}}</div></a>'

function getAllAttributes(node: any): Array<any> {
  return node.attributes || Object.keys(node.attribs).map(
    name => ({ name, value: node.attribs[name] })
  );
}

function converToAmpImg($: cheerio.Root, query: string, width: number, height: number, heights?: string) {
  const cheerio = $(query)
  if (!cheerio) return

  const nodes = cheerio.toArray()
  if (!nodes || nodes.length === 0) return

  const ampImg = $(`<amp-img height="${height}" width="${width}" ${heights ? heights : ''}></amp-img>`)

  nodes.forEach(n => {
    const attributes = getAllAttributes(n)
    const ampImgClone = ampImg.clone()
    attributes.forEach(attr => ampImgClone.attr(attr.name, attr.value))
    $(n).replaceWith(ampImgClone)
  })
}

async function main(url: string, outputPath: string): Promise<string> {
  if (!url) {
    throw new Error('URL is missing...')
  }

  // original HTML source
  let html: string = ''
  try {
    const pageResult = await axios.get(url)
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


  // since the original NAV button in mobile view is controlled by js, this is a css version of that
  let _workaroundHTML = workaroundHTML
  if (navInfo) {
    const navLinksHTML = []
    for (const info of navInfo) {
      const [href, text] = info
      navLinksHTML.push(navLink.replace('{{href}}', href).replace('{{text}}', text))
    }
    _workaroundHTML = _workaroundHTML.replace('{{nav-links}}', navLinksHTML.join(''))
  }

  const workaroundWrapper = $(`<label for="workaround-overlay-menu__checkbox" id="workaround-overlay-menu__label"></label>`);
  $('.menu-button.w-nav-button').wrap(workaroundWrapper)
  $('#Navigation').append(_workaroundHTML)

  let ampCSS: string = commonCSS
  
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

  converToAmpImg($, '.connect-icon img', 18, 18)
  converToAmpImg($, '.mini-icon-grey', 14, 14)
  converToAmpImg($, '.banner-sidebar.w-inline-block img', 300, 400)
  converToAmpImg($, '.social-icon.w-inline-block img', 18, 18)
  converToAmpImg($, '.button-icon', 18, 18)
  converToAmpImg($, '.instagram-photo-link img', 50, 50, '(min-width:500px) 100%, 100%')
  converToAmpImg($, '.nav-logo', 160.94, 28)
  converToAmpImg($, '.footer-v1-logo', 213.02, 43)
  converToAmpImg($, '.mini-icon', 14, 14)
  converToAmpImg($, '.more-link-arrow-hover', 14, 14)
  converToAmpImg($, '.more-link-arrow', 14, 14)
  converToAmpImg($, '.category-arrow', 16, 16)
  converToAmpImg($, '.close-button.w-inline-block img', 12, 12)
  converToAmpImg($, '.nav-arrow', 16, 16)
  converToAmpImg($, '.post-popup-close img', 12, 12)

  html = htmlMinify.minify($.html(), {
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
main(args[0], args[1])
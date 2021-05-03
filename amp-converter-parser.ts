import fs from 'fs';
import path from 'path';
import axios from 'axios';
import cheerio from 'cheerio';
import parse from 'url-parse';
// import { URL } from 'url';
// import htmlMinify from 'html-minifier';

const blogCSS: string = fs.readFileSync(path.join(__dirname, 'common.min.css'), { encoding: 'utf8', flag: 'r' });
const cbHomeCSS: string = fs.readFileSync(path.join(__dirname, 'cb-home.min.css'), { encoding: 'utf8', flag: 'r' });
const ampHead = '<style amp-boilerplate> body{-webkit-animation: -amp-start 8s steps(1, end) 0s 1 normal both; -moz-animation: -amp-start 8s steps(1, end) 0s 1 normal both; -ms-animation: -amp-start 8s steps(1, end) 0s 1 normal both; animation: -amp-start 8s steps(1, end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility: hidden}to{visibility: visible}}@-moz-keyframes -amp-start{from{visibility: hidden}to{visibility: visible}}@-ms-keyframes -amp-start{from{visibility: hidden}to{visibility: visible}}@-o-keyframes -amp-start{from{visibility: hidden}to{visibility: visible}}@keyframes -amp-start{from{visibility: hidden}to{visibility: visible}}</style><noscript> <style amp-boilerplate> body{-webkit-animation: none; -moz-animation: none; -ms-animation: none; animation: none}</style></noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto"/><link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Noto%20Sans%20HK"/><link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Open%20Sans"/><script async custom-element="amp-form" src="https://cdn.ampproject.org/v0/amp-form-0.1.js"></script><script async custom-element="amp-iframe" src="https://cdn.ampproject.org/v0/amp-iframe-0.1.js"></script><script async custom-element="amp-video" src="https://cdn.ampproject.org/v0/amp-video-0.1.js"></script><script async src="https://cdn.ampproject.org/v0.js"></script>';
const workaroundHTML = '<input type="checkbox" class="workaround-overlay-menu workaround-overlay-menu__checkbox" id="workaround-overlay-menu__checkbox" style="display: none;"><nav role="navigation" id="workaround-overlay-menu__overlay-menu" class="workaround-overlay-menu workaround-overlay-menu__overlay-menu nav-menu-v1 w-nav-menu" data-nav-menu-open="">{{nav-links}}</nav>'
const navLink = '<a href="{{href}}" class="nav-link w-inline-block"><div>{{text}}</div></a>'
const ampImgAttrBannedNames = [
  'loading'
]
const ampVideoAttrBannedNames = [
  'playsinline'
]

function getAllAttributes(node: any): Array<any> {
  return node.attributes || (node.attribs ? Object.keys(node.attribs).map(
    name => ({ name, value: node.attribs[name] })
  ) : []);
}

function convertToAmpImg($: cheerio.Root, query: string, width: number, height: number, heights?: string, unknownDimensions?: boolean) {
  const cheerio = $(query)
  if (!cheerio) return

  const nodes = cheerio.toArray()
  if (!nodes || nodes.length === 0) return

  const ampImg = $(`<amp-img ${unknownDimensions ? 'layout="responsive" class="main-image"' : ''} height="${height}" width="${width}" ${heights ? heights : ''}></amp-img>`)

  nodes.forEach(n => {
    const attributes = getAllAttributes(n)
      .filter(arr => !ampImgAttrBannedNames.includes(arr.name))
      .map(arr => {
        if (arr.name === 'class') {
          if (arr.value.includes('thumbnail')) arr.value += ' cover'
          else arr.value += ' main-image'
        }
        return arr
      })
    const ampImgClone = ampImg.clone()
    attributes.forEach(attr => ampImgClone.attr(attr.name, attr.value))
    $(n).replaceWith(ampImgClone)
  })
}

function convertToAmpIFrame($: cheerio.Root, width?: number, height?: number) {
  const iframes = $('iframe')
  const ampIFrame = $('<amp-iframe sandbox="allow-scripts allow-same-origin" layout="responsive" frameborder="0"></amp-iframe>')
  iframes.toArray().forEach(n => {
    const node = $(n)
    const attributes = getAllAttributes(n)
    const clone = ampIFrame.clone()
    attributes.forEach(attr => {
      if (attr.name === 'src') {
        const url = parse(attr.value)
        url.set('protocol', 'https')
        clone.attr(attr.name, url.href)
      } else {
        clone.attr(attr.name, attr.value)
      }
    })

    if (!clone.attr('width') || !clone.attr('height')) {
      clone.attr('width', node.css('width') ? node.css('width').replace('px', '') : `${width || 500}`)
      clone.attr('height', node.css('height') ? node.css('height').replace('px', '') : `${height || 218}`)
    }

    clone.css('width', 'auto')
    clone.css('height', 'auto')
    node.replaceWith(clone)
  })
}

function convertHeroVideoToAmpVideo($: cheerio.Root, width?: number, height?: number) {
  const videos = $('video')
  const ampVideo = $('<amp-video layout="responsive"></amp-video>')
  videos.toArray().forEach(n => {
    const node = $(n)
    const attributes = getAllAttributes(n)
      .filter(arr => !ampVideoAttrBannedNames.includes(arr.name))
    const clone = ampVideo.clone()
    attributes.forEach(attr => clone.attr(attr.name, attr.value))

    if (!clone.attr('width') || !clone.attr('height')) {
      clone.attr('width', node.css('width') ? node.css('width').replace('px', '') : `${width || 500}`)
      clone.attr('height', node.css('height') ? node.css('height').replace('px', '') : `${height || 500}`)
    }

    clone.css('width', 'auto')
    clone.css('height', 'auto')

    const children = node.children()
    clone.append(children)
    node.replaceWith(clone)
  })
}

async function getBlogAmp(url: string, outputPath: string): Promise<string> {
  if (!url) {
    throw new Error('URL is missing...')
  }

  // original HTML source
  let html = ''
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

  $('html').attr('⚡', '')
  $('script').remove()
  $('style').remove()
  $('#blog-nav-search-form').remove()
  $('link[rel=stylesheet]').remove()
  $('link[rel=amphtml]').remove()
  $('head').append($(`<style amp-custom>${blogCSS}</style>${ampHead}`))
  $('form').toArray().forEach(node => {
    if (!$(node).attr('action')) {
      $(node).attr('action', '/')
    }

    if (!$(node).attr('target')) {
      $(node).attr('target', '_top')
    }
  })

  convertToAmpImg($, '.connect-icon img', 18, 18)
  convertToAmpImg($, '.mini-icon-grey', 14, 14)
  convertToAmpImg($, '.banner-sidebar.w-inline-block img', 300, 400)
  convertToAmpImg($, '.social-icon.w-inline-block img', 18, 18)
  convertToAmpImg($, '.button-icon', 18, 18)
  convertToAmpImg($, '.instagram-photo-link img', 50, 50, '(min-width:500px) 100%, 100%')
  convertToAmpImg($, '.nav-logo', 160.94, 28)
  convertToAmpImg($, '.footer-v1-logo', 213.02, 43)
  convertToAmpImg($, '.mini-icon', 14, 14)
  convertToAmpImg($, '.more-link-arrow-hover', 14, 14)
  convertToAmpImg($, '.more-link-arrow', 14, 14)
  convertToAmpImg($, '.category-arrow', 16, 16)
  convertToAmpImg($, '.close-button.w-inline-block img', 12, 12)
  convertToAmpImg($, '.nav-arrow', 16, 16)
  convertToAmpImg($, '.post-popup-close img', 12, 12)
  convertToAmpImg($, 'img', 300, 200, '', true)
  convertToAmpIFrame($)

  html = $.html()

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

async function getCbHomeAmp(url: string, outputPath: string): Promise<string> {
  if (!url) {
    throw new Error('URL is missing...')
  }

  // original HTML source
  let html = ''
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

  $('html').attr('⚡', '')
  $('script').remove()
  $('style').remove()
  $('#blog-nav-search-form').remove()
  $('link[rel=stylesheet]').remove()
  $('link[rel=amphtml]').remove()
  $('head').append($(`<style amp-custom>${cbHomeCSS}</style>${ampHead}`))
  $('form').toArray().forEach(node => {
    if (!$(node).attr('action')) {
      $(node).attr('action', '/')
    }

    if (!$(node).attr('target')) {
      $(node).attr('target', '_top')
    }
  })

  // add workaround for language dropdown menu
  const language = $('#language-select')
  language.wrap($(`<label for="workaround__checkbox" id="workaround__label"></label>`))
  // const label = $(`<label for="workaround__checkbox" id="workaround__label"></label>`);
  // $('#language-select .w-dropdown-list').insertBefore($('<input type="checkbox" id="workaround__checkbox" style="display: none;">'))
  $('<input type="checkbox" id="workaround__checkbox" style="display: none;">').insertBefore('#language-select .w-dropdown-list')

  convertToAmpImg($, '.sub-hero-button img', 16, 16)
  convertToAmpImg($, '.div-block-8 img', 58, 58)
  convertToAmpImg($, '.account-icons', 112, 112)
  convertToAmpImg($, '.image-5', 506, 204, '', true)
  convertToAmpImg($, '.image-get-started', 48, 48)
  convertToAmpImg($, '.footer-icon', 48, 48)
  convertToAmpImg($, '.image-9', 500, 500, '', true)
  convertToAmpImg($, '.image-11', 90, 80.844)
  convertToAmpImg($, '.image-12', 150, 95.313)
  convertToAmpImg($, '.live-dealer', 120.203, 253.125)
  convertToAmpImg($, '.logo', 100, 20.19)
  convertToAmpImg($, '.image-14', 23, 23)
  convertToAmpImg($, '.language-dropdown a img', 16, 16)
  convertToAmpImg($, '.arrow', 22, 37)
  convertToAmpImg($, 'img', 300, 200, '', true)
  convertHeroVideoToAmpVideo($)

  html = $.html()

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
if (args[2] === '1') {
  // cloudbet home page 
  getCbHomeAmp(args[0], args[1])
} else {
  // blog pages
  getBlogAmp(args[0], args[1])
}
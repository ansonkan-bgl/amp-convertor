import fs from 'fs';
import path from 'path';
import axios from 'axios';
import parse from 'url-parse';
import cheerio, { CheerioAPI, Element, Node } from 'cheerio'

export const img = [
  // the global on the language dropdown
  { query: '#language-select .dropdown-toggle > img', width: 23, height: 23 },
  // the country flags inside of the language dropdown menu
  { query: '.language-dropdown a img', width: 16, height: 16 },
  // background image of the Hero section
  { query: 'div.hero-bg img', width: 3, height: 2, unknownDimensions: true, noDefaultClass: true },
  // in the Features section which is right below the sub hero section, there is a svg on the left of each sub point, this is for them
  { query: '.feature-icon', width: 58, height: 58 },
  // the dealer
  { query: '#feature-img-live-dealer img', width: 120.203, height: 253.125 },
  // this is for the svgs in the Sign-up section which is right below the Features section
  { query: '.account-icons', width: 100, height: 100 },
  // in the Get Started section which is below the Offer section, this is for all of the icons inside
  { query: '.image-get-started', width: 48, height: 48 },
  // the footer logo
  { query: '.footer-logo', width: 178, height: 35.94, unknownDimensions: true, noDefaultClass: true },
  // arrow icons for the footer sections
  { query: '.arrow', width: 22, height: 37 },
  // social icons in the footer
  { query: '.social-symbol', width: 18, height: 18 },
  // for all the crypto currency icons in the footer
  { query: '.footer-icon', width: 48, height: 48 },
  // replace the remaining images, including the Hero background image
  { query: 'img', width: 300, height: 200, unknownDimensions: true },
]

export const video = [
  // background videos in the Sub Hero section which is the section below the Hero section
  { query: '.sub-hero-grid video', width: 1, height: 1 },
  // background video in the Summary section which is the last section before the footer
  { query: '.summary video', width: 1, height: 4 }
]

type Attribute = {
  name: string,
  value: string
}

type ReplaceInput = {
  query: string;
  width?: number;
  height?: number;
}

type ReplaceImgInput = ReplaceInput & {
  width: number;
  height: number;
  heights?: string;
  unknownDimensions?: boolean;
  noDefaultClass?: boolean;
}

type ReplaceIFrameInput = ReplaceInput

type ReplaceVideoInput = ReplaceInput

class AmpHelper {
  protected $: CheerioAPI;
  protected ampImgAttrBannedNames = [
    'loading',
    'width',
    'height'
  ];
  protected ampVideoAttrBannedNames = [
    'playsinline'
  ];

  constructor(cheerioAPI: CheerioAPI) {
    this.$ = cheerioAPI
  }

  cleanUp(): void {
    const html = this.$('html')
    html.attr('⚡', '')
    this.$('script').remove()
    this.$('style').remove()
    this.$('link[rel=stylesheet]').remove()
    this.$('link[rel=amphtml]').remove()

    const htmlAttrs = this.getAllAttributes(html[0])
    if (htmlAttrs) {
      const webflowAttrs = htmlAttrs
        .map((a: Attribute) => a.name)
        .filter((name: string) => name.toLowerCase().includes('data-wf-'))
      html.removeAttr(webflowAttrs.join(' '))
    }
  }

  private getAllAttributes(node: any): Array<Attribute> {
    if (!node) return []
    return node.attributes || (node.attribs ? Object.entries(node.attribs).map(
      ([name, value]) => ({ name, value })
    ) : []);
  }

  replaceImg(input: ReplaceImgInput | Array<ReplaceImgInput>) {
    if (Array.isArray(input)) {
      for (const i of input) {
        this.replaceImgHelper(i)
      }
    } else {
      this.replaceImgHelper(input)
    }
  }

  private replaceImgHelper(input: ReplaceImgInput) {
    const {
      query,
      width,
      height,
      heights,
      unknownDimensions,
      noDefaultClass,
    } = input

    const cheerio = this.$(query)
    if (!cheerio) return

    const nodes = cheerio.toArray()
    if (!nodes || nodes.length === 0) return

    const ampImg = this.$(`<amp-img height="${height}" width="${width}"></amp-img>`)
    if (unknownDimensions) {
      ampImg.attr('layout', 'responsive')
    }
    if (heights) {
      ampImg.attr('heights', heights)
    }
    if (!noDefaultClass) {
      ampImg.addClass('main-image')
    }

    nodes.forEach(n => {
      const attributes = this.getAllAttributes(n)
        .filter(arr => !this.ampImgAttrBannedNames.includes(arr.name))
        .map(arr => {
          if (arr.name === 'class') {
            if (arr.value.includes('thumbnail')) arr.value += ' cover'
            else if (!noDefaultClass) arr.value += ' main-image'
          }
          return arr
        })
      const ampImgClone = ampImg.clone()
      attributes.forEach(attr => ampImgClone.attr(attr.name, attr.value))
      this.$(n).replaceWith(ampImgClone)
    })
  }

  fixFormAttributes() {
    this.$('form').toArray().forEach(node => {
      if (!this.$(node).attr('action')) {
        this.$(node).attr('action', '/')
      }

      if (!this.$(node).attr('target')) {
        this.$(node).attr('target', '_top')
      }
    })
  }

  replaceIFrame(input: ReplaceIFrameInput | Array<ReplaceIFrameInput>) {
    if (Array.isArray(input)) {
      input.forEach(i => this.replaceIFrameHelper(i))
    } else {
      this.replaceIFrameHelper(input)
    }
  }

  private replaceIFrameHelper(input: ReplaceIFrameInput) {
    const { query, width, height } = input

    const iframes = this.$(query)
    const ampIFrame = this.$('<amp-iframe sandbox="allow-scripts allow-same-origin" layout="responsive" frameborder="0"></amp-iframe>')
    iframes.toArray().forEach(n => {
      const node = this.$(n)
      const attributes = this.getAllAttributes(n)
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

  replaceVideo(input: ReplaceVideoInput | Array<ReplaceVideoInput>) {
    if (Array.isArray(input)) {
      input.forEach(i => this.replaceVideoHelper(i))
    } else {
      this.replaceVideoHelper(input)
    }
  }

  private replaceVideoHelper(input: ReplaceVideoInput) {
    const { query, width, height } = input

    const videos = this.$(query)
    const ampVideo = this.$('<amp-video layout="responsive" class="cover" poster="#"></amp-video>')
    videos.toArray().forEach(n => {
      const node = this.$(n)
      const attributes = this.getAllAttributes(n)
        .filter(arr => !this.ampVideoAttrBannedNames.includes(arr.name))
        .map(arr => {
          if (arr.name === 'class') arr.value += ' cover'
          return arr
        })
      const clone = ampVideo.clone()
      attributes.forEach(attr => clone.attr(attr.name, attr.value))

      if (clone.css('background-image')) {
        clone.attr(
          'poster',
          clone.css('background-image')
            .replace('url(', '')
            .replace(');', '')
            .replace(')', '')
        )
      }

      if (!clone.attr('width') || !clone.attr('height')) {
        clone.attr('width', node.css('width') ? node.css('width').replace('px', '') : `${width || 500}`)
        clone.attr('height', node.css('height') ? node.css('height').replace('px', '') : `${height || 500}`)
      }

      const children = node.children()
      clone.append(children)
      node.replaceWith(clone)
    })
  }

  addLanguageDropdownWorkaround() {
    // this needs css :checked to function, so please remember to update css accordingly
    const language = this.$('#language-select')
    language.wrap(this.$(`<label for="workaround__checkbox" id="workaround__label"></label>`))
    this.$('<input type="checkbox" id="workaround__checkbox" style="display: none;">').insertBefore('#language-select nav')
  }

  fixAlternateLangLinks(): void {
    this.$('link[rel=alternate]')
      .toArray()
      .forEach((n: Element) => {
        const link = this.$(n)
        link.attr('href', `${link.attr('href')}amp/`)
      })
  }
}

const blogCSS: string = fs.readFileSync(path.join(__dirname, 'blog.min.css'), { encoding: 'utf8', flag: 'r' });
const cbHomeCSS: string = fs.readFileSync(path.join(__dirname, 'cb-home.min.css'), { encoding: 'utf8', flag: 'r' });
const cbDashHomeCSS: string = fs.readFileSync(path.join(__dirname, 'dash.min.css'), { encoding: 'utf8', flag: 'r' });
const ampHead = '<style amp-boilerplate> body{-webkit-animation: -amp-start 8s steps(1, end) 0s 1 normal both; -moz-animation: -amp-start 8s steps(1, end) 0s 1 normal both; -ms-animation: -amp-start 8s steps(1, end) 0s 1 normal both; animation: -amp-start 8s steps(1, end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility: hidden}to{visibility: visible}}@-moz-keyframes -amp-start{from{visibility: hidden}to{visibility: visible}}@-ms-keyframes -amp-start{from{visibility: hidden}to{visibility: visible}}@-o-keyframes -amp-start{from{visibility: hidden}to{visibility: visible}}@keyframes -amp-start{from{visibility: hidden}to{visibility: visible}}</style><noscript> <style amp-boilerplate> body{-webkit-animation: none; -moz-animation: none; -ms-animation: none; animation: none}</style></noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto"/><link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Noto%20Sans%20HK"/><link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Open%20Sans"/><script async custom-element="amp-form" src="https://cdn.ampproject.org/v0/amp-form-0.1.js"></script><script async custom-element="amp-iframe" src="https://cdn.ampproject.org/v0/amp-iframe-0.1.js"></script><script async custom-element="amp-video" src="https://cdn.ampproject.org/v0/amp-video-0.1.js"></script><script async src="https://cdn.ampproject.org/v0.js"></script>';
const workaroundHTML = '<input type="checkbox" class="workaround-overlay-menu workaround-overlay-menu__checkbox" id="workaround-overlay-menu__checkbox" style="display: none;"><nav role="navigation" id="workaround-overlay-menu__overlay-menu" class="workaround-overlay-menu workaround-overlay-menu__overlay-menu nav-menu-v1 w-nav-menu" data-nav-menu-open=""><div class="nav-links-wrapper">{{nav-links}}</div><div class="lang-links-wrapper">{{lang-links}}</div></nav>'
const navLink = '<a href="{{href}}" class="nav-link w-inline-block"><div>{{text}}</div></a>'

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
  const ampHelper = new AmpHelper($)

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

  const langMenuLinks = $('#language-select nav').html()
  if (langMenuLinks) {
    _workaroundHTML = _workaroundHTML.replace('{{lang-links}}', langMenuLinks || '')
  }

  // nav menu
  const workaroundWrapper = $(`<label for="workaround-overlay-menu__checkbox" id="workaround-overlay-menu__label"></label>`);
  $('.menu-button.w-nav-button').wrap(workaroundWrapper)
  $('#Navigation').append(_workaroundHTML)

  // language dropdown
  ampHelper.addLanguageDropdownWorkaround()

  ampHelper.cleanUp()
  $('#blog-nav-search-form').remove()
  $('head').append($(`<style amp-custom>${blogCSS}</style>${ampHead}`))
  ampHelper.fixFormAttributes()

  ampHelper.replaceImg([
    { query: '#language-select .dropdown-toggle img', width: 23, height: 23 },
    { query: '#language-select nav img', width: 16, height: 16 },
    { query: '.lang-links-wrapper img', width: 16, height: 16 },
    { query: '.connect-icon img', width: 18, height: 18 },
    { query: '.mini-icon-grey', width: 14, height: 14 },
    { query: '.banner-sidebar.w-inline-block img', width: 300, height: 400 },
    { query: '.social-icon.w-inline-block img', width: 18, height: 18 },
    { query: '.button-icon', width: 18, height: 18 },
    { query: '.instagram-photo-link img', width: 50, height: 50, heights: '(min-width:500px) 100%, 100%' },
    { query: '.nav-logo', width: 160.94, height: 28 },
    { query: '.footer-v1-logo', width: 213.02, height: 43 },
    { query: '.mini-icon', width: 14, height: 14 },
    { query: '.more-link-arrow-hover', width: 14, height: 14 },
    { query: '.more-link-arrow', width: 14, height: 14 },
    { query: '.category-arrow', width: 16, height: 16 },
    { query: '.close-button.w-inline-block img', width: 12, height: 12 },
    { query: '.nav-arrow', width: 16, height: 16 },
    { query: '.post-popup-close img', width: 12, height: 12 },
    { query: '.post .post-rich-text img', width: 300, height: 200, unknownDimensions: true },
    { query: 'img', width: 300, height: 200, unknownDimensions: true }
  ])

  ampHelper.replaceIFrame([
    { query: '.w-richtext-figure-type-video iframe', width: 403.19, height: 226.8 },
    { query: 'iframe' }
  ])

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

  const $ = cheerio.load(html)
  const ampHelper = new AmpHelper($)

  ampHelper.cleanUp()
  $('head')
    .append($('<link rel="canonical" href="https://www.cloudbet.com/">'))
    .append($(`<style amp-custom>${cbHomeCSS}</style>${ampHead}`))
  ampHelper.fixFormAttributes();
  ampHelper.addLanguageDropdownWorkaround();
  ampHelper.fixAlternateLangLinks();

  ampHelper.replaceImg([
    // the logo on the Navigation bar
    { query: '.logo', width: 100, height: 61 },
    // the arrow icons inside of the sub hero section which have 3 videos playing in the background
    { query: '.sub-hero-button img', width: 16, height: 16 },
    // the Buy BTC image in the first point of the Feature section
    { query: '#feature-img-buy-crypto img', width: 300, height: 300, unknownDimensions: true, noDefaultClass: true },
    // in the Second point of the Feature section, the phone background
    { query: '#feature-img-smart-phone img', width: 1, height: 1, unknownDimensions: true, noDefaultClass: true },
    // the dice
    { query: '#feature-img-dice', width: 90, height: 80.844 },
    // the chip
    { query: '#feature-img-chip', width: 150, height: 95.313 },
    // the main image in the third point of the Feature section
    { query: '#feature-img-sportsbook img', width: 300, height: 300, unknownDimensions: true, noDefaultClass: true },
    // the main image in the forth point of the Feature section
    { query: '#feature-img-esports img', width: 300, height: 300, unknownDimensions: true, noDefaultClass: true },
    // in the Offer section which is below the Sign-up section, there are 2 characters images, this is for them
    { query: '.offer-main-img img', width: 506, height: 204, unknownDimensions: true, noDefaultClass: true },
    // for the background image behind those 2 characters
    { query: '.offer-bg img', width: 3, height: 2, unknownDimensions: true, noDefaultClass: true },
    ...img
  ])

  ampHelper.replaceVideo([
    ...video
  ])

  // replace anhor relative href to prevent wrong href, e.g. auth/sign-up -> https://stg.cloudbet.com/en/amp/auth/sign-in
  const anchors = $('a')
  anchors
    .toArray()
    .filter(a => {
      const base = $(a)
      const href = base.attr('href')
      return !(!href || href.match(/^http/i) || href.match(/^\//i))
    })
    .forEach(a => {
      const base = $(a)
      base.attr('href', `https://stg.cloudbet.com/${base.attr('href')}`)
    })

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

async function getCbDashHomeAmp(url: string, outputPath: string): Promise<string> {
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
  const ampHelper = new AmpHelper($)

  ampHelper.cleanUp()
  $('head')
    .append($('<link rel="canonical" href="https://www.cloudbet.com/">'))
    .append($(`<style amp-custom>${cbDashHomeCSS}</style>${ampHead}`))
  ampHelper.fixFormAttributes()
  ampHelper.addLanguageDropdownWorkaround()

  ampHelper.replaceImg([
    // the logo on the Navigation bar
    { query: '.logo', width: 198, height: 26 },
    // the Buy BTC image in the first point of the Feature section
    { query: '#feature-img-buy-crypto', width: 300, height: 300, unknownDimensions: true, noDefaultClass: true },
    // the main image in the second point of the Feature section
    { query: '#feature-img-sportsbook', width: 288, height: 300.67, unknownDimensions: true, noDefaultClass: true },
    // the main image in the third point of the Feature section
    { query: '#feature-img-esports img', width: 300, height: 300, unknownDimensions: true, noDefaultClass: true },
    // the phone background in the forth point of the Feature section
    { query: '#feature-img-smart-phone img', width: 1, height: 1, unknownDimensions: true, noDefaultClass: true },
    // the dice
    { query: '#feature-img-dice', width: 77, height: 74 },
    // the coin
    { query: '#feature-img-chip', width: 128, height: 85 },
    // the main images in the cards under the Offer section
    { query: '.offer-main-img', width: 309, height: 138, unknownDimensions: true },
    ...img
  ])

  ampHelper.replaceVideo([
    ...video
  ])

  // replace anhor relative href to prevent wrong href, e.g. auth/sign-up -> https://stg.cloudbet.com/en/amp/auth/sign-in
  const anchors = $('a')
  anchors
    .toArray()
    .filter(a => {
      const base = $(a)
      const href = base.attr('href')
      return !(!href || href.match(/^http/i) || href.match(/^\//i))
    })
    .forEach(a => {
      const base = $(a)
      console.log(base.attr('href'), `https://stg.cloudbet.com/${base.attr('href')}`)
      base.attr('href', `https://stg.cloudbet.com/${base.attr('href')}`)
    })

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
} else if (args[2] === '2') {
  // cloudbet dash home page 
  getCbDashHomeAmp(args[0], args[1])
} else {
  // blog pages
  getBlogAmp(args[0], args[1])
}
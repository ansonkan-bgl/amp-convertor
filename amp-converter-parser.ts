import fs from 'fs';
import path from 'path';
import axios from 'axios';
import parse from 'url-parse';
import cheerio, { CheerioAPI, Element, Node } from 'cheerio'

type ReplaceImgInput = {
  query: string;
  width: number;
  height: number;
  heights?: string;
  unknownDimensions?: boolean;
  noDefaultClass?: boolean;
}

type ReplaceIFrameInput = {
  query: string;
  width?: number;
  height?: number;
}

type ReplaceVideoInput = {
  query: string;
  width?: number;
  height?: number;
}

class AmpHelper {
  $: CheerioAPI;
  ampImgAttrBannedNames = [
    'loading',
    'width',
    'height'
  ];
  ampVideoAttrBannedNames = [
    'playsinline'
  ];

  constructor(cheerioAPI: CheerioAPI) {
    this.$ = cheerioAPI
  }

  cleanUp() {
    this.$('html').attr('⚡', '')
    this.$('script').remove()
    this.$('style').remove()
    this.$('link[rel=stylesheet]').remove()
    this.$('link[rel=amphtml]').remove()
  }

  private getAllAttributes(node: any): Array<any> {
    return node.attributes || (node.attribs ? Object.keys(node.attribs).map(
      name => ({ name, value: node.attribs[name] })
    ) : []);
  }

  replaceImg(input: ReplaceImgInput | Array<ReplaceImgInput>) {
    if (Array.isArray(input)) {
      input.forEach(i => this.replaceImgHelper(i))
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

    const ampImg = this.$(`<amp-img ${unknownDimensions ? 'layout="responsive"' : ''} height="${height}" width="${width}" ${heights ? heights : ''}></amp-img>`)
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
    { query: '.post .post-rich-text img', width: 300, height: 200 },
    { query: 'img', width: 300, height: 200, unknownDimensions: true }
  ])

  ampHelper.replaceIFrame({
    query: 'iframe'
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
  const ampHelper = new AmpHelper($)

  ampHelper.cleanUp();
  $('head')
    .append($('<link rel="canonical" href="https://www.cloudbet.com/">'))
    .append($(`<style amp-custom>${cbHomeCSS}</style>${ampHead}`));
  ampHelper.fixFormAttributes();
  // ampHelper.addLanguageDropdownWorkaround();

  // ampHelper.replaceImg([
  //   { query: '.footer-logo', width: 178, height: 35.94, unknownDimensions: true, noDefaultClass: true },
  //   { query: '.sub-hero-button img', width: 16, height: 16 },
  //   { query: '.div-block-8 img', width: 58, height: 58 },
  //   { query: '.account-icons', width: 112, height: 112 },
  //   { query: '.image-5', width: 506, height: 204, unknownDimensions: true, noDefaultClass: true },
  //   { query: '.image-get-started', width: 48, height: 48 },
  //   { query: '.footer-icon', width: 48, height: 48 },
  //   { query: '.buy-btc', width: 300, height: 300 },
  //   { query: '.html-embed-4 img', width: 1, height: 1, unknownDimensions: true, noDefaultClass: true },
  //   { query: '.image-9', width: 300, height: 300 },
  //   { query: '.image-10', width: 300, height: 300 },
  //   { query: '.image-15', width: 3, height: 2, unknownDimensions: true, noDefaultClass: true },
  //   { query: '.image-11', width: 90, height: 80.844 },
  //   { query: '.image-12', width: 150, height: 95.313 },
  //   { query: '.live-dealer', width: 120.203, height: 253.125 },
  //   { query: '.logo', width: 100, height: 61 },
  //   { query: '.image-13', width: 16, height: 16 },
  //   { query: '.image-14', width: 23, height: 23 },
  //   { query: '.language-dropdown a img', width: 16, height: 16 },
  //   { query: '.arrow', width: 22, height: 37 },
  //   { query: '.social-symbol', width: 18, height: 18 },
  //   { query: 'img', width: 300, height: 200, unknownDimensions: true }
  // ])

  // ampHelper.replaceVideo([
  //   { query: '.sub-hero-content-wrap video', width: 1, height: 1 },
  //   { query: '.summary video', width: 1, height: 4 }
  // ])

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
    { query: '#language-select .dropdown-toggle > img', width: 23, height: 23 },
    { query: '.footer-logo', width: 178, height: 30, unknownDimensions: true, noDefaultClass: true },
    { query: '.div-block-8 img', width: 58, height: 58 },
    { query: '.account-icons-2', width: 100, height: 100 },
    { query: '.image-get-started', width: 48, height: 48 },
    { query: '.footer-icon', width: 48, height: 48 },
    { query: '.features > .container > div:nth-child(1) > img', width: 300, height: 300, unknownDimensions: true },
    { query: '.features > .container > div:nth-child(2) > img', width: 288, height: 300.67 },
    { query: '.features > .container > div:nth-child(3) .image-9', width: 300, height: 300 },
    { query: '.features > .container > div:nth-child(4) .html-embed-4 img', width: 1, height: 1, unknownDimensions: true, noDefaultClass: true },
    { query: '.features > .container > div:nth-child(4) .live-dealer', width: 120.203, height: 253.125 },
    { query: '.features > .container > div:nth-child(4) .image-11', width: 77, height: 74 },
    { query: '.features > .container > div:nth-child(4) .image-12', width: 128, height: 85 },
    { query: '.offer .offer-image:nth-child(1)', width: 309, height: 138, unknownDimensions: true },
    { query: '.offer .offer-image:nth-child(2)', width: 252, height: 200, unknownDimensions: true },
    { query: '.logo', width: 198, height: 26 },
    { query: '.language-dropdown a img', width: 16, height: 16 },
    { query: '.arrow', width: 22, height: 37 },
    { query: 'img', width: 300, height: 200, unknownDimensions: true },
  ])

  ampHelper.replaceVideo([
    { query: '.subhero video', width: 1, height: 1 },
    { query: '.summary video', width: 1, height: 4 }
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
} if (args[2] === '2') {
  // cloudbet dash home page 
  getCbDashHomeAmp(args[0], args[1])
} else {
  // blog pages
  getBlogAmp(args[0], args[1])
}
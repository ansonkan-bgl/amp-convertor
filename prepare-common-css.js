const fs = require('fs')
const { PurgeCSS } = require('purgecss')
const minify = require('html-minifier').minify;

async function main() {
    let html = fs.readFileSync('./all.html', { encoding: 'utf8', flag: 'r' });
    let css = fs.readFileSync('./common.css', { encoding: 'utf8', flag: 'r' });

    const purgedResult = await new PurgeCSS().purge({
        content: [{ raw: html, extension: 'html' }],
        css: [{ raw: css }]
    })

    const workaroundCSS = fs.readFileSync('./workaround.css', { encoding: 'utf8', flag: 'r' });

    const cssList = [
        ...(purgedResult ? purgedResult.map(x => x.css) : []),
        workaroundCSS
    ]

    let allCSS = cssList
        .join(' ')
        .replace(/!important/g, '')

    allCSS = minify(allCSS, {
        minifyCSS: true,
        removeComments: true
    })

    fs.writeFile('./build/css/all.css', allCSS, { flag: 'w' }, function(error) {
        if (error) console.error(error)
    })
}

main()
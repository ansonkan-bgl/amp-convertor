if (location.hostname.includes('cloudbet-weglot.com')) {
  const str = '<head><link rel="alternate" hreflang="en" href="https://www.cloudbet-weglot.com"><link rel="alternate" hreflang="de" href="https://de.cloudbet-weglot.com"><link rel="alternate" hreflang="es" href="https://es.cloudbet-weglot.com"><link rel="alternate" hreflang="pt" href="https://pt.cloudbet-weglot.com"><link rel="alternate" hreflang="id" href="https://id.cloudbet-weglot.com"><link rel="alternate" hreflang="fr" href="https://fr.cloudbet-weglot.com"><link rel="alternate" hreflang="it" href="https://it.cloudbet-weglot.com"><link rel="alternate" hreflang="ja" href="https://ja.cloudbet-weglot.com"><link rel="alternate" hreflang="pl" href="https://pl.cloudbet-weglot.com"><link rel="alternate" hreflang="ru" href="https://ru.cloudbet-weglot.com"><link rel="alternate" hreflang="th" href="https://th.cloudbet-weglot.com"><script type="text/javascript" src="https://cdn.weglot.com/weglot.min.js"></script><script>Weglot.initialize({api_key: \'wg_d84b0abc748dbdc714f7590617e3e2d82\'});</script></head>'
  const parser = new DOMParser();

  const doc = parser.parseFromString(str, 'text/html');
  const children = doc.querySelectorAll('head > *')
  const head = document.querySelector('body');
  children.forEach(c => { head.append(c) })
}

// (function () {
    //   const str = '<head><link rel="alternate" hreflang="en" href="https://www.cloudbet-weglot.com"><link rel="alternate" hreflang="de" href="https://de.cloudbet-weglot.com"><link rel="alternate" hreflang="es" href="https://es.cloudbet-weglot.com"><link rel="alternate" hreflang="pt" href="https://pt.cloudbet-weglot.com"><link rel="alternate" hreflang="id" href="https://id.cloudbet-weglot.com"><link rel="alternate" hreflang="fr" href="https://fr.cloudbet-weglot.com"><link rel="alternate" hreflang="it" href="https://it.cloudbet-weglot.com"><link rel="alternate" hreflang="ja" href="https://ja.cloudbet-weglot.com"><link rel="alternate" hreflang="pl" href="https://pl.cloudbet-weglot.com"><link rel="alternate" hreflang="ru" href="https://ru.cloudbet-weglot.com"><link rel="alternate" hreflang="th" href="https://th.cloudbet-weglot.com"></head>'
    //     + '<script type="text/javascript" src="https://cdn.weglot.com/weglot.min.js"></scr' + 'ipt></head>';
    //   const parser = new DOMParser();
  
    //   const doc = parser.parseFromString(str, 'text/html');
    //   const children = doc.querySelectorAll('head > *')
    //   const head = document.querySelector('head');
    //   children.forEach(c => { head.append(c) })
    //   Weglot.initialize({ api_key: 'wg_d84b0abc748dbdc714f7590617e3e2d82'})
    // })();

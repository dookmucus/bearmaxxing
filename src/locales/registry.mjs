import en from './en.json' with {type:'json'};
import es from './es.json' with {type:'json'};
import fr from './fr.json' with {type:'json'};
import de from './de.json' with {type:'json'};
import tr from './tr.json' with {type:'json'};
import ko from './ko.json' with {type:'json'};
import zhHans from './zh-Hans.json' with {type:'json'};
import zhHant from './zh-Hant.json' with {type:'json'};
// Bundled community drafts. Native names identify languages, not official game terminology.
export const languages={
 en:{name:'English',messages:en},
 es:{name:'Español',messages:es},
 fr:{name:'Français',messages:fr},
 de:{name:'Deutsch',messages:de},
 tr:{name:'Türkçe',messages:tr},
 ko:{name:'한국어',messages:ko},
 'zh-Hans':{name:'简体中文',messages:zhHans},
 'zh-Hant':{name:'繁體中文',messages:zhHant},
};

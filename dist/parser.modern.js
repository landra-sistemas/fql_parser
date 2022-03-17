import e from"xregexp";import t from"lodash";function r(){r=function(e,t){return new l(e,void 0,t)};var e=RegExp.prototype,t=new WeakMap;function l(e,r,s){var n=new RegExp(e,r);return t.set(n,s||t.get(e)),i(n,l.prototype)}function n(e,r){var s=t.get(r);return Object.keys(s).reduce(function(t,r){return t[r]=e[s[r]],t},Object.create(null))}return s(l,RegExp),l.prototype.exec=function(t){var r=e.exec.call(this,t);return r&&(r.groups=n(r,this)),r},l.prototype[Symbol.replace]=function(r,s){if("string"==typeof s){var i=t.get(this);return e[Symbol.replace].call(this,r,s.replace(/\$<([^>]+)>/g,function(e,t){return"$"+i[t]}))}if("function"==typeof s){var l=this;return e[Symbol.replace].call(this,r,function(){var e=arguments;return"object"!=typeof e[e.length-1]&&(e=[].slice.call(e)).push(n(e,l)),s.apply(this,e)})}return e[Symbol.replace].call(this,r,s)},r.apply(this,arguments)}function s(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),Object.defineProperty(e,"prototype",{writable:!1}),t&&i(e,t)}function i(e,t){return i=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e},i(e,t)}class l{constructor(s){this.LIKE="LIKE",this.parse=e=>{let r=[],s=e;const i=this.splitPatentheses(e);if(!t.isEmpty(i))for(const e in i)s=s.replace(`${i[e]}`,`#${e}`),r.push(this.parse(i[e]));return this.parseQS(s,r)},this.splitPatentheses=t=>e.matchRecursive(t,"\\(","\\)","g"),this.parseQS=(e,t)=>{const s=/*#__PURE__*/r(/(([^\s|^:|^!:|^>:|^<:]+)(:|!:|>:|<:)([^\s|"|\[]+|".*?"|\[.*?\]))? ?(OR|AND)? ?([\+|\-|\(#][^\s]+|)? ?/gm,{key:2,operator:3,value:4,logic:5,plain:6});let i,l=[];for(;null!==(i=s.exec(e));){if(i.index===s.lastIndex&&s.lastIndex++,null===i)continue;let{key:e,value:r,operator:n,plain:a,logic:o}=i.groups;n||(n=":");let c=this.LIKE;switch(n){case":":default:c=this.LIKE;break;case"!:":c=`NOT ${this.LIKE}`;break;case">:":c=">";break;case"<:":c="<"}if(r&&r.match(/\[.*?\]/)&&(c=c===`NOT ${this.LIKE}`?"NOT BETWEEN":"BETWEEN"),r&&-1!==r.indexOf(",")&&(c=c===`NOT ${this.LIKE}`?"NOT IN":"IN"),e&&l.push({key:this.checkAliases(e),operator:c,value:this.parseValue(r),logic:o||"AND"}),a&&-1!==a.indexOf("#")){const e=a.replace(/#|\(|\)/g,"");l.push(t[parseInt(e)])}else if(this.allowGlobalSearch&&a&&-1===a.indexOf("#")){let e="plain_+";a.startsWith("-")&&(e="plain_-"),l.push({operator:e,value:this.parseValue(a.replace(/\+|\-/gm,"")),logic:o||"AND"})}}return l},this.aliases=s&&s.aliases||{},this.allowGlobalSearch=s&&s.allowGlobalSearch||!1,s&&s.caseInsensitive&&(this.LIKE="ILIKE")}checkAliases(e){return this.aliases?this.aliases[e]?this.aliases[e].replaceAll("{{key}}",e):this.aliases["*"]?this.aliases["*"].replaceAll("{{key}}",e):e:e}parseValue(e){return e.replaceAll(/"|\?/g,"").replaceAll("*","%")}}class n{constructor(e,t="pg"){this.table=e,this.dialect=t}parse(e){let t="",r=[];for(let s of e)if(Array.isArray(s)){const{query:e,bindings:i}=this.parse(s);t+=`(${e})`,r=[...r,...i]}else if("object"==typeof s){const{query:e,bindings:i}=this.convertCondition(s);t+=e,r=[...r,...i]}else console.warn("Unknown type detected in qry");return t=t.replace(/( AND | OR )$/gm,""),{query:t,bindings:r}}convertCondition(e){let{key:t,operator:r,value:s,logic:i}=e;if(!t){if("pg"!==this.dialect)return console.warn("Only PostgreSQL supports global searching"),"";let e="";return"plain_-"===r&&(e="NOT"),{query:`${e} to_tsvector(${this.table}::text) @@ to_tsquery(?) ${i} `,bindings:[s]}}let l="?",n=[s];return"BETWEEN"!==r&&"NOT BETWEEN"!==r||(n=s.replace(/\[|\]/gm,""),n=n.split(" TO "),l="? AND ?"),"IN"!==r&&"NOT IN"!==r||(n=[s.split(",")]),{query:`${t} ${r} ${l} ${i} `,bindings:n}}}class a extends n{toKnex(e,t){const r=this.parse(t);return e.whereRaw(r.query,r.bindings)}}export{l as FQLParser,a as KnexParser,n as SQLParser};
//# sourceMappingURL=parser.modern.js.map

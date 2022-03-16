import e from"xregexp";import t from"lodash";function r(){r=function(e,t){return new s(e,void 0,t)};var e=RegExp.prototype,t=new WeakMap;function s(e,r,n){var i=new RegExp(e,r);return t.set(i,n||t.get(e)),o(i,s.prototype)}function i(e,r){var n=t.get(r);return Object.keys(n).reduce(function(t,r){return t[r]=e[n[r]],t},Object.create(null))}return n(s,RegExp),s.prototype.exec=function(t){var r=e.exec.call(this,t);return r&&(r.groups=i(r,this)),r},s.prototype[Symbol.replace]=function(r,n){if("string"==typeof n){var o=t.get(this);return e[Symbol.replace].call(this,r,n.replace(/\$<([^>]+)>/g,function(e,t){return"$"+o[t]}))}if("function"==typeof n){var s=this;return e[Symbol.replace].call(this,r,function(){var e=arguments;return"object"!=typeof e[e.length-1]&&(e=[].slice.call(e)).push(i(e,s)),n.apply(this,e)})}return e[Symbol.replace].call(this,r,n)},r.apply(this,arguments)}function n(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),Object.defineProperty(e,"prototype",{writable:!1}),t&&o(e,t)}function o(e,t){return o=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e},o(e,t)}class s{constructor(n){this.parse=e=>{let r=[],n=e;const o=this.splitPatentheses(e);if(!t.isEmpty(o))for(const e in o)n=n.replace(`${o[e]}`,`#${e}`),r.push(this.parse(o[e]));return console.log(n),this.parseQS(n,r)},this.splitPatentheses=t=>e.matchRecursive(t,"\\(","\\)","g"),this.parseQS=(e,t)=>{const n=/*#__PURE__*/r(/(([^\s|^:|^!:|^>:|^<:]+)(:|!:|>:|<:)([^\s|"|\[]+|".*?"|\[.*?\]))? ?(OR|AND)? ?([\+|\-|\(#][^\s]+|)? ?/gm,{key:2,operator:3,value:4,logic:5,plain:6});let o,s=[];for(;null!==(o=n.exec(e));){if(o.index===n.lastIndex&&n.lastIndex++,null===o)continue;let{key:e,value:r,operator:i,plain:l,logic:a}=o.groups;i||(i=":");let c="LIKE";switch(i){case":":default:c="LIKE";break;case"!:":c="NOT LIKE";break;case">:":c=">";break;case"<:":c="<"}if(r&&r.match(/\[.*?\]/)&&(c="NOT LIKE"===c?"NOT BETWEEN":"BETWEEN"),r&&-1!==r.indexOf(",")&&(c="NOT LIKE"===c?"NOT IN":"IN"),e&&s.push({key:this.checkAliases(e),operator:c,value:r,logic:a||"AND"}),l&&-1!==l.indexOf("#")){const e=l.replace(/#|\(|\)/g,"");s.push(t[parseInt(e)])}else if(this.allowGlobalSearch&&l&&-1===l.indexOf("#")){let e="plain_+";l.startsWith("-")&&(e="plain_-"),s.push({operator:e,value:l.replace(/\+|\-/gm,""),logic:a||"AND"})}}return s},this.aliases=n&&n.aliases||{},this.allowGlobalSearch=n&&n.allowGlobalSearch||!1}checkAliases(e){return this.aliases&&this.aliases[e]||e}}class i{parse(e){let t="",r=[];for(let n of e)if(Array.isArray(n)){const{query:e,bindings:o}=this.parse(n);t+=`(${e})`,r=[...r,...o]}else if("object"==typeof n){const{query:e,bindings:o}=this.convertCondition(n);t+=e,r=[...r,...o]}else console.warn("Unknown type detected in qry");return t=t.replace(/( AND | OR )$/gm,""),{query:t,bindings:r}}convertCondition(e){if(!e.key)return console.warn("PlainSQL doest not support global searching"),"";let{key:t,operator:r,value:n,logic:o}=e,s="?",i=[n.replaceAll('"',"")];return"BETWEEN"!==r&&"NOT BETWEEN"!==r||(i=n.replace(/\[|\]/gm,""),i=i.split(" TO "),s="? AND ?"),"IN"!==r&&"NOT IN"!==r||(i=[n.split(",")]),{query:`${t} ${r} ${s} ${o} `,bindings:i}}}class l extends i{toKnex(e,t){const r=this.parse(t);return e.whereRaw(r.query,r.bindings)}}export{s as FQLParser,l as KnexParser,i as SQLParser};
//# sourceMappingURL=parser.modern.js.map

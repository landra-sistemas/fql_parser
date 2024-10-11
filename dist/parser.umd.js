!function(e,r){"object"==typeof exports&&"undefined"!=typeof module?r(exports,require("xregexp"),require("lodash")):"function"==typeof define&&define.amd?define(["exports","xregexp","lodash"],r):r((e||self).fqlParser={},e.xregexp,e.lodash)}(this,function(e,r,t){function n(e){return e&&"object"==typeof e&&"default"in e?e:{default:e}}var a=/*#__PURE__*/n(r),o=/*#__PURE__*/n(t);function i(){i=function(e,r){return new t(e,void 0,r)};var e=RegExp.prototype,r=new WeakMap;function t(e,n,a){var o=new RegExp(e,n);return r.set(o,a||r.get(e)),s(o,t.prototype)}function n(e,t){var n=r.get(t);return Object.keys(n).reduce(function(r,t){return r[t]=e[n[t]],r},Object.create(null))}return l(t,RegExp),t.prototype.exec=function(r){var t=e.exec.call(this,r);return t&&(t.groups=n(t,this)),t},t.prototype[Symbol.replace]=function(t,a){if("string"==typeof a){var o=r.get(this);return e[Symbol.replace].call(this,t,a.replace(/\$<([^>]+)>/g,function(e,r){return"$"+o[r]}))}if("function"==typeof a){var i=this;return e[Symbol.replace].call(this,t,function(){var e=arguments;return"object"!=typeof e[e.length-1]&&(e=[].slice.call(e)).push(n(e,i)),a.apply(this,e)})}return e[Symbol.replace].call(this,t,a)},i.apply(this,arguments)}function l(e,r){if("function"!=typeof r&&null!==r)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(r&&r.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),Object.defineProperty(e,"prototype",{writable:!1}),r&&s(e,r)}function s(e,r){return s=Object.setPrototypeOf||function(e,r){return e.__proto__=r,e},s(e,r)}function u(e,r){(null==r||r>e.length)&&(r=e.length);for(var t=0,n=new Array(r);t<r;t++)n[t]=e[t];return n}var c=/*#__PURE__*/function(){function e(e){var r=this;this.LIKE="LIKE",this.parse=function(e){var t=[],n=e,a=r.splitPatentheses(e);if(!o.default.isEmpty(a))for(var i in a)n=n.replace(""+a[i],"#"+i),t.push(r.parse(a[i]));return r.parseQS(n,t)},this.splitPatentheses=function(e){return a.default.matchRecursive(e,"\\(","\\)","g")},this.parseQS=function(e,t){for(var n,a=/*#__PURE__*/i(/(([^\s|^:|^!:|^>:|^<:]+)(:|!:|>:|<:)([^\s|"|\[]+|".*?"|\[.*?\]))? ?(OR|AND)? ?([\+|\-|\(#][^\s]+|)? ?/gm,{key:2,operator:3,value:4,logic:5,plain:6}),o=[];null!==(n=a.exec(e));)if(n.index===a.lastIndex&&a.lastIndex++,null!==n){var l=n.groups,s=l.key,u=l.value,c=l.operator,p=l.plain,f=l.logic;c||(c=":");var y=r.LIKE;switch(c){case":":default:y=r.LIKE;break;case"!:":y="NOT "+r.LIKE;break;case">:":y=">";break;case"<:":y="<"}if(u&&u.match(/\[.*?\]/)&&(y=y==="NOT "+r.LIKE?"NOT BETWEEN":"BETWEEN"),u&&-1!==u.indexOf(",")&&(y=y==="NOT "+r.LIKE?"NOT IN":"IN"),s&&o.push({key:r.checkAliases(s),operator:y,value:r.parseValue(u),logic:f||"AND"}),p&&-1!==p.indexOf("#")){var h=p.replace(/#|\(|\)/g,"");o.push(t[parseInt(h)])}else if(r.allowGlobalSearch&&p&&-1===p.indexOf("#")){var d="plain_+";p.startsWith("-")&&(d="plain_-"),o.push({operator:d,value:r.parseValueForPlainQuery(p.replace(/\+|\-/gm,"")),logic:f||"AND"})}}return o},this.aliases=e&&e.aliases||{},this.allowGlobalSearch=e&&e.allowGlobalSearch||!1,e&&e.caseInsensitive&&(this.LIKE="ILIKE")}var r=e.prototype;return r.checkAliases=function(e){return this.aliases?this.aliases[e]?this.aliases[e].replaceAll("{{key}}",e):this.aliases["*"]?this.aliases["*"].replaceAll("{{key}}",e):e:e},r.parseValue=function(e){return e.replaceAll(/"|\?/g,"").replaceAll("*","%")},r.parseValueForPlainQuery=function(e){var r=e.includes("*")?":*":"";return e.replaceAll(/"|\?/g,"").replaceAll("*",r)},e}(),p=/*#__PURE__*/function(){function e(e,r){void 0===r&&(r="pg"),this.table=e,this.dialect=r}var r=e.prototype;return r.parse=function(e){for(var r,t="",n=[],a=function(e,r){var t="undefined"!=typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(t)return(t=t.call(e)).next.bind(t);if(Array.isArray(e)||(t=function(e,r){if(e){if("string"==typeof e)return u(e,r);var t=Object.prototype.toString.call(e).slice(8,-1);return"Object"===t&&e.constructor&&(t=e.constructor.name),"Map"===t||"Set"===t?Array.from(e):"Arguments"===t||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t)?u(e,r):void 0}}(e))){t&&(e=t);var n=0;return function(){return n>=e.length?{done:!0}:{done:!1,value:e[n++]}}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}(e);!(r=a()).done;){var o=r.value;if(Array.isArray(o)){var i=this.parse(o);t+="("+i.query+")",n=[].concat(n,i.bindings)}else if("object"==typeof o){var l=this.convertCondition(o);t+=l.query,n=[].concat(n,l.bindings)}else console.warn("Unknown type detected in qry")}return{query:t=t.replace(/( AND | OR )$/gm,""),bindings:n}},r.convertCondition=function(e){var r=e.key,t=e.operator,n=e.value,a=e.logic;if(!r){if("pg"!==this.dialect)return console.warn("Only PostgreSQL supports global searching"),"";var o="";return"plain_-"===t&&(o="NOT"),{query:o+" to_tsvector("+this.table+"::text) @@ to_tsquery(?) "+a+" ",bindings:[n]}}var i="?",l=[n];return"BETWEEN"!==t&&"NOT BETWEEN"!==t||(l=(l=n.replace(/\[|\]/gm,"")).split(" TO "),i="? AND ?"),"IN"!==t&&"NOT IN"!==t||(l=[n.split(",")]),{query:r+" "+t+" "+i+" "+a+" ",bindings:l}},e}(),f=/*#__PURE__*/function(e){var r,t;function n(){return e.apply(this,arguments)||this}return t=e,(r=n).prototype=Object.create(t.prototype),r.prototype.constructor=r,s(r,t),n.prototype.toKnex=function(e,r){var t=this.parse(r);return e.whereRaw(t.query,t.bindings)},n}(p);e.FQLParser=c,e.KnexParser=f,e.SQLParser=p});
//# sourceMappingURL=parser.umd.js.map

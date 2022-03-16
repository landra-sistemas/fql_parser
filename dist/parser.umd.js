!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports,require("xregexp"),require("lodash")):"function"==typeof define&&define.amd?define(["exports","xregexp","lodash"],t):t((e||self).fqlParser={},e.xregexp,e.lodash)}(this,function(e,t,r){function n(e){return e&&"object"==typeof e&&"default"in e?e:{default:e}}var o=/*#__PURE__*/n(t),a=/*#__PURE__*/n(r);function i(){i=function(e,t){return new r(e,void 0,t)};var e=RegExp.prototype,t=new WeakMap;function r(e,n,o){var a=new RegExp(e,n);return t.set(a,o||t.get(e)),s(a,r.prototype)}function n(e,r){var n=t.get(r);return Object.keys(n).reduce(function(t,r){return t[r]=e[n[r]],t},Object.create(null))}return l(r,RegExp),r.prototype.exec=function(t){var r=e.exec.call(this,t);return r&&(r.groups=n(r,this)),r},r.prototype[Symbol.replace]=function(r,o){if("string"==typeof o){var a=t.get(this);return e[Symbol.replace].call(this,r,o.replace(/\$<([^>]+)>/g,function(e,t){return"$"+a[t]}))}if("function"==typeof o){var i=this;return e[Symbol.replace].call(this,r,function(){var e=arguments;return"object"!=typeof e[e.length-1]&&(e=[].slice.call(e)).push(n(e,i)),o.apply(this,e)})}return e[Symbol.replace].call(this,r,o)},i.apply(this,arguments)}function l(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),Object.defineProperty(e,"prototype",{writable:!1}),t&&s(e,t)}function s(e,t){return s=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e},s(e,t)}function c(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=new Array(t);r<t;r++)n[r]=e[r];return n}var u=/*#__PURE__*/function(){function e(e){var t=this;this.parse=function(e){var r=[],n=e,o=t.splitPatentheses(e);if(!a.default.isEmpty(o))for(var i in o)n=n.replace(""+o[i],"#"+i),r.push(t.parse(o[i]));return console.log(n),t.parseQS(n,r)},this.splitPatentheses=function(e){return o.default.matchRecursive(e,"\\(","\\)","g")},this.parseQS=function(e,r){for(var n,o=/*#__PURE__*/i(/(([^\s|^:|^!:|^>:|^<:]+)(:|!:|>:|<:)([^\s|"|\[]+|".*?"|\[.*?\]))? ?(OR|AND)? ?([\+|\-|\(#][^\s]+|)? ?/gm,{key:2,operator:3,value:4,logic:5,plain:6}),a=[];null!==(n=o.exec(e));)if(n.index===o.lastIndex&&o.lastIndex++,null!==n){var l=n.groups,s=l.key,c=l.value,u=l.operator,p=l.plain,f=l.logic;u||(u=":");var y="LIKE";switch(u){case":":default:y="LIKE";break;case"!:":y="NOT LIKE";break;case">:":y=">";break;case"<:":y="<"}if(c&&c.match(/\[.*?\]/)&&(y="NOT LIKE"===y?"NOT BETWEEN":"BETWEEN"),c&&-1!==c.indexOf(",")&&(y="NOT LIKE"===y?"NOT IN":"IN"),s&&a.push({key:t.checkAliases(s),operator:y,value:c,logic:f||"AND"}),p&&-1!==p.indexOf("#")){var h=p.replace(/#|\(|\)/g,"");a.push(r[parseInt(h)])}else if(t.allowGlobalSearch&&p&&-1===p.indexOf("#")){var d="plain_+";p.startsWith("-")&&(d="plain_-"),a.push({operator:d,value:p.replace(/\+|\-/gm,""),logic:f||"AND"})}}return a},this.aliases=e&&e.aliases||{},this.allowGlobalSearch=e&&e.allowGlobalSearch||!1}return e.prototype.checkAliases=function(e){return this.aliases?this.aliases[e]?this.aliases[e]:this.aliases["*"]?this.aliases["*"].replaceAll("{{key}}",e):e:e},e}(),p=/*#__PURE__*/function(){function e(e,t){void 0===t&&(t="pg"),this.table=e,this.dialect=t}var t=e.prototype;return t.parse=function(e){for(var t,r="",n=[],o=function(e,t){var r="undefined"!=typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(r)return(r=r.call(e)).next.bind(r);if(Array.isArray(e)||(r=function(e,t){if(e){if("string"==typeof e)return c(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);return"Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r?Array.from(e):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?c(e,t):void 0}}(e))){r&&(e=r);var n=0;return function(){return n>=e.length?{done:!0}:{done:!1,value:e[n++]}}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}(e);!(t=o()).done;){var a=t.value;if(Array.isArray(a)){var i=this.parse(a);r+="("+i.query+")",n=[].concat(n,i.bindings)}else if("object"==typeof a){var l=this.convertCondition(a);r+=l.query,n=[].concat(n,l.bindings)}else console.warn("Unknown type detected in qry")}return{query:r=r.replace(/( AND | OR )$/gm,""),bindings:n}},t.convertCondition=function(e){if(!e.key){if("pg"!==this.dialect)return console.warn("Only PostgreSQL supports global searching"),"";var t="";return"plain_-"===e.operator&&(t="NOT"),{query:t+" to_tsvector(?::text) @@ to_tsquery(?) "+a,bindings:[this.table,o]}}var r=e.key,n=e.operator,o=e.value,a=e.logic,i="?",l=[o.replaceAll('"',"")];return"BETWEEN"!==n&&"NOT BETWEEN"!==n||(l=(l=o.replace(/\[|\]/gm,"")).split(" TO "),i="? AND ?"),"IN"!==n&&"NOT IN"!==n||(l=[o.split(",")]),{query:r+" "+n+" "+i+" "+a+" ",bindings:l}},e}(),f=/*#__PURE__*/function(e){var t,r;function n(){return e.apply(this,arguments)||this}return r=e,(t=n).prototype=Object.create(r.prototype),t.prototype.constructor=t,s(t,r),n.prototype.toKnex=function(e,t){var r=this.parse(t);return e.whereRaw(r.query,r.bindings)},n}(p);e.FQLParser=u,e.KnexParser=f,e.SQLParser=p});
//# sourceMappingURL=parser.umd.js.map

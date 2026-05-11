import{d as S,b as x,U as C,V as w,X as E,u as v,j as o,r as c}from"./WHLogo.js";const g=S("bootstrap-locale");function h(e){return E.includes(e)?e:"en"}async function b(e){await C(e),w.getState().setLocale(e)}async function P(e){const t=h(e);try{await b(t)}catch(s){g.error(`failed to load locale "${t}"`,s)}let a=e;return x.subscribe(s=>{const l=s.settings.locale;if(l===a)return;a=l;const i=h(l);b(i).catch(r=>{g.error("locale subscription update failed",r)})})}const f=`/* Web Harvestor — Custom CSS
 * Theme tiles set the base. Rules here win on top.
 *
 * Blueprint below: "Purple Midnight" — a dark theme with a violet
 * accent and warmer surfaces. Uncomment the block to apply it,
 * or tweak any value to make it your own.
 */

:root {
  --wh-accent:    #a78bfa;
  --wh-accent-fg: #1a1130;

  --wh-bg:        #14111c;
  --wh-panel:     #1d1828;
  --wh-border:    #2c2540;

  --wh-text:      #f4f1ff;
  --wh-muted:     #b6a7d4;
  --wh-subtle:    #7d6f9a;

  --wh-font-sans: "Iowan Old Style", Georgia, serif;
}
`,T="#10b981",k="#ef4444",D="#8b949e",R="custom.css";function L(e){return e==="saved"?T:e==="invalid"?k:D}function M(){const e=document.getElementById("wh-custom-css");if(e instanceof HTMLStyleElement)return e;const t=document.createElement("style");return t.id="wh-custom-css",document.head.appendChild(t),t}function y(e){var s;const t=M();if(t.textContent=e,e.trim()==="")return"saved";const a=((s=t.sheet)==null?void 0:s.cssRules.length)??0,n=(e.match(/{/g)??[]).length;return n===0||a>=n?"saved":"invalid"}function j({state:e}){const t=e==="saving"?"saving…":e,a=L(e);return o.jsxs("span",{"aria-live":"polite",style:{display:"flex",alignItems:"center",gap:4,fontSize:10,color:a},children:[o.jsx("span",{style:{width:5,height:5,borderRadius:"50%",background:a,flexShrink:0}}),t]})}function _({saveState:e}){return o.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[o.jsx("span",{style:{fontFamily:"var(--wh-mono)",fontSize:10.5,color:"#8b949e"},children:R}),o.jsx(j,{state:e})]})}function I({onReset:e,label:t}){return o.jsx("button",{type:"button",onClick:e,"aria-label":t,style:{background:"transparent",border:0,color:"#8b949e",fontSize:10.5,padding:"2px 6px",borderRadius:4,cursor:"pointer"},onMouseEnter:a=>{a.currentTarget.style.color="#c9d1d9"},onMouseLeave:a=>{a.currentTarget.style.color="#8b949e"},children:t})}function O({saveState:e,resetLabel:t,onReset:a}){return o.jsxs("div",{style:{background:"#161b22",borderBottom:"1px solid var(--wh-border)",padding:"6px 10px 6px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"},children:[o.jsx(_,{saveState:e}),o.jsx(I,{onReset:a,label:t})]})}function Y({value:e,onChange:t}){return o.jsx("textarea",{value:e,onChange:t,spellCheck:!1,className:"preview-scroll",style:{display:"block",width:"100%",background:"#0d1117",border:0,outline:"none",resize:"vertical",padding:14,minHeight:480,color:"#c9d1d9",caretColor:"var(--wh-accent)",fontFamily:"var(--wh-mono)",fontSize:11.5,lineHeight:1.6,boxSizing:"border-box"}})}function A(e,t,a){const[n,s]=c.useState(e===""?f:e),[l,i]=c.useState("saved"),r=c.useRef(null),d=c.useCallback(u=>{const p=t==="custom"?y(u):"saved";a(u),i(p)},[t,a]),m=c.useCallback(u=>{i("saving"),r.current!==null&&clearTimeout(r.current),r.current=setTimeout(()=>d(u),600)},[d]);return c.useEffect(()=>{e!==""&&t==="custom"&&y(e)},[]),c.useEffect(()=>()=>{r.current!==null&&clearTimeout(r.current)},[]),{localValue:n,saveState:l,handleChange:u=>{const p=u.target.value;s(p),m(p)},handleReset:()=>{s(f),m(f)}}}function N({saveState:e,resetLabel:t,localValue:a,onReset:n,onChange:s}){return o.jsxs("div",{style:{background:"#0d1117",border:"1px solid var(--wh-border)",borderRadius:6,overflow:"hidden"},children:[o.jsx(O,{saveState:e,resetLabel:t,onReset:n}),o.jsx(Y,{value:a,onChange:s})]})}function W({value:e,theme:t,onChange:a}){const n=v(),{localValue:s,saveState:l,handleChange:i,handleReset:r}=A(e,t,a),d=n({id:"settings.appearance.customCss.reset",defaultMessage:"Reset to default"}),m=n({id:"settings.appearance.customCss",defaultMessage:"Custom CSS"});return o.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:6},children:[o.jsx("span",{style:{fontSize:11,fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase",color:"var(--wh-muted)"},children:m}),o.jsx(N,{saveState:l,resetLabel:d,localValue:s,onReset:r,onChange:i})]})}const z=`# {{page.title}}

> Clipped {{ now | date:"MMMM D, YYYY" }} from [{{page.domain}}]({{page.url}})

{{ content | markdown }}`,F="{{date}}-{{title|safe_name}}",V=[{id:"sys-default-article",name:"Default Article",isSystem:!0,noteNameTemplate:F,frontmatterTemplate:`title: {{page.title}}
url: {{page.url}}
author: {{meta.author ?? "unknown"}}
published: {{page.published_date | date:"YYYY-MM-DD"}}
tags: {{page.tags}}
readtime: {{page.reading_time}}`,bodyTemplate:z},{id:"sys-quick-capture",name:"Quick Capture",isSystem:!0,noteNameTemplate:"{{date}}-{{title|safe_name}}",frontmatterTemplate:`title: {{page.title}}
url: {{page.url}}
date: {{now | date:"YYYY-MM-DD"}}`,bodyTemplate:"{{content | markdown}}"},{id:"sys-reference-citation",name:"Reference / Citation",isSystem:!0,noteNameTemplate:"{{date}}-ref-{{title|safe_name}}",frontmatterTemplate:`title: {{page.title}}
url: {{page.url}}
author: {{meta.author}}
published: {{page.published_date}}
tags: [reference]`,bodyTemplate:`# {{page.title}}

**Source:** {{page.url}}
**Author:** {{meta.author}}

## Summary

{{content | markdown}}`}];function q(e){const t=[...V].sort((n,s)=>n.name.localeCompare(s.name)),a=[...e].sort((n,s)=>n.name.localeCompare(s.name)).map(n=>({...n,isSystem:!1}));return[...t,...a]}function G(e){const t=e==="custom"?"dark":e,a=document.documentElement.classList;if(t==="system"){const n=window.matchMedia("(prefers-color-scheme: dark)").matches;a.toggle("dark",n),a.toggle("light",!n)}else a.toggle("dark",t==="dark"),a.toggle("light",t==="light")}export{W as C,f as D,G as a,P as b,q as m};

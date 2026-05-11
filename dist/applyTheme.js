import{j as s,r as l,u as h}from"./WHLogo.js";const f=`/* Web Harvestor — Custom CSS
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
`,b="#10b981",C="#ef4444",x="#8b949e",y="custom.css";function S(e){return e==="saved"?b:e==="invalid"?C:x}function w(){const e=document.getElementById("wh-custom-css");if(e instanceof HTMLStyleElement)return e;const t=document.createElement("style");return t.id="wh-custom-css",document.head.appendChild(t),t}function g(e){var r;const t=w();if(t.textContent=e,e.trim()==="")return"saved";const n=((r=t.sheet)==null?void 0:r.cssRules.length)??0,a=(e.match(/{/g)??[]).length;return a===0||n>=a?"saved":"invalid"}function E({state:e}){const t=e==="saving"?"saving…":e,n=S(e);return s.jsxs("span",{"aria-live":"polite",style:{display:"flex",alignItems:"center",gap:4,fontSize:10,color:n},children:[s.jsx("span",{style:{width:5,height:5,borderRadius:"50%",background:n,flexShrink:0}}),t]})}function v({saveState:e}){return s.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[s.jsx("span",{style:{fontFamily:"var(--wh-mono)",fontSize:10.5,color:"#8b949e"},children:y}),s.jsx(E,{state:e})]})}function T({onReset:e,label:t}){return s.jsx("button",{type:"button",onClick:e,"aria-label":t,style:{background:"transparent",border:0,color:"#8b949e",fontSize:10.5,padding:"2px 6px",borderRadius:4,cursor:"pointer"},onMouseEnter:n=>{n.currentTarget.style.color="#c9d1d9"},onMouseLeave:n=>{n.currentTarget.style.color="#8b949e"},children:t})}function k({saveState:e,resetLabel:t,onReset:n}){return s.jsxs("div",{style:{background:"#161b22",borderBottom:"1px solid var(--wh-border)",padding:"6px 10px 6px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"},children:[s.jsx(v,{saveState:e}),s.jsx(T,{onReset:n,label:t})]})}function D({value:e,onChange:t}){return s.jsx("textarea",{value:e,onChange:t,spellCheck:!1,className:"preview-scroll",style:{display:"block",width:"100%",background:"#0d1117",border:0,outline:"none",resize:"vertical",padding:14,minHeight:480,color:"#c9d1d9",caretColor:"var(--wh-accent)",fontFamily:"var(--wh-mono)",fontSize:11.5,lineHeight:1.6,boxSizing:"border-box"}})}function M(e,t,n){const[a,r]=l.useState(e===""?f:e),[p,c]=l.useState("saved"),o=l.useRef(null),d=l.useCallback(i=>{const m=t==="custom"?g(i):"saved";n(i),c(m)},[t,n]),u=l.useCallback(i=>{c("saving"),o.current!==null&&clearTimeout(o.current),o.current=setTimeout(()=>d(i),600)},[d]);return l.useEffect(()=>{e!==""&&t==="custom"&&g(e)},[]),l.useEffect(()=>()=>{o.current!==null&&clearTimeout(o.current)},[]),{localValue:a,saveState:p,handleChange:i=>{const m=i.target.value;r(m),u(m)},handleReset:()=>{r(f),u(f)}}}function R({saveState:e,resetLabel:t,localValue:n,onReset:a,onChange:r}){return s.jsxs("div",{style:{background:"#0d1117",border:"1px solid var(--wh-border)",borderRadius:6,overflow:"hidden"},children:[s.jsx(k,{saveState:e,resetLabel:t,onReset:a}),s.jsx(D,{value:n,onChange:r})]})}function A({value:e,theme:t,onChange:n}){const a=h(),{localValue:r,saveState:p,handleChange:c,handleReset:o}=M(e,t,n),d=a({id:"settings.appearance.customCss.reset",defaultMessage:"Reset to default"}),u=a({id:"settings.appearance.customCss",defaultMessage:"Custom CSS"});return s.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:6},children:[s.jsx("span",{style:{fontSize:11,fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase",color:"var(--wh-muted)"},children:u}),s.jsx(R,{saveState:p,resetLabel:d,localValue:r,onReset:o,onChange:c})]})}const j=`# {{page.title}}

> Clipped {{ now | date:"MMMM D, YYYY" }} from [{{page.domain}}]({{page.url}})

{{ content | markdown }}`,_="{{date}}-{{title|safe_name}}",I=[{id:"sys-default-article",name:"Default Article",isSystem:!0,noteNameTemplate:_,frontmatterTemplate:`title: {{page.title}}
url: {{page.url}}
author: {{meta.author ?? "unknown"}}
published: {{page.published_date | date:"YYYY-MM-DD"}}
tags: {{page.tags}}
readtime: {{page.reading_time}}`,bodyTemplate:j},{id:"sys-quick-capture",name:"Quick Capture",isSystem:!0,noteNameTemplate:"{{date}}-{{title|safe_name}}",frontmatterTemplate:`title: {{page.title}}
url: {{page.url}}
date: {{now | date:"YYYY-MM-DD"}}`,bodyTemplate:"{{content | markdown}}"},{id:"sys-reference-citation",name:"Reference / Citation",isSystem:!0,noteNameTemplate:"{{date}}-ref-{{title|safe_name}}",frontmatterTemplate:`title: {{page.title}}
url: {{page.url}}
author: {{meta.author}}
published: {{page.published_date}}
tags: [reference]`,bodyTemplate:`# {{page.title}}

**Source:** {{page.url}}
**Author:** {{meta.author}}

## Summary

{{content | markdown}}`}];function N(e){const t=[...I].sort((a,r)=>a.name.localeCompare(r.name)),n=[...e].sort((a,r)=>a.name.localeCompare(r.name)).map(a=>({...a,isSystem:!1}));return[...t,...n]}function z(e){const t=e==="custom"?"dark":e,n=document.documentElement.classList;if(t==="system"){const a=window.matchMedia("(prefers-color-scheme: dark)").matches;n.toggle("dark",a),n.toggle("light",!a)}else n.toggle("dark",t==="dark"),n.toggle("light",t==="light")}export{A as C,f as D,z as a,N as m};

const o=`# {{page.title}}

> Clipped {{ now | date:"MMMM D, YYYY" }} from [{{page.domain}}]({{page.url}})

{{ content | markdown }}`,m="{{date}}-{{title|safe_name}}",l=[{id:"sys-default-article",name:"Default Article",isSystem:!0,noteNameTemplate:m,frontmatterTemplate:`title: {{page.title}}
url: {{page.url}}
author: {{meta.author ?? "unknown"}}
published: {{page.published_date | date:"YYYY-MM-DD"}}
tags: {{page.tags}}
readtime: {{page.reading_time}}`,bodyTemplate:o},{id:"sys-quick-capture",name:"Quick Capture",isSystem:!0,noteNameTemplate:"{{date}}-{{title|safe_name}}",frontmatterTemplate:`title: {{page.title}}
url: {{page.url}}
date: {{now | date:"YYYY-MM-DD"}}`,bodyTemplate:"{{content | markdown}}"},{id:"sys-reference-citation",name:"Reference / Citation",isSystem:!0,noteNameTemplate:"{{date}}-ref-{{title|safe_name}}",frontmatterTemplate:`title: {{page.title}}
url: {{page.url}}
author: {{meta.author}}
published: {{page.published_date}}
tags: [reference]`,bodyTemplate:`# {{page.title}}

**Source:** {{page.url}}
**Author:** {{meta.author}}

## Summary

{{content | markdown}}`}];function s(n){const a=[...l].sort((e,r)=>e.name.localeCompare(r.name)),t=[...n].sort((e,r)=>e.name.localeCompare(r.name)).map(e=>({...e,isSystem:!1}));return[...a,...t]}function i(n){const a=n==="custom"?"dark":n,t=document.documentElement.classList;if(a==="system"){const e=window.matchMedia("(prefers-color-scheme: dark)").matches;t.toggle("dark",e),t.toggle("light",!e)}else t.toggle("dark",a==="dark"),t.toggle("light",a==="light")}export{i as a,s as m};

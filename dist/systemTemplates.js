const m=`# {{page.title}}

> Clipped {{ now | date:"MMMM D, YYYY" }} from [{{page.domain}}]({{page.url}})

{{ content | markdown }}`,o="{{date}}-{{title|safe_name}}",l=[{id:"sys-default-article",name:"Default Article",isSystem:!0,noteNameTemplate:o,frontmatterTemplate:`title: {{page.title}}
url: {{page.url}}
author: {{meta.author ?? "unknown"}}
published: {{page.published_date | date:"YYYY-MM-DD"}}
tags: {{page.tags}}
readtime: {{page.reading_time}}`,bodyTemplate:m},{id:"sys-quick-capture",name:"Quick Capture",isSystem:!0,noteNameTemplate:"{{date}}-{{title|safe_name}}",frontmatterTemplate:`title: {{page.title}}
url: {{page.url}}
date: {{now | date:"YYYY-MM-DD"}}`,bodyTemplate:"{{content | markdown}}"},{id:"sys-reference-citation",name:"Reference / Citation",isSystem:!0,noteNameTemplate:"{{date}}-ref-{{title|safe_name}}",frontmatterTemplate:`title: {{page.title}}
url: {{page.url}}
author: {{meta.author}}
published: {{page.published_date}}
tags: [reference]`,bodyTemplate:`# {{page.title}}

**Source:** {{page.url}}
**Author:** {{meta.author}}

## Summary

{{content | markdown}}`}];function p(a){const n=[...l].sort((e,t)=>e.name.localeCompare(t.name)),r=[...a].sort((e,t)=>e.name.localeCompare(t.name)).map(e=>({...e,isSystem:!1}));return[...n,...r]}export{p as m};

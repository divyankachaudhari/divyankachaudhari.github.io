---
layout: page
title: Writing
permalink: /writing/
description: "Posts by Divyanka Chaudhari: reverse engineering, CTFs, JEE, inter-IIT sports and Outreachy."
---

{% include writing.html %}
<p class="dim mono">$ ls -t ~/writing</p>
<ul class="post-list">
  {%- for w in writing -%}
  {%- assign p = w | split: "|" %}
  <li><time class="dim" datetime="{{ p[0] }}">{{ p[0] }}</time> <a href="{{ p[1] }}">{{ p[2] }}</a></li>
  {%- endfor %}
</ul>

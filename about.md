---
layout: page
title: Divyanka Chaudhari
permalink: /about/
redirect_from:
  - /contact/
  - /writing/
description: "Divyanka Chaudhari is a quant at a hedge fund in London, previously Computer Science at IIT Delhi. Writing on reverse engineering, CTFs and more; likes the internet, biking, bouldering, skating and pottery."
---

{% include writing.html %}

<img class="profile-photo" width="200" height="200" src="/divyanka.png" alt="Photo of Divyanka Chaudhari">

Hi, I'm Divyanka. I'm a quant at a hedge fund in London, where I've lived for the past two years. Before that, I studied Computer Science and Engineering at IIT Delhi.

I like the internet. I learned most of what I know from it, and I'd like to make it a little better than I found it.

Outside work, my year runs on two settings: I hibernate through the London winter and come out properly in summer. When I'm out, I'm usually biking, bouldering or skating (I competed in skating at the national level, and represented IIT Delhi in athletics at inter-IIT). I've also just started pottery, so expect lopsided bowls. I take photos too, which end up on [Instagram]({{ site.instagram }}).

<h2 id="writing">writing</h2>

<ul class="post-list">
  {%- for w in writing -%}
  {%- assign p = w | split: "|" %}
  <li><time class="dim" datetime="{{ p[0] }}">{{ p[0] }}</time> <a href="{{ p[1] }}">{{ p[2] }}</a></li>
  {%- endfor %}
</ul>

<h2 id="contact">say hi</h2>

The easiest way is [this contact form](https://docs.google.com/forms/d/e/1FAIpQLSf2Hi9ZoWQsvLQl9M1gYx_JcbGzy_PJuzzuA7Fz6PPmhK4qQw/viewform){:target="_blank" rel="noopener"}. I read everything, eventually (faster in summer). You can also find me here:

<ul class="links-list">
  <li><span class="dim">github</span> <a href="{{ site.github.repo }}">divyankachaudhari</a></li>
  <li><span class="dim">linkedin</span> <a href="{{ site.linkedin }}">divyanka-chaudhari</a></li>
  <li><span class="dim">x</span> <a href="{{ site.x }}">@chiaseedswhat</a></li>
  <li><span class="dim">instagram</span> <a href="{{ site.instagram }}">@divycx.jpeg</a> <span class="dim">(photos)</span></li>
</ul>

<h2 id="cool">random cool things</h2>

- [xkcd](https://xkcd.com/), a webcomic of romance, sarcasm, math, and language.
- [The evolution of trust](https://ncase.me/trust/), a game about game theory.
- [This weird ciphered subreddit](https://www.reddit.com/r/f04cb41f154db2f05a4a/).
- ASAP Science's [periodic table song](https://youtu.be/rz4Dd1I_fX0), which I know by heart.
- Me, I'm cool.

<p class="dim mono small">psst: the <a href="{{ '/' | relative_url }}">terminal version</a> of this page has more secrets. try <code>snake</code>.</p>

As usual, the first facebook is down intimation comes when you’re chatting on some whatsapp group and suddenly you can’t send messages anymore. You wonder, is it my internet? Then after realisation that servers are down, you wait for few minutes to pass. Quickly switching to signal/telegram just when whatsapp is down is well, ah. 

15 minutes, 30 minutes, 1 hour, 4 hours?! It's 1:30 AM IST on 5 October right now. People are going crazy on twitter. I made my twitter account for the first time and hey look what I tweeted. 

<blockquote class="twitter-tweet" data-lang="en" data-theme="dark"><p lang="en" dir="ltr">just setting up my twttr</p>&mdash; Divyanka Chaudhari (@divyankacx) <a href="https://twitter.com/divyankacx/status/1445111473781370884?ref_src=twsrc%5Etfw">October 4, 2021</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>


So what exactly has happened? So many discussions around. This is actually an interesting topic (Update: [Cloudfare wrote an article  about this](https://blog.cloudflare.com/during-the-facebook-outage/), highly recommended). 

It seems that facebook’s DNS names have stopped resolving. So, all the routes have disappeared and DNS are all offline. Facebook IP addresses still appear to be routed. But, that’s no use. Websites relying on facbeook have lost their way as well. So, what happens when you can’t connect to your nameserver? Apps fail to repond, and backend users can't keep calm. They continously send requests, more than they would usually. ~~Even I did that.~~ This in turn increases load on DNS resolvers. I think that’s another problem. It’s funny, one small problem possibly caused this which had a domino effect causing this outage. Then over that, users create problems. Just shows how interconnected we are, in a good way. So many people, so many systems. Of course, the issue is much more complicated, but atleast we can try to understand it on the surface.

With this I remembered that when I was interning at Google, my host had explained how such outage problems cause frenzy in large companies. Facebook engineers, you can do this. The whole internet is feeling the heat of it. 

On another note, I heard that facebook recruiters are still conducting interviews over phone in this outage. Truly, modern problems require modern solutions.
'use strict';

// All content comes from data/content.json. No framework or build step is needed.
const $ = selector => document.querySelector(selector);
const ICONS = {
  left:'<path d="m14 6-6 6 6 6"/>',right:'<path d="m10 6 6 6-6 6"/>',down:'<path d="m6 9 6 6 6-6"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v5M17 3v5M3 11h18M7 15h3M14 15h3"/>',
  map:'<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  award:'<circle cx="12" cy="8" r="5"/><path d="m8 12-2 9 6-3 6 3-2-9M12 5v6M9 8h6"/>',
  idea:'<path d="M8 15C2 10 6 2 12 2s10 8 4 13l-1 3H9l-1-3ZM9 21h6M12 6v4"/>',
  globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6h14M5 18h14"/>',
  book:'<path d="M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Zm0 0v16"/>',
  history:'<path d="M3 10a9 9 0 1 1 1 8M3 4v6h6M12 7v6l4 2"/>',
  paper:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5M8 18h7"/>',
  people:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5"/>',
  drop:'<path d="M12 2S4 10 4 15a8 8 0 1 0 16 0c0-5-8-13-8-13Z"/><path d="M8 15c0 3 2 4 4 4"/>'
};
let data;
const state = { hero:0, news:0, events:0 };
const formatNumber = value => typeof value === 'number' ? new Intl.NumberFormat('fa-IR').format(value) : String(value ?? '—');

function element(tag, attributes={}, children=[]) {
  const node = document.createElement(tag);
  for (const [key,value] of Object.entries(attributes)) {
    if (value == null) continue;
    if (key === 'text') node.textContent = String(value);
    else if (key === 'class') node.className = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2),value);
    else node.setAttribute(key,String(value));
  }
  for (const child of children.flat()) if (child != null) node.append(child);
  return node;
}
function icon(name) {
  const node = document.createElementNS('http://www.w3.org/2000/svg','svg');
  node.setAttribute('viewBox','0 0 24 24');node.setAttribute('class','icon');node.setAttribute('aria-hidden','true');
  node.innerHTML = ICONS[name] || ICONS.paper; // Only the trusted, static icon table enters SVG markup.
  return node;
}
function hydrateIcons(root=document) {
  root.querySelectorAll('[data-icon]').forEach(node => node.replaceChildren(icon(node.dataset.icon)));
}
function safeURL(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value,location.href);
    return ['http:','https:'].includes(url.protocol) || (location.protocol === 'file:' && url.protocol === 'file:') ? url.href : null;
  } catch { return null; }
}
function image(src,alt,{lazy=true,width=600,height=360,className=''}={}) {
  const node = element('img',{src:safeURL(src)||'assets/images/fallback.svg',alt:alt||'',loading:lazy?'lazy':'eager',decoding:'async',width,height,class:className});
  node.addEventListener('error',() => {
    if (node.dataset.fallback) return;
    node.dataset.fallback='true';node.src='assets/images/fallback.svg';
  });
  return node;
}
function action(label,url,className='',onEmpty) {
  const href = safeURL(url);
  const node = element(href?'a':'button',{class:className,...(href?{href}:{type:'button'})});
  if (href) {
    if (new URL(href).origin !== location.origin) { node.target='_blank';node.rel='noopener noreferrer'; }
  } else node.addEventListener('click',onEmpty || (() => openInfo(label,'نشانی این بخش پس از تأیید انجمن اضافه خواهد شد.')));
  if (label) node.append(document.createTextNode(label));
  return node;
}
function syncBodyLock() { document.body.classList.toggle('dialog-open',Boolean(document.querySelector('dialog[open]'))); }
function showDialog(dialog) {
  document.querySelectorAll('dialog[open]').forEach(other=>{if(other!==dialog)other.close();});
  if (!dialog.open) dialog.showModal();syncBodyLock();
}
function dialogContent(title,eyebrow='انجمن آب و فاضلاب ایران') {
  $('#dialog-eyebrow').textContent=eyebrow;
  const heading=element('h2',{id:'dialog-heading',text:title});
  $('#dialog-content').replaceChildren(heading);showDialog($('#content-dialog'));return $('#dialog-content');
}
function openInfo(title,body) {
  dialogContent(title).append(element('p',{class:'dialog-body',text:body}));
}
function demoPage(label) { openInfo(label,'این نمونه برای بررسی طراحی صفحهٔ اصلی آماده شده است. این بخش در نسخهٔ کامل وب‌سایت در دسترس خواهد بود.'); }
function renderNav(container,mobile=false) {
  container.replaceChildren();
  for (const item of data.navigation) {
    if (Array.isArray(item.children) && item.children.length) {
      const details=element('details',{class:mobile?'mobile-nav-item':'nav-item'});
      details.append(element('summary',{},[document.createTextNode(item.label),icon('down')]));
      const list=element('div',{class:mobile?'mobile-submenu':'nav-dropdown'});
      for (const child of item.children) list.append(element('button',{type:'button',text:child.label,onclick:()=>demoPage(child.label)}));
      details.append(list);details.addEventListener('toggle',()=>{
        if(details.open)container.querySelectorAll('details[open]').forEach(other=>{if(other!==details)other.open=false;});
      });container.append(details);
    } else {
      const link=action(item.label,item.target,mobile?'mobile-nav-link':'nav-link',()=>demoPage(item.label));
      if(item.target==='#home')link.setAttribute('aria-current','page');
      if(mobile && item.target?.startsWith('#'))link.addEventListener('click',()=>$('#menu-dialog').close());
      container.append(link);
    }
  }
}
function renderHero() {
  const slides=data.hero.slides, slide=slides[state.hero];
  $('#hero-eyebrow').textContent=slide.eyebrow||data.hero.eyebrow||'';
  $('#hero-title').textContent=slide.title;$('#hero-description').textContent=slide.description;
  const picture=$('#hero-image');picture.src=safeURL(slide.image)||'assets/images/fallback.svg';picture.alt=slide.imageAlt||'';picture.setAttribute('fetchpriority','high');picture.classList.toggle('is-poster',slide.imageFit==='contain');
  picture.onerror=()=>{picture.onerror=null;picture.src='assets/images/fallback.svg';};
  $('#hero-caption').textContent=slide.caption||'';$('#hero-caption').hidden=!slide.caption;
  $('#hero-dots').replaceChildren(...slides.map((_,index)=>element('button',{type:'button','aria-label':'نمایش اسلاید '+formatNumber(index+1),'aria-current':index===state.hero?'true':'false',onclick:()=>{state.hero=index;renderHero();}})));
  $('#hero-status').textContent='اسلاید '+formatNumber(state.hero+1)+' از '+formatNumber(slides.length);
}
function stepHero(delta) { state.hero=(state.hero+delta+data.hero.slides.length)%data.hero.slides.length;renderHero(); }
function installSwipe(node,next,previous) {
  let start=null;
  node.addEventListener('pointerdown',event=>{if(event.isPrimary)start={x:event.clientX,y:event.clientY};});
  node.addEventListener('pointercancel',()=>{start=null;});
  node.addEventListener('pointerup',event=>{
    if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;start=null;
    if(Math.abs(dx)>45&&Math.abs(dy)<65)(dx>0?next:previous)();
  });
}
function openStory(item,type) {
  const content=dialogContent(item.title,type==='events'?'رویدادهای انجمن':'اخبار انجمن');
  content.prepend(image(item.image,item.imageAlt||item.title,{lazy:false,className:'dialog-content-image'+(item.imageFit==='contain'?' is-poster':'')}));
  content.append(element('p',{class:'dialog-meta',text:[item.date,item.location,item.category].filter(Boolean).join(' · ')}));
  content.append(element('p',{class:'dialog-body',text:item.body||item.excerpt||''}));
  const href=safeURL(item.url);
  if(href)content.append(action(item.actionLabel||(type==='events'?'اطلاعات رویداد':'مشاهده منبع خبر'),href,'button'));
  if(item.imageFit==='contain'){
    const original=action('مشاهده پوستر در اندازهٔ اصلی',item.image,'text-action');original.target='_blank';original.rel='noopener noreferrer';content.append(original);
  }
  for(const url of item.sourceUrls||[])if(url!==item.sourceUrl)content.append(action('اطلاعیهٔ تکمیلی در کانال',url,'text-action'));
  content.append(element('p',{class:'dialog-note',text:item.sourceUrl?'خلاصهٔ بازنویسی‌شده بر اساس اطلاعیهٔ کانال انجمن آب و فاضلاب ایران. تاریخ و شرایط را در متن اصلی اطلاعیه بررسی کنید.':'این مطلب بخشی از محتوای نمونه برای نمایش طراحی است.'}));
}
function renderEditorial(type) {
  const items=data[type].items,host=$('#'+type+'-carousel');
  if(!items.length){host.replaceChildren(element('p',{class:'empty-editorial',text:type==='events'?'در اطلاعیه‌های واردشده، رویدادی با تاریخ آینده باقی نمانده است. رویدادهای قبلی در فهرست همه رویدادها قابل مشاهده‌اند.':'به‌زودی مطالب این بخش منتشر می‌شود.'}));return;}
  const item=items[state[type]],event=type==='events';
  const media=element('div',{class:'story-image'},[image(item.image,item.imageAlt||item.title,{lazy:false,className:item.imageFit==='contain'?'is-poster':''}),element('span',{class:'story-tag',text:item.category||(event?'رویداد علمی':'اخبار انجمن')})]);
  const meta=element('div',{class:'story-meta'},[icon('calendar'),document.createTextNode(item.date||'')]);
  const link=element('button',{type:'button',class:'story-link',onclick:()=>openStory(item,type)},[document.createTextNode(event?'جزئیات رویداد':'ادامه مطلب'),icon('left')]);
  const bottom=element('div',{class:'story-bottom'},[link]);
  if(event)bottom.append(element('span',{class:'event-location'},[icon('map'),document.createTextNode(item.location||'آنلاین')]));
  const body=element('div',{class:'story-body'},[meta,element('h3',{text:item.title}),element('p',{class:'story-excerpt',text:item.excerpt||''}),bottom]);
  const card=element('article',{class:'story-card'},[media,body]);
  const change=delta=>{state[type]=(state[type]+delta+items.length)%items.length;renderEditorial(type);};
  const previous=element('button',{type:'button',class:'round-button editorial-arrow editorial-previous','aria-label':event?'رویداد قبلی':'خبر قبلی',onclick:()=>change(-1)},[icon('right')]);
  const next=element('button',{type:'button',class:'round-button editorial-arrow editorial-next','aria-label':event?'رویداد بعدی':'خبر بعدی',onclick:()=>change(1)},[icon('left')]);
  previous.disabled=next.disabled=items.length<2;
  const frame=element('div',{class:'editorial-carousel',tabindex:'0',role:'region','aria-label':event?'اسلایدر رویدادها':'اسلایدر اخبار'},[card,previous,next]);
  frame.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();change(e.key==='ArrowLeft'?1:-1);}});
  installSwipe(frame,()=>change(1),()=>change(-1));
  const status=element('div',{class:'carousel-status',role:'group','aria-label':event?'انتخاب رویداد':'انتخاب خبر'},items.map((entry,index)=>element('button',{type:'button',class:'editorial-dot','aria-label':(event?'نمایش رویداد ':'نمایش خبر ')+formatNumber(index+1)+': '+entry.title,'aria-current':index===state[type]?'true':'false',onclick:()=>{state[type]=index;renderEditorial(type);host.querySelector('.editorial-dot[aria-current="true"]').focus({preventScroll:true});}})));
  status.append(element('span',{class:'visually-hidden','aria-live':'polite',text:'آیتم '+formatNumber(state[type]+1)+' از '+formatNumber(items.length)}));
  host.replaceChildren(frame,status);
}
function renderCommunity() {
  $('#about-description').textContent=data.about.description;$('#community-description').textContent=data.community.description;
  $('#community-platforms').replaceChildren(...data.community.platforms.map(item=>{
    const tile=action('',item.url,'platform-tile platform-'+item.key,()=>openInfo(item.title,'نشانی رسمی '+item.title+' انجمن پس از تأیید اضافه خواهد شد.'));
    const asset=['telegram','bale'].includes(item.key)?item.key+'-brand':item.key;
    tile.append(element('span',{class:'platform-icon'},[image('assets/icons/'+asset+'.svg','',{width:36,height:36})]),element('span',{class:'platform-title',text:item.title}),icon('left'));return tile;
  }));
  $('#telegram-groups').replaceChildren(...data.community.groups.map(item=>{
    const tile=action('',item.url,'telegram-tile',()=>openInfo(item.title,item.description||'لینک عضویت این گروه پس از تأیید انجمن اضافه می‌شود.'));
    tile.append(element('span',{class:'platform-icon'},[image('assets/icons/telegram-brand.svg','',{width:36,height:36})]),element('span',{class:'telegram-copy'},[element('strong',{text:item.title}),element('small',{text:'عضویت و گفت‌وگو'})]),icon('left'));return tile;
  }));
  $('#shortcut-list').replaceChildren(...data.shortcuts.map(item=>{
    const tile=action('',item.url,'shortcut',()=>openInfo(item.title,item.description||'اطلاعات این بخش در نسخهٔ کامل وب‌سایت در دسترس خواهد بود.'));
    tile.append(element('span',{class:'shortcut-symbol'},[icon(item.icon)]),element('span',{class:'shortcut-title',text:item.title}),icon('left'));return tile;
  }));
}
function renderStatistics() {
  $('#statistics-description').textContent=data.statistics.description||'';
  $('#statistics-grid').replaceChildren(...data.statistics.items.map(item=>element('div',{class:'stat-card'},[element('strong',{class:'stat-value',text:formatNumber(item.value)}),element('span',{class:'stat-label',text:item.label})])));
}
function openMember(item,group) {
  const content=dialogContent(item.name,group.title);
  const picture=image(item.image,item.imageAlt||item.name,{lazy:false,width:112,height:112,className:'member-image'});picture.style.marginInline='auto';content.prepend(picture);
  content.append(element('p',{class:'dialog-meta',text:item.role||''}),element('p',{class:'dialog-body',text:item.description||'معرفی، فعالیت‌ها و راه‌های ارتباط با این عضو در نسخهٔ کامل وب‌سایت درج خواهد شد.'}),element('p',{class:'dialog-note',text:'نام و تصویر این کارت برای نمونهٔ طراحی است و معرفی عضو واقعی انجمن نیست.'}));
  if(safeURL(item.url))content.append(action('وبگاه عضو',item.url,'button'));
}
function openArchive(key) {
  const group=data.members.find(item=>item.key===key),isMembers=Boolean(group),collection=isMembers?group:data[key];
  if(!collection)return;
  const content=dialogContent(isMembers?group.archiveLabel:collection.archiveLabel||collection.title,isMembers?'فهرست نمونه اعضا':'اخبار و رویدادهای انجمن');
  const list=element('div',{class:'archive-list'});
  for(const item of [...collection.items,...(collection.archiveItems||[])]) {
    const detail=(item.role||item.date||'')+(item.eventStatus==='past'?' · آرشیو رویدادها':'');
    const row=element('button',{type:'button',class:'archive-item',onclick:()=>isMembers?openMember(item,group):openStory(item,key)},[image(item.image,item.imageAlt||item.name||item.title,{width:76,height:64}),element('span',{},[element('strong',{text:item.name||item.title}),element('small',{text:detail})]),icon('left')]);list.append(row);
  }
  content.append(list);
}
function renderMembers() {
  const mount=$('#members');mount.replaceChildren();
  for(const group of data.members) {
    if(!group.items.length)continue;
    const headingId='members-heading-'+group.key;
    const section=element('section',{class:'people-section','aria-labelledby':headingId,'data-members':group.key});
    const heading=element('h2',{id:headingId,class:'people-heading',text:group.title});
    const more=element('button',{type:'button',class:'button people-more',onclick:()=>openArchive(group.key)},[document.createTextNode(group.archiveLabel),icon('left')]);
    const track=element('div',{class:'people-track'});
    for(const item of group.items) {
      const name=element('button',{type:'button',text:item.name,onclick:()=>openMember(item,group)});
      track.append(element('article',{class:'member-card '+group.key},[image(item.image,item.imageAlt||item.name,{width:112,height:112,className:'member-image'}),element('h3',{},[name]),element('p',{text:item.role||''}),element('span',{class:'member-badge',text:item.badge||group.badge})]));
    }
    const viewport=element('div',{class:'people-viewport'},[track]);
    let index=0;
    const status=element('span',{class:'visually-hidden','aria-live':'polite'});
    const previous=element('button',{type:'button',class:'round-button people-previous','aria-label':group.title+'؛ کارت‌های قبلی'},[icon('right')]);
    const next=element('button',{type:'button',class:'round-button people-next','aria-label':group.title+'؛ کارت‌های بعدی'},[icon('left')]);
    const carousel=element('div',{class:'people-carousel',tabindex:'0',role:'region','aria-label':group.title},[viewport,previous,next,status]);
    function update(delta=0) {
      const cardWidth=track.firstElementChild.getBoundingClientRect().width;
      if(!cardWidth)return;
      const gap=parseFloat(getComputedStyle(track).gap)||20,visible=Math.max(1,Math.floor((viewport.clientWidth+gap)/(cardWidth+gap)));
      const max=Math.max(0,group.items.length-visible);index=Math.min(max,Math.max(0,index+delta));
      track.style.transform='translateX('+(index*(cardWidth+gap))+'px)';previous.disabled=index===0;next.disabled=index===max;
      Array.from(track.children).forEach((card,i)=>{card.inert=i<index||i>=index+visible;card.setAttribute('aria-hidden',card.inert?'true':'false');});
      status.textContent='نمایش عضو '+formatNumber(index+1)+' تا '+formatNumber(Math.min(index+visible,group.items.length))+' از '+formatNumber(group.items.length);
    }
    previous.addEventListener('click',()=>update(-1));next.addEventListener('click',()=>update(1));
    carousel.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();update(event.key==='ArrowLeft'?1:-1);}});
    installSwipe(carousel,()=>update(1),()=>update(-1));
    section.append(heading,more,carousel);mount.append(section);new ResizeObserver(()=>update()).observe(viewport);requestAnimationFrame(()=>update());
  }
}
function renderFooter() {
  $('#footer-sites').replaceChildren(...data.footer.websites.map(item=>{const link=action('',item.url,'',()=>demoPage(item.title));link.append(icon('left'),document.createTextNode(item.title));return element('li',{},[link]);}));
  const contact=$('#footer-contact');contact.replaceChildren();
  for(const item of data.footer.contact) {
    const value=element('dd',{text:item.value});if(item.key==='phone'){value.dir='ltr';value.style.textAlign='right';}
    contact.append(element('dt',{text:item.label}),value);
  }
  $('#footer-socials').replaceChildren(...data.footer.socials.map(item=>{const link=action('',item.url,'social-square',()=>openInfo(item.title,'نشانی رسمی '+item.title+' انجمن پس از تأیید اضافه می‌شود.'));link.setAttribute('aria-label',item.title+' انجمن');link.title=item.title;link.append(image('assets/icons/'+item.key+'.svg','',{width:22,height:22}));return link;}));
  const trust=data.footer.trust,seal=action('',trust.url,'trust-tile',()=>openInfo('نماد اعتماد الکترونیکی','این نشان در نمونهٔ طراحی صرفاً برای نمایش محل قرارگیری اینماد است.'));
  seal.append(image(trust.image,'لوگوی نماد اعتماد الکترونیکی؛ نمونهٔ نمایشی',{width:120,height:120}),element('span',{text:'نماد اعتماد الکترونیکی'}));
  $('#trust-mark').replaceChildren(seal);if(!safeURL(trust.url))$('#trust-mark').append(element('p',{class:'trust-caption',text:'نمونهٔ نمایشی'}));
  $('#demo-disclaimer').textContent=data.site.demoDisclaimer;$('#contact').hidden=false;
}
function normalize(value) { return String(value).replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\u200c\s]+/g,' ').trim().toLocaleLowerCase('fa'); }
function openSearch() {
  if(!data)return;
  const content=dialogContent('جست‌وجو در مطالب','اخبار و رویدادهای انجمن');
  const input=element('input',{class:'search-field',type:'search',placeholder:'عنوان یا موضوع را جست‌وجو کنید…','aria-label':'عبارت جست‌وجو'}),results=element('div',{class:'archive-list','aria-live':'polite'});
  content.append(input,results);
  function search() {
    const term=normalize(input.value),items=[...data.news.items.map(item=>({item,type:'news'})),...[...data.events.items,...(data.events.archiveItems||[])].map(item=>({item,type:'events'}))].filter(({item})=>normalize(item.title+' '+(item.excerpt||'')).includes(term));
    results.replaceChildren();
    if(!items.length){results.append(element('p',{class:'search-empty',text:'مطلبی با این عبارت پیدا نشد.'}));return;}
    for(const {item,type}of items.slice(0,20))results.append(element('button',{class:'archive-item',type:'button',onclick:()=>openStory(item,type)},[image(item.image,item.title,{width:76,height:64}),element('span',{},[element('strong',{text:item.title}),element('small',{text:(type==='news'?'خبر':'رویداد')+' · '+item.date})]),icon('left')]));
  }
  input.addEventListener('input',search);search();input.focus();
}
function validateContent(content) {
  if(!content || !Array.isArray(content.hero?.slides) || !content.hero.slides.length)throw new Error('بخش hero.slides باید دست‌کم یک اسلاید داشته باشد.');
  for(const key of ['navigation','shortcuts','members'])if(!Array.isArray(content[key]))throw new Error('بخش '+key+' باید آرایه باشد.');
  for(const key of ['news','events','statistics'])if(!Array.isArray(content[key]?.items))throw new Error('بخش '+key+'.items باید آرایه باشد.');
  if(!content.site||!content.about||!content.community||!content.footer)throw new Error('ساختار فایل محتوا ناقص است.');
}
function organizeEventDates() {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Tehran'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
  const today=parts.year+'-'+parts.month+'-'+parts.day;
  const all=[...data.events.items,...(data.events.archiveItems||[])],seen=new Set(),upcoming=[],past=[];
  for(const item of all){if(seen.has(item.id))continue;seen.add(item.id);const date=item.endDateISO||item.startDateISO;
    if(date&&date<today){item.eventStatus='past';past.push(item);}else{if(date)item.eventStatus='upcoming';upcoming.push(item);}
  }
  data.events.items=upcoming;data.events.archiveItems=past;
}
async function start() {
  hydrateIcons();
  document.querySelectorAll('dialog').forEach(dialog=>{
    dialog.addEventListener('close',syncBodyLock);
    dialog.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  });
  $('#open-menu').addEventListener('click',()=>{if(data)showDialog($('#menu-dialog'));});$('#open-search').addEventListener('click',openSearch);
  $('#open-account').addEventListener('click',()=>demoPage('ورود / حساب کاربری'));$('.menu-account').addEventListener('click',()=>demoPage('ورود / حساب کاربری'));
  $('#join-association').addEventListener('click',()=>demoPage('عضویت در انجمن'));
  document.addEventListener('click',event=>{document.querySelectorAll('.desktop-navigation details[open]').forEach(node=>{if(!node.contains(event.target))node.open=false;});});
  try {
    const response=await fetch('data/content.json',{cache:'no-cache'});
    if(!response.ok)throw new Error('دریافت content.json ناموفق بود ('+response.status+').');
    data=await response.json();validateContent(data);organizeEventDates();
    $('#site-title').textContent=data.site.name;document.title=data.site.name+' | صفحه اصلی';
    renderNav($('#desktop-nav'));renderNav($('#mobile-nav'),true);renderHero();renderEditorial('events');renderEditorial('news');renderCommunity();renderStatistics();renderMembers();renderFooter();
    $('#hero-next').addEventListener('click',()=>stepHero(1));$('#hero-previous').addEventListener('click',()=>stepHero(-1));installSwipe($('.hero-visual'),()=>stepHero(1),()=>stepHero(-1));
    document.querySelectorAll('[data-archive]').forEach(node=>node.addEventListener('click',()=>openArchive(node.dataset.archive)));
    $('#loading').hidden=true;$('#page-content').hidden=false;document.body.dataset.ready='true';
    await document.fonts.ready;window.dispatchEvent(new Event('resize'));
  } catch(error) {
    $('#loading').hidden=true;const box=$('#load-error');box.hidden=false;
    box.append(element('h2',{text:'محتوای نمونه بارگذاری نشد'}),element('p',{text:location.protocol==='file:'?'فایل را از طریق سرور محلی باز کنید تا JSON خوانده شود. در پوشهٔ دمو این دستور را اجرا کنید:':'فایل data/content.json و مسیر آن را بررسی کنید.'}),element('code',{text:'node serve.cjs'}),element('p',{text:error.message}));document.body.dataset.ready='error';
  }
}
start();

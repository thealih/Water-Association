/* Optional authoring checks. The published site itself has no npm dependencies.
 * Set DEMO_PLAYWRIGHT_MODULE to the installed playwright module path if necessary.
 */
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.DEMO_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),artifacts=path.join(__dirname,'artifacts'),content=JSON.parse(fs.readFileSync(path.join(root,'data/content.json'),'utf8'));
fs.mkdirSync(artifacts,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2'};
// Serve under a project prefix to reproduce GitHub Pages project-site URLs.
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!pathname.startsWith('/sample-project/')){res.writeHead(404);return res.end();}
  const file=path.resolve(root,'.'+pathname.slice('/sample-project'.length).replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(error,bytes)=>{res.writeHead(error?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(error?'Not found':bytes);});
});
let browser;
(async()=>{
  assert.equal(content.news.items.length,10);assert.equal(content.events.items.length+content.events.archiveItems.length,10);
  assert(content.events.items.every(item=>(item.endDateISO||item.startDateISO)>='2026-11-15'));
  assert(content.events.archiveItems.every(item=>(item.endDateISO||item.startDateISO)<'2026-11-15'));
  assert.equal(content.members.length,3);assert.equal(content.members.find(g=>g.key==='individual').items.length,10);
  const corporate=content.members.find(g=>g.key==='corporate');assert.equal(corporate.items.length,33);assert.equal(corporate.isDemo,false);assert.equal(corporate.items.filter(item=>!item.logoMissing).length,32);assert(corporate.items.every(item=>item.isDemo===false&&item.membershipLevel));assert.deepEqual(['diamond','gold','silver','bronze'].map(tier=>corporate.items.filter(item=>item.membershipTier===tier).length),[6,5,9,13]);
  const veterans=content.members.find(g=>g.key==='veterans');assert.equal(veterans.items.length,6);assert.equal(veterans.isDemo,false);assert(veterans.items.every(item=>item.isDemo===false&&item.image.endsWith('.jpg')));assert.deepEqual(veterans.items.map(item=>item.awardYear),[1404,1404,1403,1403,1402,1402]);
  const paths=[];function walk(value){if(typeof value==='string'&&value.startsWith('assets/'))paths.push(value);else if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')Object.values(value).forEach(walk);}walk(content);for(const file of paths)assert(fs.existsSync(path.join(root,file)),file+' is missing');
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port+'/sample-project/';
  browser=await chromium.launch({headless:true,executablePath:process.env.DEMO_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',args:['--no-sandbox']});
  const failures=[],results=[];
  for(const width of [1440,1024,768,390,360]){
    const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1,locale:'fa-IR',isMobile:width<768,hasTouch:width<768});
    const page=await context.newPage();await page.addInitScript(()=>{const OriginalDate=Date;window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:['2026-11-15T09:00:00+03:30']));}static now(){return new OriginalDate('2026-11-15T09:00:00+03:30').getTime();}};});page.on('pageerror',error=>failures.push(error.message));page.on('response',response=>{if(response.status()>=400)failures.push(response.status()+' '+response.url());});
    await page.goto(url);await page.waitForSelector('body[data-ready="true"]');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(150);
    assert.equal(await page.locator('.people-section').count(),3);assert.equal(await page.locator('.stat-card').count(),10);assert.equal(await page.locator('.shortcut').count(),11);
    const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,font:document.fonts.check('14px Vazirmatn'),heroImage:document.querySelector('.hero-visual').getBoundingClientRect().toJSON(),heroTitle:document.querySelector('.hero-copy').getBoundingClientRect().toJSON()}));
    assert(layout.scroll<=layout.width+1,'Horizontal overflow at '+width+': '+layout.scroll);assert(layout.font,'Local font not loaded');
    if(width>=768){
      const menus=page.locator('#desktop-nav details'),first=menus.first();
      await first.locator('summary').hover();assert(await first.getAttribute('open')!==null,'Hover must open desktop submenu');
      const child=first.locator('.nav-dropdown button').first(),box=await child.boundingBox();
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:12});assert(await child.isVisible(),'Submenu must stay open across the gap');
      await menus.nth(1).locator('summary').hover();assert.equal(await first.getAttribute('open'),null);
      await page.mouse.move(0,0);assert.equal(await menus.nth(1).getAttribute('open'),null);
      await first.locator('summary').focus();await page.keyboard.press('Enter');assert(await child.isVisible());await page.keyboard.press('Escape');assert.equal(await first.getAttribute('open'),null);
    }
    if(width<768){assert(layout.heroImage.bottom<=layout.heroTitle.top,'Mobile banner image must precede text');
      for(const section of await page.locator('.people-section').all()){
        const geometry=await section.evaluate(n=>{const view=n.querySelector('.people-viewport').getBoundingClientRect(),more=n.querySelector('.people-more').getBoundingClientRect(),title=n.querySelector('.people-heading'),r=document.createRange();r.selectNodeContents(title);const text=r.getBoundingClientRect(),heading=title.getBoundingClientRect();return {view:view.toJSON(),more:more.toJSON(),titleGap:heading.right-text.right,arrows:[...n.querySelectorAll('.people-next,.people-previous')].map(x=>({rect:x.getBoundingClientRect().toJSON(),visible:getComputedStyle(x).display!=='none'}))};});
        assert(geometry.more.top>=geometry.view.bottom,'Member archive must be below cards');assert(Math.abs(geometry.more.width-geometry.view.width)<1,'Member archive must be full width');assert(geometry.titleGap>=12,'Title overlaps its blue accent');
        assert(geometry.arrows.every(a=>a.visible&&a.rect.width===40));
        const [previous,next]=geometry.arrows;assert(Math.abs(next.rect.x+20-geometry.view.x)<1);assert(Math.abs(previous.rect.x+20-geometry.view.right)<1);
      }
      await page.locator('#open-menu').click();assert(await page.locator('#menu-dialog').isVisible());await page.locator('#mobile-nav details summary').first().click();assert(await page.locator('#mobile-nav .mobile-submenu').first().isVisible());await page.locator('#mobile-nav a[href$="#news"]').click();assert(!(await page.locator('#menu-dialog').isVisible()));
    }else assert(layout.heroImage.right<=layout.heroTitle.left,'Desktop banner photo must be to the left');
    const original=await page.locator('#hero-title').textContent();await page.locator('#hero-next').click();assert.notEqual(await page.locator('#hero-title').textContent(),original);await page.locator('#hero-previous').click();assert.equal(await page.locator('#hero-title').textContent(),original);
    for(const type of ['news','events']){
      const host=page.locator('#'+type+'-carousel'),frame=host.locator('.editorial-carousel');
      await frame.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
      const geometry=await frame.evaluate(n=>{const card=n.querySelector('.story-card').getBoundingClientRect();return {card:card.toJSON(),arrows:[...n.querySelectorAll('.editorial-arrow')].map(a=>({rect:a.getBoundingClientRect().toJSON(),opacity:getComputedStyle(a).opacity}))};});
      for(const arrow of geometry.arrows)assert(Math.abs(arrow.rect.y+arrow.rect.height/2-(geometry.card.y+geometry.card.height/2))<1,'Editorial arrow must be vertically centered');
      assert(Math.abs(geometry.arrows[0].rect.x+18-geometry.card.right)<1,'Previous arrow must straddle right card edge');
      assert(Math.abs(geometry.arrows[1].rect.x+18-geometry.card.left)<1,'Next arrow must straddle left card edge');
      assert(geometry.arrows.every(a=>Number(a.opacity)===(width<768?1:0)),'Editorial arrows must respect mobile/desktop visibility');
      await frame.hover();assert.equal(await host.locator('.editorial-next').evaluate(n=>getComputedStyle(n).opacity),'1');
      assert.equal(await host.locator('.editorial-dot').count(),content[type].items.length);
      await host.locator('.editorial-dot').nth(1).click();assert.equal(await host.locator('h3').textContent(),content[type].items[1].title);
      assert.equal(await host.locator('.editorial-dot[aria-current="true"]').count(),1);
      await host.locator('.editorial-dot').first().click();
    }
    const newsTitle=await page.locator('#news-carousel h3').textContent();await page.locator('#news-carousel .editorial-carousel').hover();await page.locator('#news-carousel .editorial-next').click();assert.notEqual(await page.locator('#news-carousel h3').textContent(),newsTitle);await page.locator('#news-carousel .editorial-previous').click();
    await page.locator('[data-archive="news"]').click();assert.equal(await page.locator('#content-dialog .archive-item').count(),10);await page.locator('#content-dialog [data-close]').click();
    await page.locator('#events-carousel .story-link').click();assert.equal(await page.locator('.dialog-content-image').evaluate(n=>getComputedStyle(n).objectFit),'contain');assert(await page.locator('#content-dialog a[href="https://t.me/IRWWA94/523"]').isVisible());assert(!(await page.locator('.dialog-note').textContent()).includes('محتوای نمونه'));await page.locator('#content-dialog [data-close]').click();
    await page.locator('[data-archive="events"]').click();assert.equal(await page.locator('#content-dialog .archive-item').count(),10);assert.equal(await page.locator('#content-dialog .archive-item').filter({hasText:'آرشیو رویدادها'}).count(),6);await page.locator('#content-dialog [data-close]').click();
    for(const section of await page.locator('.people-section').all()){
      await section.locator('.people-next').click();await page.waitForTimeout(420);assert.notEqual(await section.locator('.people-track').evaluate(n=>getComputedStyle(n).transform),'matrix(1, 0, 0, 1, 0, 0)');
      const key=await section.getAttribute('data-members'),group=content.members.find(g=>g.key===key);
      await section.locator('.people-more').click();assert.equal(await page.locator('#content-dialog .archive-item').count(),group.items.length);
      if(key==='corporate'){
        assert(!(await page.locator('#dialog-eyebrow').textContent()).includes('نمونه'));
        assert.equal(await page.locator('#content-dialog .archive-item').first().locator('small').textContent(),'عضویت الماسی');
        assert.equal(await page.locator('#content-dialog .archive-item img').first().evaluate(n=>getComputedStyle(n).objectFit),'contain');
        await page.locator('#content-dialog .archive-item').last().click();assert.equal(await page.locator('#dialog-heading').textContent(),'شرکت دریـارود جنوب'.replace('ـ',''));
        assert((await page.locator('#content-dialog .dialog-body').textContent()).includes('در فایل منبع درج نشده'));
        assert.equal(await page.locator('#content-dialog .corporate-logo').evaluate(n=>getComputedStyle(n).objectFit),'contain');
        assert(!(await page.locator('#content-dialog .dialog-note').textContent()).includes('نمونه'));
      }
      if(key==='veterans'){
        assert(!(await page.locator('#dialog-eyebrow').textContent()).includes('نمونه'));
        await page.locator('#content-dialog .archive-item').last().click();
        assert.equal(await page.locator('#dialog-heading').textContent(),'مهندس عباس شفیعی');
        assert((await page.locator('#content-dialog .dialog-body').textContent()).includes('مدیرعامل اسبق شرکت مهندسی آب و فاضلاب کشور'));
        assert(!(await page.locator('#content-dialog .dialog-note').textContent()).includes('نمونه'));
        assert((await page.locator('#content-dialog .veteran-portrait').getAttribute('src')).endsWith('/assets/images/veterans/abbas-shafiei.jpg'));
      }
      await page.locator('#content-dialog [data-close]').click();
      await section.locator('.people-previous').click();
    }
    await page.locator('#open-search').click();await page.locator('.search-field').fill('هدررفت');assert((await page.locator('#content-dialog .archive-item').count())>0);await page.locator('.search-field').fill('عبارت کاملاً ناموجود ۱۲۳۴۵');assert.equal(await page.locator('#content-dialog .archive-item').count(),0);await page.locator('#content-dialog [data-close]').click();
    for(const card of await page.locator('.stat-card').all())await card.scrollIntoViewIfNeeded();
    await page.waitForFunction(values=>[...document.querySelectorAll('.stat-counter')].every((node,i)=>node.textContent===new Intl.NumberFormat('fa-IR').format(values[i])),content.statistics.items.map(item=>item.value));
    await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(300);
    assert.equal(await page.locator('.footer-socials .social-square').count(),7);assert(await page.locator('.trust-caption').isVisible());
    const broken=await page.locator('img').evaluateAll(images=>images.filter(n=>n.dataset.fallback||(n.complete&&!n.naturalWidth)).map(n=>n.src));assert.deepEqual(broken,[],'Images failed at '+width);
    if(width===1440||width===390){await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,behavior:"instant"});});await page.waitForTimeout(200);if(width===1440)await page.screenshot({path:path.join(artifacts,'desktop-preview.png')});await page.screenshot({path:path.join(artifacts,width===1440?'desktop.png':'mobile.png'),fullPage:true});await page.locator('.member-sections').screenshot({path:path.join(artifacts,width===1440?'desktop-members.png':'mobile-members.png')});}
    results.push({width,overflow:false,sections:3,json:true,sliders:true,archives:true,search:true,images:true});await context.close();
  }
  // Check count-up progression, completion, one-time playback and reduced motion.
  const statsPage=await browser.newPage({viewport:{width:1440,height:900}});
  await statsPage.goto(url);await statsPage.waitForSelector('body[data-ready="true"]');
  const target=content.statistics.items[0].value,formatted=new Intl.NumberFormat('fa-IR').format(target);
  assert.equal(await statsPage.locator('.stat-counter').first().textContent(),'۰');
  await statsPage.locator('.stat-card').first().scrollIntoViewIfNeeded();
  await statsPage.waitForFunction(final=>{const text=document.querySelector('.stat-counter').textContent;return text!=='۰'&&text!==final;},formatted);
  await statsPage.waitForFunction(final=>document.querySelector('.stat-counter').textContent===final,formatted);
  await statsPage.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await statsPage.locator('.stat-card').first().scrollIntoViewIfNeeded();assert.equal(await statsPage.locator('.stat-counter').first().textContent(),formatted);
  await statsPage.emulateMedia({reducedMotion:'reduce'});await statsPage.reload();await statsPage.waitForSelector('body[data-ready="true"]');assert.equal(await statsPage.locator('.stat-counter').first().textContent(),formatted);await statsPage.close();
  // Prove new JSON items render without changing HTML or JavaScript.
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),modified=structuredClone(content);
  modified.news.items.push({...modified.news.items[0],id:'news-11',title:'خبر افزوده‌شده فقط با JSON'});
  modified.hero.slides[0].title='عنوان قابل ویرایش از JSON';
  await page.route('**/data/content.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(modified)}));await page.goto(url);await page.waitForSelector('body[data-ready="true"]');assert.equal(await page.locator('#hero-title').textContent(),modified.hero.slides[0].title);await page.locator('[data-archive="news"]').click();assert.equal(await page.locator('#content-dialog .archive-item').count(),11);await context.close();
  const future=await browser.newPage();await future.addInitScript(()=>{const OriginalDate=Date;window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:['2030-01-01T12:00:00Z']));}};});await future.goto(url);await future.waitForSelector('body[data-ready="true"]');assert.equal(await future.locator('#events-carousel .story-card').count(),0);assert(await future.locator('#events-carousel .empty-editorial').isVisible());await future.locator('[data-archive="events"]').click();assert.equal(await future.locator('#content-dialog .archive-item').count(),10);await future.close();
  assert.deepEqual(failures,[]);fs.writeFileSync(path.join(artifacts,'validation.json'),JSON.stringify({passed:true,viewports:results,projectSubpath:true,jsonExtension:true,telegramContent:true,eventArchiving:true,posterContain:true,browserErrors:failures},null,2));console.log('PASS: five viewports, real Telegram posts/posters, four upcoming/six archived events, automatic expiry, project subpath, JSON extension, mobile geometry, sliders, archives, menu, search.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});

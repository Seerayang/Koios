import asyncio
from playwright.async_api import async_playwright
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
import pathlib
URL='file://'+str(pathlib.Path(__file__).resolve().parent.parent/'dist'/'site.html')
EV="__koios.S.events.map(e=>[e.title,e.date,e.endDate,e.start,e.end,!!e.allDay,!!e.milestone])"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        pg = await b.new_page(viewport={'width':1360,'height':820})
        logs=[]
        pg.on('pageerror', lambda e: logs.append('PAGEERR '+str(e)))
        pg.on('console', lambda m: logs.append('CON '+m.text) if m.type=='error' and 'fonts' not in m.text and 'ERR_' not in m.text else None)
        await pg.goto(URL+'#onboarding'); await pg.wait_for_timeout(2500)
        await pg.fill('#obInput','skip everything'); await pg.press('#obInput','Enter'); await pg.wait_for_timeout(3000)
        g = await pg.evaluate("[...document.querySelectorAll('.dgap')].map(e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height]}).filter(r=>r[0]>120&&r[0]<1000)")
        x0=g[0][0]+g[0][2]/2; y0=g[0][1]+g[0][3]/2; x1=g[1][0]+g[1][2]/2
        await pg.mouse.move(x0,y0); await pg.mouse.down(); await pg.mouse.move(x1,y0,steps=8); await pg.mouse.up(); await pg.wait_for_timeout(500)
        await pg.fill('#chatInput','Lit essay'); await pg.press('#chatInput','Enter'); await pg.wait_for_timeout(3500)
        print('1',await pg.evaluate(EV), await pg.evaluate("document.querySelector('#bubble').innerText"))
        await pg.screenshot(path='s22-dt.png')
        bar = await pg.evaluate("(()=>{const e=document.querySelector('#dlane .dt');if(!e)return null;const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()")
        print('bar',bar)
        # stretch right handle
        if bar:
            rx=bar[0]+bar[2]-3; ry=bar[1]+bar[3]/2
            await pg.mouse.move(rx,ry); await pg.mouse.down(); await pg.mouse.move(rx+190,ry,steps=8); await pg.mouse.up(); await pg.wait_for_timeout(500)
            print('stretch',await pg.evaluate(EV))
            bar = await pg.evaluate("(()=>{const e=document.querySelector('#dlane .dt');const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()")
            mx=bar[0]+bar[2]/2; my=bar[1]+bar[3]/2
            await pg.mouse.move(mx,my); await pg.mouse.down(); await pg.mouse.move(mx+180,my,steps=8); await pg.mouse.up(); await pg.wait_for_timeout(500)
            print('move',await pg.evaluate(EV))
            await pg.screenshot(path='s22-dt2.png')
            # click -> popover
            bar = await pg.evaluate("(()=>{const e=document.querySelector('#dlane .dt');const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()")
            await pg.mouse.click(bar[0]+bar[2]/2, bar[1]+bar[3]/2); await pg.wait_for_timeout(500)
            print('pops',await pg.evaluate("[...document.querySelectorAll('.pop.on')].map(e=>e.id)"))
            await pg.screenshot(path='s22-dtpop.png')
            await pg.keyboard.press('Escape')
        # AI-ish local create
        await pg.fill('#chatInput','I will be writing my Lit Essay for the next two days'); await pg.press('#chatInput','Enter'); await pg.wait_for_timeout(4000)
        print('local',await pg.evaluate(EV), await pg.evaluate("document.querySelector('#bubble').innerText"))
        # month view
        await pg.click('button:has-text("Month")'); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='s22-month.png')
        print('month cells',await pg.evaluate("document.querySelectorAll('#mgrid .mc').length"), await pg.evaluate("[...document.querySelectorAll('#mgrid .mh, #mgrid .mdow span')].slice(0,7).map(e=>e.textContent)"))
        # month create by dragging two cells
        cs = await pg.evaluate("[...document.querySelectorAll('#mgrid .mc:not(.out)')].slice(10,12).map(e=>{const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height*0.7,e.dataset.date]})")
        print(cs)
        await pg.mouse.move(cs[0][0],cs[0][1]); await pg.mouse.down(); await pg.mouse.move(cs[1][0],cs[1][1],steps=6); await pg.mouse.up(); await pg.wait_for_timeout(500)
        await pg.fill('#chatInput','Midterm review'); await pg.press('#chatInput','Enter'); await pg.wait_for_timeout(3500)
        print('after month',await pg.evaluate(EV))
        await pg.screenshot(path='s22-month2.png')
        print('ERR',logs); await b.close()
asyncio.run(main())

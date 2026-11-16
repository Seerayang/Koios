import asyncio
from playwright.async_api import async_playwright
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
import pathlib
URL='file://'+str(pathlib.Path(__file__).resolve().parent.parent/'dist'/'site.html')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        pg = await b.new_page(viewport={'width':1360,'height':820})
        logs=[]
        pg.on('pageerror', lambda e: logs.append('PAGEERR '+str(e)))
        pg.on('console', lambda m: logs.append('CON '+m.text) if m.type=='error' and 'fonts' not in m.text and 'ERR_' not in m.text else None)
        await pg.goto(URL+'#onboarding'); await pg.wait_for_timeout(2500)
        await pg.fill('#obInput','skip everything'); await pg.press('#obInput','Enter'); await pg.wait_for_timeout(3000)
        # timed event create via popover
        await pg.click('#tNew'); await pg.wait_for_timeout(300)
        await pg.fill('#pTitle','Lab report'); await pg.click('#pDone'); await pg.wait_for_timeout(1500)
        print('events',await pg.evaluate("__koios.S.events.map(e=>[e.id,e.title,e.date,e.start,e.end,!!e.allDay])"))
        await pg.wait_for_timeout(1500)
        ev = await pg.query_selector('.ev')
        print('ev box', ev and await ev.bounding_box(), await pg.evaluate("document.querySelectorAll('.ev').length"))
        await pg.screenshot(path='s21-ev.png')
        # drag move
        if not ev: print('NOEV'); await b.close(); return
        await pg.wait_for_timeout(1200); bb = await ev.bounding_box()
        print('bb',bb)
        await pg.mouse.move(bb['x']+bb['width']/2, bb['y']+bb['height']/2)
        await pg.mouse.down(); await pg.mouse.move(bb['x']+bb['width']/2+200, bb['y']+bb['height']/2+120, steps=8); await pg.mouse.up(); await pg.wait_for_timeout(800)
        print('after move',await pg.evaluate("__koios.S.events.map(e=>[e.title,e.date,e.start,e.end])"))
        ev = await pg.query_selector('.ev'); bb = await ev.bounding_box()
        # resize bottom
        await pg.mouse.move(bb['x']+bb['width']/2, bb['y']+bb['height']-2)
        await pg.mouse.down(); await pg.mouse.move(bb['x']+bb['width']/2, bb['y']+bb['height']+80, steps=6); await pg.mouse.up(); await pg.wait_for_timeout(600)
        print('after rz bottom',await pg.evaluate("__koios.S.events.map(e=>[e.title,e.date,e.start,e.end])"))
        ev = await pg.query_selector('.ev'); bb = await ev.bounding_box()
        await pg.mouse.move(bb['x']+bb['width']/2, bb['y']+2)
        await pg.mouse.down(); await pg.mouse.move(bb['x']+bb['width']/2, bb['y']-60, steps=6); await pg.mouse.up(); await pg.wait_for_timeout(600)
        print('after rz top',await pg.evaluate("__koios.S.events.map(e=>[e.title,e.date,e.start,e.end])"))
        await pg.screenshot(path='s21-moved.png')
        # day task via dgap drag
        gaps = await pg.query_selector_all('.dgap')
        print('dgaps',len(gaps))
        g = await pg.evaluate("(()=>{const a=[...document.querySelectorAll('.dgap')].map(e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height]}).filter(r=>r[0]>60&&r[0]<1000);return a.slice(0,3)})()")
        print('gap rects',g)
        x0=g[0][0]+g[0][2]/2; y0=g[0][1]+g[0][3]/2; x1=g[1][0]+g[1][2]/2
        await pg.mouse.move(x0,y0); await pg.mouse.down(); await pg.mouse.move(x1,y0,steps=8); await pg.mouse.up(); await pg.wait_for_timeout(600)
        await pg.screenshot(path='s21-dt-create.png')
        print('pop open?', await pg.evaluate("[...document.querySelectorAll('.pop.on')].map(e=>e.id)"), await pg.evaluate("document.querySelector('#bubble').innerText"), await pg.evaluate("JSON.stringify(__koios.S.pending)"))
        print('ERR',logs); await b.close()
asyncio.run(main())

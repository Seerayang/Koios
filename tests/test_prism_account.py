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
        # milestones: several in one week
        for t,off in [('Chem midterm',9),('Econ quiz',11),('Goldman superday',40),('Problem set',3)]:
            await pg.click('#tNew'); await pg.wait_for_timeout(250)
            await pg.fill('#pTitle',t); await pg.check('#pMile')
            await pg.fill('#pDate', await pg.evaluate("(o=>{const d=new Date();d.setDate(d.getDate()+o);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})(%d)"%off))
            await pg.click('#pDone'); await pg.wait_for_timeout(600)
        await pg.click('#tPrism'); await pg.wait_for_timeout(500)
        await pg.screenshot(path='s23-prism.png')
        print('rows',await pg.evaluate("[...document.querySelectorAll('#mList .mrow')].map(r=>r.innerText.replace(/\\n/g,' | '))"))
        await pg.click('#mClose'); await pg.wait_for_timeout(300)
        # account
        await pg.click('#tAcct'); await pg.wait_for_timeout(500)
        await pg.fill('#aName','Sophia')
        await pg.click('#aTheme .sw[data-k=violet]'); await pg.click('#aBot .sw[data-k=rose]'); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='s23-acct.png')
        print('acct panel h',await pg.evaluate("(r=>[r.top,r.bottom,innerHeight])(document.querySelector('#aPanel').getBoundingClientRect())"), await pg.evaluate("document.querySelector('#acctInit').textContent"))
        await pg.click('#aClose'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='s23-violet.png')
        # reload persist
        await pg.reload(); await pg.wait_for_timeout(1500)
        print('persist',await pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--blue')"))
        # week themes toggle
        await pg.evaluate("__koios.S.view") 
        await pg.click('#tPers'); await pg.wait_for_timeout(400)
        await pg.screenshot(path='s23-pers.png')
        print('pers inputs',await pg.evaluate("[...document.querySelectorAll('#pPanel input[type=checkbox], .ppanel input[type=checkbox]')].map(e=>e.id)"))
        print('ERR',logs); await b.close()
asyncio.run(main())

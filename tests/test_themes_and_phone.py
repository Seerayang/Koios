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
        await pg.goto(URL+'#onboarding'); await pg.wait_for_timeout(2500)
        await pg.fill('#obInput','skip everything'); await pg.press('#obInput','Enter'); await pg.wait_for_timeout(3000)
        m="(()=>{const s=document.querySelector('.sbody');const r=s.getBoundingClientRect();const h=document.querySelector('.bands');return {bodyTop:r.top,bodyBottom:r.bottom,bandH:getComputedStyle(document.documentElement).getPropertyValue('--bandH'),bands:document.querySelectorAll('.bands .band').length}})()"
        print('on',await pg.evaluate(m))
        for _ in range(8):
            await pg.click('#zOut') if await pg.query_selector('#zOut') else await pg.click('button[aria-label*="out" i]'); await pg.wait_for_timeout(250)
        await pg.wait_for_timeout(800); print('zoomed',await pg.evaluate(m)); await pg.screenshot(path='s24-zout-on.png')
        await pg.click('#tPers'); await pg.uncheck('#pSeasons'); await pg.wait_for_timeout(900)
        print('off',await pg.evaluate(m))
        await pg.screenshot(path='s24-off.png')
        await pg.check('#pSeasons'); await pg.wait_for_timeout(900)
        print('on again',await pg.evaluate(m))
        # zoomed-out fit check
        
        print('ERR',logs); await b.close()
        # mobile onboarding
        b = await p.chromium.launch(args=ARGS)
        for vw,vh in [(390,740),(390,667),(360,640)]:
            ctx = await b.new_context(viewport={'width':vw,'height':vh}, has_touch=True, device_scale_factor=2)
            pg = await ctx.new_page(); errs=[]
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(URL+'#onboarding'); await pg.wait_for_timeout(2500)
            # answer until habit step
            for t in ['Sophia','Duke freshman, recruiting for IB']:
                if await pg.query_selector('#obInput'):
                    await pg.fill('#obInput',t); await pg.press('#obInput','Enter'); await pg.wait_for_timeout(3000)
            await pg.screenshot(path=f's24-mob-{vw}x{vh}.png')
            ov = await pg.evaluate("""(()=>{const q=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom)]};return {ob:q('#obInput'),choices:q('.obChoices'),fig:q('#obFig, .obBot, #obBot'),next:q('#obNext'), sw:document.documentElement.scrollWidth}})()""")
            print(vw,vh,ov,errs)
            await ctx.close()
        await b.close()
asyncio.run(main())

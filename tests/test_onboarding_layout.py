import asyncio
from playwright.async_api import async_playwright
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
import pathlib
URL='file://'+str(pathlib.Path(__file__).resolve().parent.parent/'dist'/'site.html')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        for vw,vh in [(390,740),(360,640),(1360,820)]:
            ctx = await b.new_context(viewport={'width':vw,'height':vh}, has_touch=vw<500, device_scale_factor=1)
            pg = await ctx.new_page(); errs=[]
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(URL); await pg.wait_for_timeout(3300)
            await pg.click('text=Get Started'); await pg.wait_for_timeout(2600)
            await pg.click('#obChoices .pill'); await pg.wait_for_timeout(2600)
            await pg.click('text=Personalize'); await pg.wait_for_timeout(2800)
            await pg.click('#obChoices .cloudchip:nth-child(1)')
            await pg.fill('#obInput','sailing'); await pg.press('#obInput','Enter'); await pg.wait_for_timeout(700)
            await pg.screenshot(path=f's25-{vw}.png')
            ov = await pg.evaluate("""(()=>{const q=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom)]};return {input:q('#obInput'),choices:q('#obChoices'),chips:[...document.querySelectorAll('#obChoices .cloudchip')].length,otherBox:!!document.querySelector('.otherPill'),sw:document.documentElement.scrollWidth,bot:q('#obBot')||q('.obStage')}})()""")
            print(vw,vh,ov,errs)
            await ctx.close()
        await b.close()
asyncio.run(main())

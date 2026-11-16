import asyncio
from playwright.async_api import async_playwright
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
import pathlib
URL='file://'+str(pathlib.Path(__file__).resolve().parent.parent/'dist'/'site.html')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width':390,'height':780}, has_touch=True)
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL+'#onboarding'); await pg.wait_for_timeout(2500)
        await pg.fill('#obInput','skip everything'); await pg.press('#obInput','Enter'); await pg.wait_for_timeout(3000)
        await pg.screenshot(path='s26-cal.png')
        await pg.click('button:has-text("Month")'); await pg.wait_for_timeout(1200); await pg.screenshot(path='s26-month.png')
        await pg.click('#tAcct'); await pg.wait_for_timeout(500); await pg.screenshot(path='s26-acct.png')
        print(errs, await pg.evaluate("document.documentElement.scrollWidth"))
        await b.close()
asyncio.run(main())

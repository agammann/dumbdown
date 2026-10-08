import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';
const root = fileURLToPath(new URL('../', import.meta.url));
const native = process.argv.includes('--native');
const out = path.join(root, 'test-results', native ? 'native' : 'ordinary');
await mkdir(out, { recursive: true });
const runtime = await mkdtemp(path.join(tmpdir(), 'dumbdown-browser-'));
const port = Number(process.env.DUMBDOWN_TEST_PORT || 5213);
const origin = 'http://127.0.0.1:' + port;
const report = { checks: [], errors: [], console: [], nativeRequired: native, fallback: 'Browser plugin not available' };
let app, browser, log = '';
const fixture = { title: 'Return values', summary: 'A function without return yields undefined.', analogy: 'A delivery is scheduled, but no receipt is returned.', steps: [{title:'Start',explanation:'Start the request.'},{title:'Return',explanation:'Return undefined.'},{title:'Repair',explanation:'Return the promise separately.'}], terms: [{term:'undefined',meaning:'No return value.'}], example: 'Original:\n```js\nconsole.log(undefined);\n```\nCorrection:\n```js\nreturn fetch(url);\n```', caveats: ['Check the original source.'] };
try {
  app = spawn(process.execPath, ['--import', pathToFileURL(path.join(root, 'scripts/sites-env.mjs')).href, path.join(root, 'node_modules/wrangler/bin/wrangler.js'), 'dev', '--config', 'dist/server/wrangler.json', '--local', '--persist-to', path.join(runtime,'state'), '--ip', '127.0.0.1', '--port', String(port), '--inspector-port', '0'], { cwd: root, windowsHide: true, env: {...process.env, WRANGLER_SEND_METRICS:'false', WRANGLER_WRITE_LOGS:'false'}, stdio:['ignore','pipe','pipe'] });
  app.stdout.on('data', bytes => log += bytes); app.stderr.on('data', bytes => log += bytes);
  const deadline = Date.now() + 30000;
  while (true) {
    try { const response = await fetch(origin); if (response.status === 200) break; } catch { /* Wait only for this owned worker. */ }
    assert.equal(app.exitCode, null, log); assert(Date.now() < deadline, 'Compiled Worker startup timed out.'); await new Promise(resolve => setTimeout(resolve,100));
  }
  browser = await chromium.launch({headless:true,...(process.env.DUMBDOWN_BROWSER_EXECUTABLE?{executablePath:process.env.DUMBDOWN_BROWSER_EXECUTABLE}:native?{channel:'chrome'}:{}),args:native?['--enable-features=WebMCP,WebMCPTesting']:[]});
  report.browser = browser.version();
  const context = await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const page = await context.newPage(); page.on('pageerror',error=>report.errors.push(error.message));
  let mode='success', requests=[], delayed;
  page.on('console',message=>{if(message.type()==='error')report.console.push(message.text());});
  await page.route('**/api/explain/visitor',async route=>{
    requests.push(route.request().postDataJSON());
    if(mode==='pending')await new Promise(resolve=>delayed=resolve);
    await route.fulfill({status:mode==='failure'?429:200,contentType:'application/json',body:JSON.stringify(mode==='failure'?{error:'Controlled rate limit.'}:{explanation:fixture,model:'gpt-5.4'})}).catch(()=>{});
  });
  await page.goto(origin);assert.match(await page.title(),/^dumbdown/);await page.getByRole('heading',{name:/Less jargon/}).waitFor();assert.equal(await page.locator('vite-error-overlay').count(),0);
  assert.equal(await page.getByRole('button',{name:'OpenAI · your API key',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#visitor-key').inputValue(),'');assert.equal(await page.locator('#hosted-consent').isChecked(),false);assert.equal(requests.length,0);report.checks.push('Initial hosted mode requires a fresh key, consent and an explicit request.');
  const source=await page.locator('#source').inputValue();assert(source.length>10);
  await page.getByRole('button',{name:'OpenAI · your API key',exact:true}).click();
  await page.getByRole('button',{name:'Dumb it down',exact:true}).click();assert.equal(requests.length,0);report.checks.push('Missing key prevents a request.');
  const credentials=async()=>{await page.locator('#visitor-key').fill('sk-syntheticBrowserFixture1234567890');await page.locator('#hosted-consent').check();};
  await credentials();
  await page.locator('#source').fill('const number = 1;');
  await page.getByRole('button',{name:'Dumb it down',exact:true}).click();await page.getByRole('heading',{name:fixture.title,exact:true}).waitFor();
  assert.equal(requests[0].source,'const number = 1;');report.checks.push('Button result preserves exact input and renders the explanation.');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download',exact:true}).click();const d=await download;await d.saveAs(path.join(out,'explanation.md'));
  const markdown=await readFile(path.join(out,'explanation.md'),'utf8');assert(markdown.includes('````text\n'+fixture.example+'\n````'));assert(markdown.includes('## Keep in mind'));report.checks.push('Actual Markdown download preserves embedded fences.');
  if(native){
    await page.waitForFunction(async()=>typeof document.modelContext?.getTools==='function'&&(await document.modelContext.getTools()).some(t=>t.name==='dumbdown_explain'));
    const result=await page.evaluate(async newer=>{const tool=(await document.modelContext.getTools()).find(t=>t.name==='dumbdown_explain');const input={source:'const fromTool = 2;',kind:'code',level:'intermediate'};return await document.modelContext.executeTool(tool,newer?input:JSON.stringify(input));},Number(report.browser.split('.')[0])>=155);
    assert(JSON.stringify(result).includes(fixture.title));assert.equal(requests.at(-1).source,'const fromTool = 2;');report.nativeWebMCP={passed:true,names:['dumbdown_explain']};report.checks.push('Actual native execution uses selected hosted mode and visible result.');
  }
  mode='failure';await page.getByRole('button',{name:'Dumb it down',exact:true}).click();await page.getByRole('alert').waitFor();assert(await page.locator('.result-note').count());report.checks.push('Failed retry retains the previous-result notice.');
  mode='pending';await page.getByRole('button',{name:'Dumb it down',exact:true}).click();await page.getByRole('button',{name:'Cancel',exact:true}).waitFor();assert(await page.locator('#source').isDisabled());
  await page.getByRole('button',{name:'Cancel',exact:true}).click();delayed?.();mode='success';await page.waitForFunction(()=>document.querySelector('.result-panel')?.getAttribute('aria-busy')==='false');
  assert.equal(await page.locator('#visitor-key').inputValue(),'');assert.equal(await page.locator('#hosted-consent').isChecked(),false);report.checks.push('Cancellation clears key and consent and unlocks the source.');
  await credentials();await page.getByRole('button',{name:'Clear key',exact:true}).click();assert.equal(await page.locator('#visitor-key').inputValue(),'');
  await credentials();await page.reload();await page.getByRole('button',{name:'OpenAI · your API key',exact:true}).click();assert.equal(await page.locator('#visitor-key').inputValue(),'');assert.equal(await page.locator('#hosted-consent').isChecked(),false);report.checks.push('Clear and reload discard credentials.');
  const storage=await page.evaluate(async()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage),databases:await indexedDB.databases(),caches:await caches.keys()}));assert(Object.values(storage).every(items=>items.length===0));report.checks.push('Application storage remains empty before model downloads.');
  await credentials();await page.getByRole('button',{name:'On this device · experimental',exact:true}).click();const models=page.getByRole('combobox',{name:'Browser model',exact:true});assert.deepEqual(await models.locator('option').evaluateAll(options=>options.map(option=>option.value)),['Qwen3-1.7B-q4f16_1-MLC','Qwen3-4B-q4f16_1-MLC']);await models.selectOption('Qwen3-4B-q4f16_1-MLC');await models.selectOption('Qwen3-1.7B-q4f16_1-MLC');await page.getByRole('button',{name:'OpenAI · your API key',exact:true}).click();assert.equal(await page.locator('#visitor-key').inputValue(),'');assert.equal(await page.locator('#hosted-consent').isChecked(),false);report.checks.push('Both experimental Qwen choices remain selectable; switching mode clears credentials.');
  for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);await page.screenshot({path:path.join(out,'layout-'+width+'.png'),fullPage:true});}report.checks.push('Desktop and 390/320px layouts fit.');
  assert.deepEqual(report.errors,[]);assert(report.console.every(message=>message.includes('429 (Too Many Requests)')),'Unexpected browser console error.');report.status='passed';
}catch(error){report.status='failed';report.failure=error.message;throw error;}
finally{
  if(browser)await browser.close();
  if(app&&app.exitCode===null){if(process.platform==='win32')spawnSync('taskkill.exe',['/PID',String(app.pid),'/T','/F'],{windowsHide:true});else app.kill('SIGTERM');await new Promise(resolve=>{if(app.exitCode!==null)return resolve();app.once('exit',resolve);});}
  await writeFile(path.join(out,'worker.log'),log);await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');await rm(runtime,{recursive:true,force:true,maxRetries:8,retryDelay:250});console.log(JSON.stringify({status:report.status,browser:report.browser,checks:report.checks.length,native:report.nativeWebMCP?.passed,error:report.failure}));
}

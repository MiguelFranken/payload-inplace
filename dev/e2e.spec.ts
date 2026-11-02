import { test,expect } from '@playwright/test'
async function login(page:any,role='admin') {
 await page.goto('/admin/login');await page.getByLabel('Email').fill(`${role}@example.test`);await page.getByLabel('Password',{exact:true}).fill('synthetic-demo-password');await page.getByRole('button',{name:'Login',exact:true}).click();await expect(page).toHaveURL(/admin$/)
}
test('public browsing has no editor resources or bridge; unauthorized activation is denied',async({page,request})=>{
 const resources:string[]=[];page.on('request',r=>resources.push(r.url()))
 await page.goto('/pages/demo');await expect(page.getByRole('heading',{name:'A public synthetic page'})).toBeVisible()
 await expect(page.locator('[data-ve-block]')).toHaveCount(0)
 expect(resources.filter(url=>/visual-editor|activate/.test(url))).toEqual([])
 const response=await request.post('/api/visual-editor/activate',{headers:{Origin:'http://127.0.0.1:3127'},data:{collection:'pages',id:'fake',root:'layout'}});expect(response.status()).toBe(403)
})
for(const collection of ['pages','offers']) test(`native field draft/publish and structure: ${collection}`,async({page})=>{
 await login(page)
 const result=await page.request.get(`/api/${collection}?limit=1&depth=0`);const doc=(await result.json()).docs[0]
 await page.goto(`/admin/collections/${collection}/${doc.id}`)
 await page.getByRole('button',{name:'Open visual editor'}).click()
 const workspace=page.getByRole('region',{name:'Visual editor',exact:true})
 await expect(workspace).toBeVisible()
 const preview=page.frameLocator('iframe[title="Storefront preview"]')
 await expect(preview.getByRole('heading',{name:'A public synthetic page'})).toBeVisible()
 await preview.getByRole('heading',{name:'A public synthetic page'}).click()
 const inspector=page.getByRole('complementary',{name:'Block inspector'})
 const input=inspector.getByLabel('Heading',{exact:false}).first()
 await input.fill(`Edited ${collection}`)
 await workspace.getByRole('button',{name:'Save Draft',exact:true}).click()
 await expect(preview.getByRole('heading',{name:`Edited ${collection}`})).toBeVisible()
 const publicRead=await page.request.get(`/api/${collection}/${doc.id}?draft=false&depth=0`)
 const root=collection==='pages'?(await publicRead.json()).layout:(await publicRead.json()).detailPage.layout
 expect(root[0].heading).toBe('A public synthetic page')
 await workspace.getByRole('button',{name:/publish changes/i,exact:true}).click()
 await expect.poll(async()=>{const response=await page.request.get(`/api/${collection}/${doc.id}?draft=false&depth=0`);const d=await response.json();return (collection==='pages'?d.layout:d.detailPage.layout)[0].heading}).toBe(`Edited ${collection}`)
 await workspace.getByLabel('Viewport').selectOption('390px')
 await expect(page.locator('iframe')).toHaveCSS('width','390px')
 await page.screenshot({path:`test-results/${collection}-editor.png`,fullPage:true})
 await workspace.getByRole('button',{name:'Close editor'}).click();await expect(workspace).toHaveCount(0)
})

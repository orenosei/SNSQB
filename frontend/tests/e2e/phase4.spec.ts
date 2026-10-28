import { test, expect, signIn, openNavigation, ok } from "./fixtures";

test("conversation list, history and direct conversation creation", async ({page}) => {
  await page.route("**/api/v1/conversations**", async route => {
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith("/conversations")&&route.request().method()==="GET") return route.fulfill({json:ok({items:[{conversation_id:7,type:"DIRECT",display_name:"Bạn học",unread_count:2,last_message:{content:"Chào bạn"}}],pagination:{has_next:false}})});
    if(path.endsWith("/conversations/7/messages")) return route.fulfill({json:ok({conversation_id:7,conversation_type:"DIRECT",messages:[{message_id:51,sender_id:202,sender_name:"Bạn học",content:"Chào bạn",created_at:"2026-10-28T00:00:00Z"}],pagination:{has_next:false}})});
    if(path.endsWith("/conversations/direct")) return route.fulfill({status:201,json:ok({conversation_id:7,type:"DIRECT"})});
    throw new Error(`Unexpected ${route.request().method()} ${path}`);
  });
  await page.route("**/api/v1/search?**", route => route.fulfill({json:ok({items:[{type:"USER",user:{user_id:202,full_name:"Bạn học"}}],pagination:{has_next:false}})}));
  await page.route("**/api/v1/ws/**", route => route.fulfill({status:503,body:"Offline mock"}));
  await signIn(page); await openNavigation(page); await page.getByRole("link",{name:"Tin nhắn"}).click();
  await expect(page.getByRole("heading",{name:"Tin nhắn"})).toBeVisible();
  await page.getByRole("button",{name:/Bạn học/}).first().click();
  await expect(page.getByText("Chào bạn",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Soạn mới"}).click();
  await page.getByLabel("Tìm người để nhắn tin").fill("Bạn");
  const created=page.waitForRequest(req=>req.url().endsWith("/conversations/direct")&&req.method()==="POST");
  await page.getByRole("button",{name:"Bạn học",exact:true}).click();
  expect((await created).postDataJSON()).toEqual({target_user_id:202});
});

test("notifications badge and mark as read workflows",async({page})=>{
  let items=[{notification_id:91,title:"Bạn có lời mời kết bạn",body:"Từ bạn học",created_at:"2026-10-28T00:00:00Z"}];
  await page.route("**/api/v1/notifications**",async route=>{
    const path=new URL(route.request().url()).pathname;
    if(route.request().method()==="GET")return route.fulfill({json:ok({items,unread_count:items.filter(item=>!(item as {read_at?:string}).read_at).length,pagination:{has_next:false}})});
    if(path.endsWith("/notifications/91/read")){items=items.map(item=>({...item,read_at:"2026-10-28T01:00:00Z"}));return route.fulfill({json:ok({notification_id:91,read:true,unread_count:0})});}
    if(path.endsWith("/notifications/read-all")){items=items.map(item=>({...item,read_at:"2026-10-28T01:00:00Z"}));return route.fulfill({json:ok({unread_count:0})});}
    throw new Error(`Unexpected ${path}`);
  });
  await signIn(page); await openNavigation(page); await page.getByRole("link",{name:/Thông báo/}).last().click();
  await expect(page.getByText("Bạn có lời mời kết bạn")).toBeVisible();
  const read=page.waitForRequest(req=>req.url().endsWith("/notifications/91/read"));
  await page.getByRole("button",{name:"Đã đọc",exact:true}).click();await read;
  await expect(page.getByText("Bạn đã xem hết thông báo")).toBeVisible();
});

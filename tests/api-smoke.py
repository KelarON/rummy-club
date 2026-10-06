"""Run only against a LOCAL test server: python tests/api-smoke.py [http://127.0.0.1:4173]."""
import concurrent.futures
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
base=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:4173'
assert urllib.parse.urlparse(base).hostname in ('localhost','127.0.0.1'), 'Local test server only'
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def call(data=None,cookie='',path='/api/game'):
 req=urllib.request.Request(base+path,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json','Cookie':cookie})
 try:
  with opener.open(req,timeout=20) as r:return r.status,json.load(r),r.headers.get('Set-Cookie','').split(';')[0]
 except urllib.error.HTTPError as e:return e.code,json.load(e),''
def create(name,**settings):
 s,r,c=call({'action':'create','name':name,**settings});assert s==200,(s,r);return r,c
def read(code,cookie):
 s,r,_=call(cookie=cookie,path='/api/game?room='+code);assert s==200,(s,r);return r
def lobbies():
 s,r,_=call(path='/api/lobbies');assert s==200,(s,r);return r['lobbies']
def post(action,r,cookie,**extra):
 return call({'action':action,'code':r['code'],'version':r['version'],**extra},cookie)
private,cp=create('Private',isPublic=False,openingRule='classic')
public,ca=create('Public',isPublic=True,openingRule='shared');code=public['code']
listed={r['code']:r for r in lobbies()};assert code in listed and private['code'] not in listed
assert set(listed[code])=={'botCount','canJoin','code','expiresAt','host','isPublic','playerCount','openingRule','randomMode','replaceLeavers','status','turnSeconds'}
assert listed[code]['playerCount']==1 and listed[code]['openingRule']=='shared'
s,b,cb=call({'action':'join','name':'Second','code':code});assert s==200,(s,b)
assert b['openingRule']=='shared' and b['isPublic'] is True
public=read(code,ca)
s,_,_=post('start',public,cb);assert s==400
s,a,_=post('start',public,ca);assert s==200,(s,a)
assert code not in {r['code'] for r in lobbies()}
assert len(a['rack'])==14 and all(p['requiresOpening'] for p in a['players'])
s,_,_=post('draw',a,cb);assert s==400
s,a,_=post('draw',a,ca);assert s==200,(s,a)
assert a['lastDrawn'] is not None and a['lastDrawn'] in a['rack'] and not a['openingUnlocked']
b=read(code,cb);assert b['lastDrawn'] is None and all('lastDrawn' not in p and 'rack' not in p for p in b['players'])
s,b,_=post('draw',b,cb);assert s==200,(s,b)
assert b['openingUnlocked'] and all(not p['requiresOpening'] for p in b['players'])
a2=read(code,ca);assert a2['lastDrawn']==a['lastDrawn'] and a2['openingUnlocked']
with concurrent.futures.ThreadPoolExecutor() as executor:
 replies=list(executor.map(lambda _:post('draw',a2,ca),range(2)))
assert sum(s==200 for s,_,_ in replies)==1,replies
s,_,_=call({'action':'join','name':'Too late','code':code});assert s==400
s,invite,_=call(path='/api/game?room='+code);assert s==200 and invite['join'] and not invite['invite']['canJoin']
full,fc=create('Full',isPublic=True)
for name in ('B','C','D'):
 s,_,_=call({'action':'join','code':full['code'],'name':name});assert s==200
assert full['code'] not in {r['code'] for r in lobbies()}
s,_,_=call({'action':'join','code':full['code'],'name':'Fifth'});assert s==400
for invalid in ({'openingRule':'invalid'},{'isPublic':'true'}):
 s,_,_=call({'action':'create','name':'Bad',**invalid});assert s==400
# Existing clients that don't send settings retain private, classic rooms.
old,_=create('Legacy client');assert old['openingRule']=='classic' and old['isPublic'] is False
print('PASS: public/private/full/started lobbies, settings, hidden draws, shared opening, reconnect, turn ownership, concurrent actions, old-client defaults.')

# New room options and autonomous bot turns, through the built HTTP server.
assist,ac=create('Human',botCount=1,replaceLeavers=True,randomMode='easy')
assert assist['ownerId']==assist['me'] and sum(p['bot'] for p in assist['players'])==1
s,msg,_=post('chat',assist,ac,messageId='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',kind='text',content='Привет 😼');assert s==200 and msg['chat'][-1]['content']=='Привет 😼'
time.sleep(.75)
s,msg,_=post('chat',msg,ac,messageId='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',kind='sticker',content='coffee');assert s==200 and msg['chat'][-1]['kind']=='sticker'
s,assist,_=post('start',msg,ac);assert s==200 and assist['status']=='playing'
s,assist,_=post('draw',assist,ac);assert s==200
assert assist['players'][assist['turn']]['bot']
time.sleep(2.2)
assist=read(assist['code'],ac);assert assist['players'][assist['turn']]['id']==assist['me']
assert assist['poolCount']+sum(p['count'] for p in assist['players'])+sum(len(row) for row in assist['board'])==106
s,_,_=post('leave',assist,ac);assert s==200
s,_,_=call(cookie=ac,path='/api/game?room='+assist['code']);assert s==410
print('PASS: text/emoji/sticker chat, room bot settings, solo start, timed autonomous bot, tile conservation, last human closes room.')

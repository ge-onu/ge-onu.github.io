from pathlib import Path
import xml.etree.ElementTree as E
import base64
P=Path('assets/diagrams');S='http://www.w3.org/2000/svg';E.register_namespace('',S)
svg=E.Element('{'+S+'}svg',{'viewBox':'0 0 1320 1400','width':'1320','height':'1400','style':'background:#fff;color-scheme:light'})
mx=E.Element('mxfile',{'host':'Electron','type':'device'});diagram=E.SubElement(mx,'diagram',{'name':'Lab 12 topology','id':'infra-lab'});root=E.SubElement(E.SubElement(diagram,'mxGraphModel',{'grid':'0','page':'0'}),'root');E.SubElement(root,'mxCell',{'id':'0'});E.SubElement(root,'mxCell',{'id':'1','parent':'0'})
seq=0
COL={'service':'#326793','reply':'#207462','ha':'#765399','vpn':'#8b3546','manage':'#765399','observe':'#29747a'}
def add(tag,attrs,parent=svg,text=None):
 q=E.SubElement(parent,'{'+S+'}'+tag,{k:str(v) for k,v in attrs.items()});q.text=text;return q
def cell(id,value,x,y,w,h,style):
 c=E.SubElement(root,'mxCell',{'id':id,'value':value,'vertex':'1','parent':'1','style':style});E.SubElement(c,'mxGeometry',{'x':str(x),'y':str(y),'width':str(w),'height':str(h),'as':'geometry'})
def text(x,y,s,size=14,center=False,bold=False):
 return add('text',{'x':x,'y':y,'font-family':'Arial, sans-serif','font-size':size,'fill':'#182634','font-weight':600 if bold else 400,'text-anchor':'middle' if center else 'start'},text=s)
def label(id,x,y,s,size=13):
 text(x,y,s,size);cell(id,s,x,y-15,500,22,f'fillColor=none;strokeColor=none;align=left;fontColor=#182634;fontSize={size};')
def uri(name):
 raw=(P/name).read_bytes()
 if name in ['ubuntu.svg','nginx.svg','wireguard.svg']:
  raw=raw.replace(b'<svg ',('<svg fill="'+{'ubuntu.svg':'#e95420','nginx.svg':'#009639','wireguard.svg':'#88171a'}[name]+'" ').encode())
 if name=='rsyslog.png':
  b=base64.b64encode(raw).decode();raw=f'<svg xmlns="{S}" viewBox="0 60 192 72"><image width="192" height="192" href="data:image/png;base64,{b}"/></svg>'.encode();name='rsyslog.svg'
 mime={'svg':'image/svg+xml','png':'image/png','gif':'image/gif'}[name.split('.')[-1]];return 'data:'+mime+';base64,'+base64.b64encode(raw).decode()
def logo(id,name,x,y,w=100,h=30):
 u=uri(name);add('image',{'x':x,'y':y,'width':w,'height':h,'href':u,'preserveAspectRatio':'xMidYMid meet'});cell(id,'',x,y,w,h,'shape=image;image='+u.replace(';base64','')+';imageAspect=1;')
ICONS={'person':'<circle cx="16" cy="9" r="6"/><path d="M4 30v-4c0-12 24-12 24 0v4Z"/>','host':'<rect x="3" y="3" width="26" height="19" rx="2"/><path d="M9 29h14M16 22v7"/>','log':'<path d="M6 2h14l6 6v22H6Z M20 2v7h6M10 14h12M10 20h12M10 26h8"/>','storage':'<ellipse cx="16" cy="6" rx="12" ry="4"/><path d="M4 6v20c0 7 24 7 24 0V6M4 16c0 7 24 7 24 0"/>','router':'<rect x="2" y="8" width="28" height="19" rx="3"/><path d="M8 8V2m16 6V2M8 15h16M8 21h3m5 0h8"/>'}
def icon(id,kind,x,y,size=30):
 raw=f'<svg xmlns="{S}" width="32" height="32" viewBox="0 0 32 32"><g fill="none" stroke="#244859" stroke-width="1.8" stroke-linejoin="round">{ICONS[kind]}</g></svg>';u='data:image/svg+xml;base64,'+base64.b64encode(raw.encode()).decode();add('image',{'x':x,'y':y,'width':size,'height':size,'href':u});cell(id,'',x,y,size,size,'shape=image;image='+u.replace(';base64','')+';imageAspect=1;')
def zone(id,title,x,y,w,h,fill='#f5f8fc',color='#7693aa'):
 add('rect',{'x':x,'y':y,'width':w,'height':h,'rx':8,'fill':fill,'stroke':color,'stroke-width':1.2});text(x+16,y+27,title,15,bold=True);cell(id,title,x,y,w,h,f'rounded=1;arcSize=8;fillColor={fill};strokeColor={color};align=left;verticalAlign=top;spacing=16;fontColor=#182634;fontSize=15;')
def node(id,title,sub,x,y,w=200,h=100,brand=None,kind=None,color='#7693aa'):
 add('rect',{'x':x,'y':y,'width':w,'height':h,'rx':8,'fill':'#fff','stroke':color,'stroke-width':1.3})
 if brand:
  lw=32 if brand in ['ubuntu.svg','nginx.svg','wireguard.svg','prometheus-logo.svg'] else 110;logo(id+'-logo',brand,x+(w-lw)/2,y+14,lw,30)
 elif kind:icon(id+'-icon',kind,x+(w-30)/2,y+14)
 ty=y+61 if brand or kind else y+43
 text(x+w/2,ty,title,16,True,True)
 if sub:text(x+w/2,ty+21,sub,12,True)
 cell(id,title+'\n'+sub,x,y,w,h,f'rounded=1;arcSize=8;fillColor=#ffffff;strokeColor={color};align=center;verticalAlign=bottom;spacingBottom=13;fontColor=#182634;fontSize=16;')
def edge(id,pts,color='service',both=False,flow=True,end=True):
 c=COL.get(color,color);attrs={'d':'M '+' L '.join(f'{x} {y}' for x,y in pts),'fill':'none','stroke':c,'stroke-width':1.7,'marker-end':f'url(#{color})' if end else 'none','class':'flow' if flow else ''}
 if both:attrs['marker-start']=f'url(#{color})'
 if flow:attrs['stroke-dasharray']='4 5'
 add('path',attrs)
 m=E.SubElement(root,'mxCell',{'id':id,'edge':'1','parent':'1','style':f'strokeColor={c};strokeWidth=1.7;endArrow={"block" if end else "none"};startArrow={"block" if both else "none"};dashed={1 if flow else 0};'});g=E.SubElement(m,'mxGeometry',{'relative':'1','as':'geometry'});E.SubElement(g,'mxPoint',{'x':str(pts[0][0]),'y':str(pts[0][1]),'as':'sourcePoint'});E.SubElement(g,'mxPoint',{'x':str(pts[-1][0]),'y':str(pts[-1][1]),'as':'targetPoint'});a=E.SubElement(g,'Array',{'as':'points'})
 for x,y in pts[1:-1]:E.SubElement(a,'mxPoint',{'x':str(x),'y':str(y)})
def pair(id,pts):
 edge(id+'-request',pts)
 edge(id+'-reply',[(x,y+8) for x,y in reversed(pts)],'reply')
def mini(id,title,x,y,kind='host',w=88):
 add('rect',{'x':x,'y':y,'width':w,'height':67,'rx':6,'fill':'#fff','stroke':'#91a6ab'});icon(id+'-icon',kind,x+(w-24)/2,y+12,24);text(x+w/2,y+55,title,12,True,True);cell(id,title,x,y,w,67,'rounded=1;arcSize=8;fillColor=#fff;strokeColor=#91a6ab;align=center;verticalAlign=bottom;spacingBottom=9;fontColor=#182634;fontSize=12;')
defs=add('defs',{})
for k,c in COL.items():
 m=add('marker',{'id':k,'viewBox':'0 0 10 10','refX':9,'refY':5,'markerWidth':5,'markerHeight':5,'orient':'auto-start-reverse'},defs);add('path',{'d':'M0 0 10 5 0 10Z','fill':c},m)
label('title',20,28,'Lab 12 · 서비스 경로와 운영 경로',18)
label('legend',20,53,'파랑: 요청   초록: 응답   보라: HA / 관리   빨강: VPN   ·   A active / B standby는 역할 예시')
zone('wan','WAN',20,78,220,622)
zone('routing','ROUTER HA',260,78,240,622,'#f8f5fc','#9176aa')
zone('dmz','DMZ · SERVICE',520,78,540,622,'#f3f7ff','#7594bc')
zone('internal','INTERNAL',1080,78,220,622,'#f2f8f5','#709585')
node('client','External Client','HTTPS 요청 / 응답',30,154,200,100,kind='person')
node('router-a','Router A · active','Ubuntu · nftables',280,154,200,100,brand='ubuntu.svg')
node('router-b','Router B · standby','Ubuntu · nftables',280,364,200,100,brand='ubuntu.svg')
edge('router-ha',[(380,254),(380,364)],'ha',both=True,flow=False)
label('router-ha-label',392,303,'VRRP');label('router-sync',392,325,'sync group',12)
logo('router-keepalived','keepalived.png',322,492,116,45);label('router-keep-label',292,560,'Keepalived · gateway VIPs')
node('vip','Service VIP','LB의 서비스 주소',690,154,200,100)
pair('client-router',[(230,198),(280,198)])
pair('router-service',[(480,198),(690,198)])
label('https',527,187,'HTTPS',12)
edge('router-failover',[(480,414),(507,414),(507,233),(690,233)],'ha',flow=False)
node('lb-a','Load Balancer A','HAProxy · active',560,339,200,100,brand='haproxy.png')
node('lb-b','Load Balancer B','HAProxy · standby',830,339,200,100,brand='haproxy.png')
edge('vip-a',[(790,254),(790,289),(660,289),(660,339)],both=True)
edge('vip-b',[(790,289),(930,289),(930,339)],'ha',flow=False)
label('lb-ha-label',677,319,'Keepalived · VRRP',12)
edge('lb-ha',[(760,393),(830,393)],'ha',both=True,flow=False)
node('back-a','Backend A · dmz01','nginx · HTTP',560,529,200,100,brand='nginx.svg')
node('back-b','Backend B · dmz02','nginx · HTTP',830,529,200,100,brand='nginx.svg')
edge('lb-pool',[(660,439),(660,478)],end=False)
edge('lb-b-pool',[(930,439),(930,478)],'ha',flow=False,end=False)
edge('pool-a',[(660,478),(660,529)],both=True)
edge('pool-b',[(660,478),(930,478),(930,529)],both=True)
label('http-label',695,511,'HTTP 요청 / 응답 · round-robin',12)
label('bind-note',680,658,'dmz01: BIND9 authoritative DNS',13);label('bind-scope',680,680,'infralab.example · recursion off',12)
node('dns','DNS Resolver A / B','Unbound · dns01 / dns02',1090,154,200,100,brand='unbound.svg')
label('ntp',1092,283,'chrony: dns01만 사용',12);label('dns-vip',1092,305,'DNS VIP 없음',12)
node('nfs','NFS shared storage','NFSv4.2 · AUTH_SYS',1090,529,200,100,kind='storage')
edge('nfs-a',[(660,629),(660,690),(1073,690),(1073,579),(1090,579)],'reply')
edge('nfs-b',[(930,629),(930,690)],'reply',end=False)
# VPN is a separate logical path so it is not confused with public HTTPS routing.
zone('vpn','VPN · 별도 접속 경로',20,722,1280,174,'#fcf5f6','#ac7c85')
node('vpn-client','External Client','WireGuard peer · ext01',40,772,200,100,kind='person')
node('vpn-endpoint','Router HA endpoint','rtr01 / rtr02 · 공용 identity',545,772,230,100,brand='wireguard.svg')
node('vpn-target','허용된 내부 서비스','라우팅 · 방화벽 정책 적용',1050,772,230,100,kind='host')
edge('vpn-tunnel',[(240,822),(545,822)],'vpn',both=True);text(392.5,811,'WireGuard · UDP 51820',12,True)
edge('vpn-inside',[(775,822),(1050,822)],'vpn',both=True);text(912.5,811,'터널 내부 요청 / 응답',12,True)
# Compact side-by-side operational panels.
zone('management','MANAGEMENT · SSH 관리',20,918,625,455,'#f8f5fc','#9176aa')
zone('observability','OBSERVABILITY · 로그 / 메트릭',665,918,635,350,'#f0f8f8','#6b979b')
node('bastion','Bastion · OpenSSH','SSH User CA · ProxyJump',230,966,200,100,brand='openssh.gif')
edge('ssh-targets',[(330,1066),(330,1117)],'manage');label('ssh-rule',352,1095,'PermitOpen 허용 대상',12)
zone('managed-group','관리 대상',45,1117,575,211,'#fcfbfe','#b9a8c8')
for i,(name,kind) in enumerate([('Router','router'),('LB','host'),('Backend','host'),('DNS','host'),('NFS','storage'),('Log','log'),('Monitoring','host')]):
 mini('managed-'+str(i),name,65+(i%4)*137,1162+(i//4)*82,kind,112)
label('ssh-note',45,1352,'대상별 SSH 인증 정책을 적용했습니다.',13)

# host collection makes log sources and metric targets concrete, without new hosts.
label('host-caption',690,960,'수집 대상 · 내부 호스트',13)
for i,(name,kind) in enumerate([('Router','router'),('LB','host'),('Backend','host'),('DNS','host'),('NFS','storage')]):mini('observed-'+str(i),name,691+i*119,979,kind,104)
node('log','Central Log · rsyslog','TCP 514 · logrotate',695,1150,250,100,brand='rsyslog.png')
node('mon','Monitoring','Prometheus · Alertmanager',1020,1150,250,100,brand='prometheus-logo.svg')
edge('host-bus',[(743,1070),(1219,1070)],'observe',flow=False,end=False)
for i in range(5):edge('host-branch-'+str(i),[(743+i*119,1046),(743+i*119,1070)],'observe',flow=False,end=False)
edge('push',[(825,1070),(825,1150)],'observe');label('push-label',838,1114,'로그 push',12)
edge('pull',[(1145,1150),(1145,1070)],'observe');label('pull-label',1158,1114,'pull / probe',12)


label('scope',20,1394,'논리 구조 · 주소 생략 · 선의 이동은 실시간 트래픽이 아님',12)
E.ElementTree(svg).write(P/'infrastructure-lab-series.svg',encoding='utf-8',xml_declaration=True)
add('style',{},text='@keyframes flow{to{stroke-dashoffset:-27}} .flow{animation:flow 1.8s linear infinite}')
E.ElementTree(svg).write(P/'infrastructure-lab-series-animated.svg',encoding='utf-8',xml_declaration=True)
E.ElementTree(mx).write(P/'infrastructure-lab-series.drawio',encoding='utf-8',xml_declaration=True)
print('Rebuilt explicit HA, request/reply, VPN and compact operations panels.')



# Publish compact, independently animated views for the tabbed architecture.
import copy
mascot='data:image/png;base64,'+base64.b64encode(Path('assets/chat-mascot.png').read_bytes()).decode()
views=[
 ('service','0 65 1320 645','M 230 198 L 480 198 L 790 198 L 790 289 L 660 289 L 660 478 L 930 478 L 930 529 L 930 478 L 660 478 L 660 289 L 790 289 L 790 206 L 230 206',18),
 ('vpn','0 712 1320 194','M 140 822 L 660 822 L 1165 822 L 660 822 L 140 822',12),
 ('operations','0 908 1320 474',None,0)
]
for name,view,path,duration in views:
 tab=copy.deepcopy(svg);tab.set('viewBox',view);tab.set('width','1320');tab.set('height',view.split()[-1])
 if path:
  traveler=E.SubElement(tab,'{'+S+'}g',{'aria-label':'거누가 요청과 응답 방향을 안내합니다'})
  E.SubElement(traveler,'{'+S+'}circle',{'r':'17','fill':'#fff','stroke':'#182634','stroke-width':'1.3'})
  E.SubElement(traveler,'{'+S+'}image',{'x':'-15','y':'-15','width':'30','height':'30','href':mascot})
  E.SubElement(traveler,'{'+S+'}animateMotion',{'path':path,'dur':str(duration)+'s','repeatCount':'indefinite','calcMode':'paced'})
 E.ElementTree(tab).write(P/('infrastructure-lab-'+name+'.svg'),encoding='utf-8',xml_declaration=True)

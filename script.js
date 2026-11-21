'use strict';
/* ==========================================================
   KosManager – script.js
   Vanilla JS. Data di LocalStorage. Akun baru mulai KOSONG:
   owner mengisi profil, tipe kamar + harga, kamar, penghuni sendiri.
   ========================================================== */
const KEY='kosmanager_v1',USER_KEY_PREFIX='kosmanager_v1_user_',LEGACY_MIGRATION_KEY='kosmanager_legacy_migrated_to',$=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const DEF_TPL={
  reminder:'Halo {nama}, kami ingin mengingatkan bahwa pembayaran sewa kamar {kamar} sebesar {jumlah} akan jatuh tempo pada tanggal {jatuh_tempo}. Mohon melakukan pembayaran tepat waktu. Terima kasih atas perhatian dan kerja samanya.\n\nHormat kami,\n{nama_kos}',
  overdue:'Halo {nama}, pembayaran sewa kamar {kamar} sebesar {jumlah} sudah melewati jatuh tempo ({jatuh_tempo}). Mohon segera melakukan pembayaran. Jika sudah membayar, abaikan pesan ini. Terima kasih.\n\nHormat kami,\n{nama_kos}',
  paid:'Halo {nama}, pembayaran sewa kamar {kamar} sebesar {jumlah} sudah kami terima. Terima kasih atas pembayarannya.\n\nHormat kami,\n{nama_kos}',
  announce:'Halo {nama}, ada pengumuman dari {nama_kos}:\n\n(tulis pengumuman di sini)\n\nTerima kasih.'};
const fresh=()=>({profile:null,types:[],rooms:[],residents:[],bills:[],expenses:[],reminders:[],templates:{...DEF_TPL},lang:'id',fontSize:'medium',seq:0,plan:{tier:'free',until:'',waMonth:'',waCount:0},cloudDeleted:{room_types:[],rooms:[],residents:[],bills:[],expenses:[]},cloudBase:null});
function loadForUser(uid){try{const raw=localStorage.getItem(USER_KEY_PREFIX+uid);if(raw){const d=JSON.parse(raw);return d&&Array.isArray(d.rooms)?{...fresh(),...d}:fresh()}return fresh()}catch{return fresh()}}
let activeUser=null,db=fresh(),lang='id',cur='dashboard',chart=null,curBill=null,remCtx=null,bulk={q:[],i:0,log:null};
let cloudReady=false,cloudSyncRunning=false,cloudSyncQueued=false,cloudSyncTimer=null;
function save(){
  if(!activeUser)return;
  if(cloudReady)normalizeCloudIds();
  try{localStorage.setItem(USER_KEY_PREFIX+activeUser.id,JSON.stringify(db))}
  catch{toast('Penyimpanan penuh. Ekspor cadangan lalu kurangi foto.','error')}
  if(cloudReady)queueCloudSync();
}

/* ---------- Bahasa (ID default, EN sebagian) ---------- */
const EN={nav_dashboard:'Dashboard',nav_residents:'Residents',nav_rooms:'Rooms',nav_payments:'Payments',nav_expenses:'Expenses',nav_reports:'Reports',nav_settings:'Settings',dash_sub:'Summary of your boarding house this month',qa_resident:'Add Resident',qa_room:'Add Room',qa_payment:'Record Payment',qa_expense:'Add Expense',qa_report:'Create Report',gs_title:'Start here',gs_1:'Set room types and prices in Settings',gs_2:'Add rooms in the Rooms menu',gs_3:'Add residents and pick their rooms',st_rooms:'Total Rooms',st_occupied:'Occupied Rooms',st_vacant:'Vacant Rooms',st_occupancy:'Occupancy Rate',st_income:'Income This Month',st_expense:'Total Expenses',st_arrears:'Outstanding Payments',st_net:'Net Cash Flow',chart_title:'Income & Expenses',per_7d:'Last 7 days',per_month:'This month',per_6m:'Last 6 months',per_1y:'Last 1 year',recent_pay:'Recent Payments',need_remind:'Needs a Reminder',bulk_btn:'Bulk reminders',f_all:'All statuses',s_paid:'Paid',s_unpaid:'Unpaid',s_overdue:'Overdue',room_types_link:'Set types & prices',r_occupied:'Occupied',r_available:'Available',tab_bills:'Bills',tab_reminders:'Reminder History',th_inv:'Invoice No.',th_resident:'Resident',th_room:'Room',th_period:'Period',th_amount:'Amount',th_due:'Due Date',th_status:'Status',th_action:'Action',th_date:'Date',th_name:'Name',th_category:'Category',th_method:'Method',save:'Save',cancel:'Cancel',close:'Close',print:'Print',set_profile:'Boarding House Profile',set_types:'Room Types & Prices',set_wa:'WhatsApp Templates',set_lang:'Language',set_data:'Data',rep_income:'Income Report',rep_expense:'Expense Report',rep_cash:'Cash Flow Report',rep_occ:'Residents & Rooms Report',rp_today:'Today',rp_week:'This week',rp_month:'This month',rp_last:'Previous month',rp_custom:'Custom range',data_export:'Export backup',data_import:'Import backup',data_reset:'Reset all data',err_req:'Required',none:'No data yet.',send_rem:'Send Reminder',btn_detail:'Details',btn_edit:'Edit',btn_pay:'Mark as Paid',btn_receipt:'Receipt',btn_remind:'Remind',f_all_cat:'All categories',f_all_type:'All types',thanks:'Thank you for your payment.',inc_s:'Income',exp_s:'Expenses',sort_name:'Sort: Name',sort_due:'Sort: Due date',sort_rent:'Sort: Rent',rem_note:'Messages open in WhatsApp and must still be sent manually by the owner.',exp_total:'Total shown:',th_template:'Message Type',th_opened:'Opened',th_confirmed:'Confirmed',print_receipt:'Print Receipt',share_wa:'Share via WhatsApp',download_pdf:'Download PDF',f_fullname:'Full Name',f_phone:'Phone / WhatsApp Number',f_room:'Room',f_rent:'Monthly Rent',f_start:'Move-in Date',f_dueday:'Due Day Each Month',f_photo:'Photo (optional)',f_room_no:'Room Number',f_type:'Room Type',f_facilities:'Facilities',f_paydate:'Payment Date',f_method:'Payment Method',f_exp_name:'Expense Name',f_category:'Category',f_cost:'Expense Amount',f_date:'Date',f_note:'Notes',f_template:'Message Type',f_message:'Message',m_res_add:'Add Resident',m_res_detail:'Resident Details',m_room_add:'Add Room',m_room_detail:'Room Details',m_pay:'Mark as Paid',m_receipt:'Payment Receipt',m_exp_add:'Add Expense',m_rem:'Send Reminder',m_bulk:'Bulk Reminders',pay_confirm:'Confirm Payment',mark_sent:'Marked as sent',mark_sent_next:'Sent, continue',bulk_desc:'Select residents to remind. Messages open one at a time and must be sent manually in WhatsApp.',select_all:'Select all',bulk_start:'Start queue',skip:'Skip',yes:'Yes, continue',set_types_desc:'Define room types and rental prices. Prices can still be adjusted for each room and resident.',f_type_name:'Room Type Name',type_save:'Save room type',set_wa_desc:'Available placeholders: {nama}, {kamar}, {jumlah}, {jatuh_tempo}, {nama_kos}',tpl_reminder:'Payment reminder',tpl_overdue:'Overdue notice',tpl_paid:'Payment confirmation',tpl_announce:'General announcement',tpl_reset:'Restore defaults',f_logo:'Boarding house logo',f_info:'Additional information'};
const ZH={
 nav_dashboard:'仪表板',nav_residents:'住户',nav_rooms:'房间',nav_payments:'付款',nav_expenses:'支出',nav_reports:'报表',nav_settings:'设置',
 dash_sub:'本月出租房屋概况',qa_resident:'添加住户',qa_room:'添加房间',qa_payment:'记录付款',qa_expense:'添加支出',qa_report:'生成报表',
 gs_title:'从这里开始',gs_1:'在设置中配置房间类型和价格',gs_2:'在房间菜单中添加房间',gs_3:'添加住户并为其选择房间',
 st_rooms:'房间总数',st_occupied:'已入住',st_vacant:'空置房间',st_occupancy:'入住率',st_income:'本月收入',st_expense:'总支出',st_arrears:'未付账款',st_net:'净现金流',
 chart_title:'收入与支出',per_7d:'最近 7 天',per_month:'本月',per_6m:'最近 6 个月',per_1y:'最近 1 年',recent_pay:'最近付款',need_remind:'需要提醒',bulk_btn:'批量提醒',
 f_all:'所有状态',s_paid:'已付清',s_unpaid:'未付款',s_overdue:'已逾期',room_types_link:'设置类型和价格',r_occupied:'已入住',r_available:'可用',tab_bills:'账单',tab_reminders:'提醒记录',
 th_inv:'账单编号',th_resident:'住户',th_room:'房间',th_period:'期间',th_amount:'金额',th_due:'到期日',th_status:'状态',th_action:'操作',th_date:'日期',th_name:'名称',th_category:'类别',th_method:'方式',
 save:'保存',cancel:'取消',close:'关闭',print:'打印',set_profile:'出租房屋资料',set_types:'房间类型和价格',set_wa:'WhatsApp 消息模板',set_lang:'语言',set_data:'数据',
 rep_income:'收入报表',rep_expense:'支出报表',rep_cash:'现金流报表',rep_occ:'住户和房间报表',rp_today:'今天',rp_week:'本周',rp_month:'本月',rp_last:'上个月',rp_custom:'自定义日期范围',
 data_export:'导出备份',data_import:'导入备份',data_reset:'重置所有数据',err_req:'必填项',none:'暂无数据。',send_rem:'发送提醒',btn_detail:'详情',btn_edit:'编辑',btn_pay:'标记为已付款',btn_receipt:'收据',btn_remind:'提醒',
 f_all_cat:'所有类别',f_all_type:'所有类型',thanks:'感谢您的付款。',inc_s:'收入',exp_s:'支出',
 setup_title:'欢迎！创建您的出租房屋账户',setup_desc:'目前没有数据。请先填写房屋资料，然后设置房间类型、价格、房间和住户。',f_owner:'业主姓名',f_kos:'出租房屋名称',f_address:'房屋地址',f_kos_wa:'房屋 WhatsApp 号码',setup_btn:'开始管理',
 f_fullname:'全名',f_phone:'电话 / WhatsApp 号码',f_room:'房间',f_rent:'月租金',f_start:'入住日期',f_dueday:'每月到期日',f_photo:'照片（可选）',f_room_no:'房间号',f_type:'房间类型',f_price:'月租价格',f_facilities:'设施',
 f_exp_name:'支出名称',f_category:'类别',f_cost:'费用金额',f_date:'日期',f_note:'备注',f_paydate:'付款日期',f_template:'消息类型',f_message:'消息内容',
 m_res_add:'添加住户',m_res_detail:'住户详情',m_room_add:'添加房间',m_room_detail:'房间详情',m_pay:'标记为已付款',m_receipt:'付款凭证',m_exp_add:'添加支出',m_rem:'发送提醒',m_bulk:'批量提醒',
 set_wa_desc:'可用占位符：{nama}, {kamar}, {jumlah}, {jatuh_tempo}, {nama_kos}',tpl_reminder:'付款提醒',tpl_overdue:'逾期通知',tpl_paid:'付款确认',tpl_announce:'一般公告',tpl_reset:'恢复默认',
 pay_confirm:'确认付款',print_receipt:'打印收据',share_wa:'通过 WhatsApp 分享',download_pdf:'下载 PDF',open_wa:'打开 WhatsApp',mark_sent:'已发送',mark_sent_next:'已发送，继续',bulk_desc:'选择需要提醒的住户。消息将逐条打开，请自行通过 WhatsApp 发送。',select_all:'全选',bulk_start:'开始队列',skip:'跳过',yes:'是，继续',sort_name:'按姓名排序',sort_due:'按到期日排序',sort_rent:'按租金排序',rem_note:'消息将在 WhatsApp 中打开，业主仍需手动发送。',exp_total:'显示总额：',th_template:'消息类型',th_opened:'已打开',th_confirmed:'已确认',f_fullname:'全名',f_phone:'电话 / WhatsApp 号码',f_start:'入住日期',f_dueday:'每月到期日',f_logo:'房屋标志',f_info:'其他信息',f_type_name:'房间类型名称',type_save:'保存房间类型',set_types_desc:'设置房间类型和租金。每个房间和住户的价格仍可单独调整。'
};
const LANGS={id:{},en:EN,zh:ZH};
const t=(k,d)=>(LANGS[lang]?.[k])||d;
const CAT={electricity:['Listrik','Electricity','电费'],water:['Air','Water','水费'],internet:['Internet/Wi-Fi','Internet/Wi-Fi','网络费'],cleaning:['Kebersihan','Cleaning','清洁费'],maintenance:['Perawatan kamar','Room maintenance','房间维护'],repair:['Perbaikan fasilitas','Facility repair','设施维修'],salary:['Gaji petugas','Staff salary','员工工资'],tax:['Pajak dan administrasi','Tax & admin','税费和管理费'],other:['Lainnya','Other','其他']};
const MET={cash:['Tunai','Cash','现金'],transfer:['Transfer bank','Bank transfer','银行转账'],qris:['QRIS','QRIS','QRIS']};
const TPN={reminder:['Pengingat pembayaran','Payment reminder','付款提醒'],overdue:['Pemberitahuan keterlambatan','Late notice','逾期通知'],paid:['Konfirmasi pembayaran','Payment confirmation','付款确认'],announce:['Pengumuman umum','Announcement','一般公告']};
const SL={PAID:['Sudah Lunas','Paid','已付清'],UNPAID:['Belum Dibayar','Unpaid','未付款'],OVERDUE:['Terlambat','Overdue','已逾期']},SC={PAID:'success',UNPAID:'warning',OVERDUE:'danger'};
const RL={TERISI:['Terisi','Occupied','已入住'],TERSEDIA:['Tersedia','Available','可用']};
const lb=(m,k)=>m[k]?m[k][lang==='id'?0:lang==='zh'?2:1]:k;
const badge=s=>`<span class="badge badge-${SC[s]}">${lb(SL,s)}</span>`;
function applyLang(){
  $$('[data-i18n]').forEach(e=>{e.dataset.o??=e.textContent;e.textContent=t(e.dataset.i18n,e.dataset.o)});
  $$('[data-i18n-ph]').forEach(e=>{e.dataset.o??=e.placeholder;e.placeholder=t(e.dataset.i18n+'__ph',e.dataset.o)});
  document.documentElement.lang=lang==='zh'?'zh-CN':lang;
}
const FONT_SIZES={small:'Kecil',medium:'Sedang',large:'Besar'};
const FONT_SCALE={small:.875,medium:1,large:1.125};
function applyFontSize(size=db.fontSize||'medium',persist=false){
  if(!FONT_SIZES[size])size='medium';
  db.fontSize=size;
  document.documentElement.dataset.fontSize=size;
  if(window.Chart&&Chart.defaults?.font){Chart.defaults.font.size=Math.round(12*FONT_SCALE[size]);if(chart)chart.update();}
  $$('.font-size-option').forEach(btn=>{
    const active=btn.dataset.fontSize===size;
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-pressed',String(active));
  });
  const hint=$('#fontSizeHint');
  if(hint)hint.textContent=`Ukuran font saat ini: ${FONT_SIZES[size]}`;
  if(persist)save();
}

function fillSelects(){$$('[data-fill]').forEach(s=>{const v=s.value,m={categories:CAT,methods:MET,templates:TPN}[s.dataset.fill];
  s.innerHTML=(s.dataset.all?`<option value="">${t('f_all_cat','Semua kategori')}</option>`:'')+Object.keys(m).map(k=>`<option value="${k}">${lb(m,k)}</option>`).join('');if(v)s.value=v})}
function setLang(l){if(!['id','en','zh'].includes(l))l='id';lang=db.lang=l;save();applyLang();fillSelects();if($('#langSelect'))$('#langSelect').value=l;if($('#langSetting'))$('#langSetting').value=l;if(db.profile)refresh()}

/* ---------- Helper ---------- */
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6),pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,today=()=>iso(new Date()),pd=s=>new Date(s+'T00:00:00'),ym=s=>s.slice(0,7);
const loc=()=>lang==='en'?'en-GB':lang==='zh'?'zh-CN':'id-ID',rp=n=>'Rp '+Math.round(n||0).toLocaleString('id-ID');
const fd=s=>s?pd(s).toLocaleDateString(loc(),{day:'2-digit',month:'short',year:'numeric'}):'-';
const per=p=>new Date(p+'-01T00:00:00').toLocaleDateString(loc(),{month:'long',year:'numeric'});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sum=a=>a.reduce((x,y)=>x+y,0),addDays=(s,n)=>{const d=pd(s);d.setDate(d.getDate()+n);return iso(d)};
const dueOf=(p,day)=>{const[y,m]=p.split('-').map(Number);return `${p}-${pad(Math.min(day,new Date(y,m,0).getDate()))}`};
const nextYm=p=>{const[y,m]=p.split('-').map(Number),d=new Date(y,m,1);return `${d.getFullYear()}-${pad(d.getMonth()+1)}`};
const icons=()=>window.lucide&&lucide.createIcons(),ic=n=>`<i data-lucide="${n}"></i>`;
const openDlg=id=>{const d=$('#'+id);if(d){d.open||d.showModal();icons()}};
const EMP={res:['Belum ada penghuni','Tambahkan kamar dulu, lalu daftarkan penghuni pertamamu.'],room:['Belum ada kamar','Atur tipe kamar di Pengaturan, lalu tambahkan kamar.'],bill:['Belum ada tagihan','Tagihan dibuat otomatis tiap bulan setelah ada penghuni.'],rem:['Belum ada riwayat pengingat','Riwayat muncul setelah kamu membuka WhatsApp dari tombol pengingat.'],exp:['Belum ada pengeluaran','Catat biaya listrik, air, kebersihan, dan lainnya.'],pay:['Belum ada pembayaran','Pembayaran yang dicatat akan muncul di sini.'],due:['Tidak ada yang perlu diingatkan','Penghuni yang jatuh tempo dalam 3 hari muncul di sini.']};
const emp=k=>`<div class="empty"><h4>${EMP[k][0]}</h4><p>${EMP[k][1]}</p></div>`;
const kv=(l,v)=>`<div class="kv"><span>${l}</span><strong>${v}</strong></div>`;
const tbl=(h,rows)=>rows.length?`<div class="table-wrap"><table><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<p class="muted">${t('none','Belum ada data.')}</p>`;
const repTbl=(h,rows)=>rows.length?`<div class="table-wrap rep-table-wrap"><table class="rep-table"><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td data-label="${esc(h[i])}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<p class="muted rep-empty">${t('none','Belum ada data.')}</p>`;
const h4=x=>`<h4 style="margin:18px 0 8px">${x}</h4>`;
function toast(m,type='success'){const e=document.createElement('div');e.className='toast toast-'+type;e.textContent=m;$('#toasts')?.append(e);setTimeout(()=>e.remove(),3400)}
function ask(title,msg){return new Promise(r=>{const d=$('#dlgConfirm');$('#confirmTitle').textContent=title;$('#confirmMsg').textContent=msg;
  const done=v=>{d.close();r(v)};$('#confirmYes').onclick=()=>done(true);$('#confirmNo').onclick=()=>done(false);d.oncancel=()=>r(false);d.showModal()})}
async function del(title,msg,fn,ok){
  if(!await ask(title,msg))return;
  const keys={types:'room_types',rooms:'rooms',residents:'residents',bills:'bills',expenses:'expenses'};
  const before=Object.fromEntries(Object.keys(keys).map(k=>[k,new Set((db[k]||[]).map(x=>x.id))]));
  fn();
  db.cloudDeleted=db.cloudDeleted||{};
  for(const [localKey,cloudKey] of Object.entries(keys)){
    const removed=[...(before[localKey]||[])].filter(id=>!(db[localKey]||[]).some(x=>x.id===id));
    if(removed.length){
      const pending=new Set(db.cloudDeleted[cloudKey]||[]);
      removed.forEach(id=>pending.add(id));
      db.cloudDeleted[cloudKey]=[...pending];
    }
  }
  refresh();
  toast(ok);
}
function clr(f){$$('.field',f).forEach(x=>{x.classList.remove('invalid');const e=$('.err',x);if(e)e.textContent=''})}
function bad(f,n,m){const x=f.elements[n].closest('.field');x.classList.add('invalid');const e=$('.err',x);if(e)e.textContent=m;return false}
function req(f,ns){clr(f);let ok=true;ns.forEach(n=>{if(!String(f.elements[n].value).trim())ok=bad(f,n,t('err_req','Wajib diisi'))&&ok});return ok}
const normPhone=s=>{let p=String(s).replace(/[\s\-().]/g,'');if(p[0]==='+')p=p.slice(1);if(p[0]==='0')p='62'+p.slice(1);return /^62\d{8,13}$/.test(p)?p:null};
const wa=(p,m)=>`https://wa.me/${normPhone(p)}${m?'?text='+encodeURIComponent(m):''}`;
const PHONE_ERR='Nomor tidak valid. Contoh: 08123456789';
const img=(file,max)=>new Promise(res=>{if(!file)return res(null);const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const k=Math.min(1,max/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(i,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.8))};i.onerror=()=>res(null);i.src=r.result};r.onerror=()=>res(null);r.readAsDataURL(file)});

/* ---------- Data & logika ---------- */
const room=id=>db.rooms.find(x=>x.id===id),type=id=>db.types.find(x=>x.id===id),resById=id=>db.residents.find(x=>x.id===id);
const active=()=>db.residents.filter(r=>r.active),resOf=rid=>db.residents.find(r=>r.active&&r.roomId===rid);
const roomNo=r=>room(r.roomId)?.number||r.roomNo||'-',typeName=rm=>type(rm?.typeId)?.name||'-';
const bName=b=>resById(b.residentId)?.fullName||b.name,bRoom=b=>{const r=resById(b.residentId);return r?roomNo(r):b.roomNo};
const bst=b=>b.paidDate?'PAID':b.dueDate<today()?'OVERDUE':'UNPAID';
const unpaid=rid=>db.bills.filter(b=>!b.paidDate&&(!rid||b.residentId===rid)).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
const rst=r=>{const u=unpaid(r.id);return u.length?(u.some(b=>bst(b)==='OVERDUE')?'OVERDUE':'UNPAID'):'PAID'};
const nextDue=r=>{const u=unpaid(r.id)[0];if(u)return u.dueDate;const l=db.bills.filter(b=>b.residentId===r.id).map(b=>b.period).sort().pop();return dueOf(nextYm(l||ym(today())),r.dueDay)};
const soonBills=()=>unpaid().filter(b=>b.dueDate<=addDays(today(),3));
const av=(r,lg)=>`<span class="avatar${lg?' avatar-lg':''}">${r.photo?`<img src="${r.photo}" alt="">`:esc((r.fullName.trim()[0]||'?').toUpperCase())}</span>`;
const lastRem=rid=>{const x=db.reminders.filter(m=>m.residentId===rid).sort((a,b)=>b.openedAt.localeCompare(a.openedAt))[0];return x?(x.status==='SENT'?'Sudah Dikirim':'WhatsApp Dibuka'):'Belum ada'};
const vars=b=>({nama:bName(b),kamar:bRoom(b),jumlah:rp(b.amount),jatuh_tempo:fd(b.dueDate),nama_kos:db.profile?.kosName||'KosManager'});
const msgFor=(b,tp)=>db.templates[tp].replace(/\{(\w+)\}/g,(m,k)=>vars(b)[k]??m);

function syncBills(){const td=today(),c=ym(td),nx=nextYm(c);let ch=false;
  active().forEach(r=>{const first=ym(r.startDate)>c?ym(r.startDate):c,ms=[first];
    if(first===c&&dueOf(nx,r.dueDay)<=addDays(td,3))ms.push(nx);
    ms.forEach(p=>{if(db.bills.some(b=>b.residentId===r.id&&b.period===p))return;
      db.bills.push({id:uid('b'),no:'INV-'+p.replace('-','')+'-'+String(++db.seq).padStart(4,'0'),residentId:r.id,name:r.fullName,roomNo:roomNo(r),period:p,amount:r.rent,dueDate:dueOf(p,r.dueDay),paidDate:null,method:null,receiptNo:null});ch=true})});
  if(ch)save()}

/* ---------- Navigasi ---------- */
/* ---------- Paket Gratis / Pro ---------- */
const LIMIT={residents:5,wa:10};
const isPro=()=>['pro','basic','standard','business'].includes(db.plan?.tier)&&db.plan.until>=today();
function waLeft(){const c=ym(today());if(db.plan.waMonth!==c){db.plan.waMonth=c;db.plan.waCount=0}return Math.max(0,LIMIT.wa-db.plan.waCount)}
function useWa(){if(isPro())return true;
  if(waLeft()<=0){toast(`Kuota ${LIMIT.wa} pesan WA bulan ini untuk paket Gratis sudah habis. Upgrade ke Pro untuk kirim tanpa batas.`,'error');return false}
  db.plan.waCount++;save();toast(`Sisa kuota pesan WA bulan ini: ${waLeft()}`,'info');return true}
const PAGES=['dashboard','penghuni','kamar','pembayaran','pengeluaran','laporan','pengaturan'];
const go=p=>{location.hash='#'+p};
function route(){const p=location.hash.slice(1);cur=PAGES.includes(p)?p:'dashboard';
  $$('.page').forEach(s=>s.hidden=s.id!=='page-'+cur);$$('#mainNav a').forEach(a=>a.classList.toggle('active',a.dataset.page===cur));$('#btnSettingsTop')?.classList.toggle('active',cur==='pengaturan');
  if(cur==='pengaturan')fillSet();R[cur]();topbar();icons();scrollTo(0,0)}
function refresh(){save();syncBills();R[cur]();topbar();icons()}
function topbar(){const p=db.profile||{kosName:'KosManager',ownerName:'Owner'};
  if($('#brandName'))$('#brandName').textContent=p.kosName;
  if($('#ownerName'))$('#ownerName').textContent=p.ownerName;
  if($('#kosNameTop'))$('#kosNameTop').textContent=p.kosName;
  if($('#ownerAvatar'))$('#ownerAvatar').textContent=(p.ownerName[0]||'O').toUpperCase();
  const s=soonBills(),c=$('#notifCount');if(c){c.hidden=!s.length;c.textContent=s.length;}
  if($('#notifPanel')){$('#notifPanel').innerHTML=s.length?s.map(b=>`<a class="list-row" href="#pembayaran" style="text-decoration:none;color:inherit"><span class="grow"><strong>${esc(bName(b))}</strong><small>Kamar ${esc(bRoom(b))}, ${rp(b.amount)}, ${fd(b.dueDate)}</small></span>${badge(bst(b))}</a>`).join(''):`<p class="muted" style="padding:12px 0">Belum ada notifikasi</p>`}}

/* ---------- Dashboard ---------- */
function renderDash(){const c=ym(today()),paid=db.bills.filter(b=>b.paidDate),inc=sum(paid.filter(b=>ym(b.paidDate)===c).map(b=>b.amount)),
  exp=sum(db.expenses.filter(e=>ym(e.date)===c).map(e=>e.amount)),tot=db.rooms.length,occ=db.rooms.filter(r=>resOf(r.id)).length,set=(id,v)=>{if($('#'+id))$('#'+id).textContent=v;};
  set('stRooms',tot);set('stOccupied',occ);set('stVacant',tot-occ);set('stOccupancy',(tot?Math.round(occ/tot*100):0)+'%');
  set('stIncome',rp(inc));set('stExpense',rp(exp));set('stArrears',rp(sum(unpaid().map(b=>b.amount))));set('stNet',rp(inc-exp));
  if($('#getStarted'))$('#getStarted').hidden=!!(db.types.length&&tot&&active().length);
  const rec=[...paid].sort((a,b)=>b.paidDate.localeCompare(a.paidDate)).slice(0,5);
  if($('#recentPayments'))$('#recentPayments').innerHTML=rec.length?rec.map(b=>`<div class="list-row"><div class="grow"><strong>${esc(bName(b))}</strong><small>Kamar ${esc(bRoom(b))}, ${fd(b.paidDate)}</small></div><b>${rp(b.amount)}</b>${badge('PAID')}</div>`).join(''):emp('pay');
  const s=soonBills();
  if($('#dueList'))$('#dueList').innerHTML=s.length?s.map(b=>`<div class="list-row"><div class="grow"><strong>${esc(bName(b))}</strong><small>Kamar ${esc(bRoom(b))}, ${rp(b.amount)}, ${fd(b.dueDate)}</small></div>${badge(bst(b))}<button class="btn btn-sm btn-soft" data-action="remind" data-id="${b.id}">${t('send_rem','Kirim Pengingat')}</button></div>`).join(''):emp('due');
  drawChart()}
function series(){const p=$('#chartPeriod')?.value||'6m',now=new Date(),keys=[],lab=[],dly=p==='7d'||p==='month';
  if(p==='7d')for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);keys.push(iso(d));lab.push(pad(d.getDate())+'/'+pad(d.getMonth()+1))}
  else if(p==='month'){const n=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();for(let i=1;i<=n;i++){keys.push(ym(today())+'-'+pad(i));lab.push(String(i))}}
  else{const n=p==='6m'?6:12;for(let i=n-1;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);keys.push(`${d.getFullYear()}-${pad(d.getMonth()+1)}`);lab.push(d.toLocaleDateString(loc(),{month:'short',year:'2-digit'}))}}
  const agg=a=>keys.map(k=>sum(a.filter(y=>(dly?y.d:ym(y.d))===k).map(y=>y.v)));
  return{lab,inc:agg(db.bills.filter(b=>b.paidDate).map(b=>({d:b.paidDate,v:b.amount}))),exp:agg(db.expenses.map(e=>({d:e.date,v:e.amount})))}}
function drawChart(){if(typeof Chart==='undefined'||!$('#financeChart'))return;const s=series(),ds=[{label:t('inc_s','Pemasukan'),data:s.inc,backgroundColor:'#2563EB',borderRadius:6},{label:t('exp_s','Pengeluaran'),data:s.exp,backgroundColor:'#F59E0B',borderRadius:6}];
  if(chart){chart.data.labels=s.lab;chart.data.datasets=ds;chart.update()}
  else chart=new Chart($('#financeChart'),{type:'bar',data:{labels:s.lab,datasets:ds},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,ticks:{callback:v=>v>=1e6?v/1e6+' jt':v.toLocaleString('id-ID')}}},plugins:{tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${rp(c.parsed.y)}`}}}}})}

/* ---------- Penghuni ---------- */
function renderRes(){const q=$('#resSearch')?.value.toLowerCase()||'',f=$('#resFilter')?.value||'all',so=$('#resSort')?.value||'name';
  const L=active().filter(r=>(r.fullName+' '+roomNo(r)).toLowerCase().includes(q)&&(f==='all'||rst(r)===f))
    .sort((a,b)=>so==='rent'?b.rent-a.rent:so==='due'?nextDue(a).localeCompare(nextDue(b)):a.fullName.localeCompare(b.fullName));
  if($('#residentList'))$('#residentList').innerHTML=L.length?L.map(r=>`<article class="item-card"><div class="item-top">${av(r)}<div class="grow"><strong>${esc(r.fullName)}</strong><small class="muted">${esc(r.phone)}</small></div>${badge(rst(r))}</div>
    <div class="item-meta"><span>Kamar <b>${esc(roomNo(r))}</b> (${esc(typeName(room(r.roomId)))})</span><span>Sewa <b>${rp(r.rent)}</b> per bulan</span><span>Mulai <b>${fd(r.startDate)}</b>, jatuh tempo <b>${fd(nextDue(r))}</b></span><span>Pengingat WhatsApp: <b>${lastRem(r.id)}</b></span></div>
    <div class="item-actions"><button class="btn btn-sm btn-primary" data-action="resDetail" data-id="${r.id}">${t('btn_detail','Detail')}</button><button class="btn btn-sm btn-ghost" data-action="editResident" data-id="${r.id}">${t('btn_edit','Edit')}</button><a class="btn btn-sm btn-ghost" href="${wa(r.phone)}" target="_blank" rel="noopener">Chat WA</a><button class="icon-btn sm danger" data-action="delResident" data-id="${r.id}" aria-label="Hapus">${ic('trash-2')}</button></div></article>`).join(''):emp('res')}
function openResident(id){if(!id&&!isPro()&&active().length>=LIMIT.residents){toast(`Paket Gratis maksimal ${LIMIT.residents} penghuni aktif. Upgrade ke Pro untuk penghuni tidak terbatas.`,'error');return}const r=id&&resById(id),f=$('#formResident'),avail=db.rooms.filter(x=>!resOf(x.id)||(r&&x.id===r.roomId));
  if(!r&&!avail.length){toast(db.rooms.length?'Semua kamar sudah terisi.':'Belum ada kamar. Tambahkan kamar dulu.','info');go('kamar');return}
  clr(f);f.reset();f.elements['id'].value=id||'';$('#residentTitle').textContent=r?'Edit Penghuni':'Tambah Penghuni';
  $('#residentRoom').innerHTML='<option value="">Pilih kamar</option>'+avail.map(x=>`<option value="${x.id}">${esc(x.number)} - ${esc(typeName(x))} (${rp(x.price)})</option>`).join('');
  if(r){['fullName','phone','roomId','rent','startDate','dueDay'].forEach(k=>f.elements[k].value=r[k])}
  else{f.elements.startDate.value=today();f.elements.dueDay.value=new Date().getDate()}
  openDlg('modalResident')}
$('#residentRoom')?.addEventListener('change',e=>{const x=room(e.target.value);if(x)$('#formResident').elements.rent.value=x.price});
$('#formResident')?.elements.startDate?.addEventListener('change',e=>{const f=$('#formResident');if(e.target.value&&!f.elements.dueDay.value)f.elements.dueDay.value=pd(e.target.value).getDate()});
$('#formResident')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.target,v=Object.fromEntries(new FormData(f)),dd=+v.dueDay;
  let ok=req(f,['fullName','phone','roomId','rent','startDate','dueDay']);
  if(v.phone&&!normPhone(v.phone))ok=bad(f,'phone',PHONE_ERR)&&ok;
  if(v.rent&&+v.rent<=0)ok=bad(f,'rent','Harus lebih dari 0')&&ok;
  if(v.dueDay&&(dd<1||dd>31))ok=bad(f,'dueDay','Isi tanggal 1 sampai 31')&&ok;
  const o=v.roomId&&resOf(v.roomId);if(o&&o.id!==v.id)ok=bad(f,'roomId','Kamar sudah terisi')&&ok;
  if(!ok)return;const photo=await img(f.elements.photo.files[0],160);
  const d={fullName:v.fullName.trim(),phone:v.phone.trim(),roomId:v.roomId,roomNo:room(v.roomId).number,rent:+v.rent,startDate:v.startDate,dueDay:dd};
  if(v.id){const r=resById(v.id);Object.assign(r,d);if(photo)r.photo=photo;unpaid(r.id).forEach(b=>{b.amount=r.rent;b.dueDate=dueOf(b.period,dd);b.name=r.fullName;b.roomNo=r.roomNo})}
  else db.residents.push({id:uid('r'),...d,photo,active:true});
  $('#modalResident').close();refresh();toast(v.id?'Data penghuni diperbarui':'Penghuni ditambahkan. Kamar otomatis terisi.')});
function openResDetail(id){const r=resById(id),bills=db.bills.filter(b=>b.residentId===id).sort((a,b)=>b.period.localeCompare(a.period)),
  rems=db.reminders.filter(m=>m.residentId===id).sort((a,b)=>b.openedAt.localeCompare(a.openedAt)),u=unpaid(id).length;
  $('#resDetailBody').innerHTML=`<div class="item-top" style="margin-bottom:16px">${av(r,1)}<div class="grow"><h3 style="margin:0">${esc(r.fullName)}</h3><small class="muted">${esc(r.phone)}</small></div>${r.active?badge(rst(r)):'<span class="badge badge-muted">Sudah keluar</span>'}</div>
  <div class="detail-grid">${kv('Kamar',esc(roomNo(r))+' ('+esc(typeName(room(r.roomId)))+')')}${kv('Harga sewa',rp(r.rent))}${kv('Mulai tinggal',fd(r.startDate))}${kv('Jatuh tempo berikutnya',r.active?fd(nextDue(r)):'-')}${kv('Total pembayaran',rp(sum(bills.filter(b=>b.paidDate).map(b=>b.amount))))}${kv('Total tunggakan',rp(sum(bills.filter(b=>!b.paidDate).map(b=>b.amount))))}</div>
  <div class="btn-row">${r.active?`<button class="btn btn-sm btn-ghost" data-action="editResident" data-id="${id}">Edit Penghuni</button>`:''}${u?`<button class="btn btn-sm btn-primary" data-action="payResident" data-id="${id}">Catat Pembayaran</button><button class="btn btn-sm btn-soft" data-action="remindResident" data-id="${id}">Kirim Pengingat</button>`:''}<a class="btn btn-sm btn-ghost" href="${wa(r.phone)}" target="_blank" rel="noopener">Chat WhatsApp</a>${r.active?`<button class="btn btn-sm btn-danger" data-action="exitResident" data-id="${id}">Penghuni Keluar</button>`:''}</div>
  ${h4('Riwayat Pembayaran')}${tbl(['Periode','Jumlah','Jatuh tempo','Status','Dibayar'],bills.map(b=>[per(b.period),rp(b.amount),fd(b.dueDate),badge(bst(b)),fd(b.paidDate)]))}
  ${h4('Riwayat Pengingat')}${tbl(['Tanggal','Jenis','Status'],rems.map(m=>[fd(iso(new Date(m.openedAt))),lb(TPN,m.tpl),m.status==='SENT'?'Sudah Dikirim':'WhatsApp Dibuka (menunggu konfirmasi)']))}`;
  openDlg('modalResDetail')}

/* ---------- Kamar ---------- */
function renderRooms(){const sel=$('#roomTypeFilter'),cv=sel?.value||'all';
  if(sel)sel.innerHTML=`<option value="all">${t('f_all_type','Semua tipe')}</option>`+db.types.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');if(sel)sel.value=db.types.some(x=>x.id===cv)?cv:'all';
  const q=$('#roomSearch')?.value.toLowerCase()||'',s=$('#roomStatus')?.value||'all',tp=sel?.value||'all';
  const L=db.rooms.filter(r=>r.number.toLowerCase().includes(q)&&(tp==='all'||r.typeId===tp)&&(s==='all'||(s==='TERISI')===!!resOf(r.id))).sort((a,b)=>a.number.localeCompare(b.number,undefined,{numeric:true}));
  if($('#roomGrid'))$('#roomGrid').innerHTML=L.length?L.map(r=>{const o=resOf(r.id);return `<article class="item-card"><div class="item-top"><div class="grow"><strong>Kamar ${esc(r.number)}</strong><small class="muted">${esc(typeName(r))}</small></div><span class="badge badge-${o?'info':'success'}">${lb(RL,o?'TERISI':'TERSEDIA')}</span></div>
    <div class="item-meta"><span>Harga <b>${rp(r.price)}</b> per bulan</span><span>Penghuni: <b>${o?esc(o.fullName):'-'}</b></span></div>
    <div class="item-actions"><button class="btn btn-sm btn-primary" data-action="roomDetail" data-id="${r.id}">${t('btn_detail','Detail')}</button><button class="btn btn-sm btn-ghost" data-action="editRoom" data-id="${r.id}">${t('btn_edit','Edit')}</button><button class="icon-btn sm danger" data-action="delRoom" data-id="${r.id}" aria-label="Hapus">${ic('trash-2')}</button></div></article>`}).join(''):emp('room')}
const autoType=()=>{const f=$('#formRoom'),x=type(f?.elements.typeId.value);if(x&&f){f.elements.price.value=x.price;f.elements.facilities.value=x.facilities||''}};
$('#roomTypeSelect')?.addEventListener('change',autoType);
function openRoom(id){if(!db.types.length){toast('Atur tipe kamar dan harga dulu di Pengaturan.','info');go('pengaturan');return}
  const f=$('#formRoom'),r=id&&room(id);clr(f);f.reset();f.elements['id'].value=id||'';$('#roomTitle').textContent=r?'Edit Kamar':'Tambah Kamar';
  $('#roomTypeSelect').innerHTML=db.types.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
  if(r){f.elements.number.value=r.number;f.elements.typeId.value=r.typeId;f.elements.price.value=r.price;f.elements.facilities.value=r.facilities||''}else autoType();
  openDlg('modalRoom')}
$('#formRoom')?.addEventListener('submit',e=>{e.preventDefault();const f=e.target,v=Object.fromEntries(new FormData(f));let ok=req(f,['number','typeId','price']);
  if(v.price&&+v.price<=0)ok=bad(f,'price','Harus lebih dari 0')&&ok;
  if(v.number&&db.rooms.some(x=>x.id!==v.id&&x.number.toLowerCase()===v.number.trim().toLowerCase()))ok=bad(f,'number','Nomor kamar sudah dipakai')&&ok;
  if(!ok)return;const d={number:v.number.trim(),typeId:v.typeId,price:+v.price,facilities:v.facilities.trim()};
  if(v.id)Object.assign(room(v.id),d);else db.rooms.push({id:uid('k'),...d});
  $('#modalRoom').close();refresh();toast(v.id?'Kamar diperbarui':'Kamar ditambahkan')});
function openRoomDetail(id){const rm=room(id),o=resOf(id),prev=db.residents.filter(r=>!r.active&&r.roomId===id),pays=db.bills.filter(b=>b.paidDate&&resById(b.residentId)?.roomId===id).sort((a,b)=>b.paidDate.localeCompare(a.paidDate));
  $('#roomDetailBody').innerHTML=`<div class="detail-grid">${kv('No. kamar',esc(rm.number))}${kv('Tipe',esc(typeName(rm)))}${kv('Harga sewa',rp(rm.price))}${kv('Status',lb(RL,o?'TERISI':'TERSEDIA'))}${kv('Penghuni saat ini',o?esc(o.fullName):'-')}${kv('Fasilitas',esc(rm.facilities||'-'))}</div>
  ${h4('Penghuni sebelumnya')}${tbl(['Nama','Mulai','Keluar'],prev.map(r=>[esc(r.fullName),fd(r.startDate),fd(r.exitDate)]))}${h4('Riwayat pembayaran')}${tbl(['Tanggal','Penghuni','Periode','Jumlah'],pays.map(b=>[fd(b.paidDate),esc(bName(b)),per(b.period),rp(b.amount)]))}`;
  openDlg('modalRoomDetail')}

/* ---------- Pembayaran & Struk ---------- */
function renderBills(){const q=$('#paySearch')?.value.toLowerCase()||'',s=$('#payStatus')?.value||'all',m=$('#payMonth')?.value||'';
  const L=db.bills.filter(b=>(bName(b)+' '+bRoom(b)).toLowerCase().includes(q)&&(s==='all'||bst(b)===s)&&(!m||b.period===m)).sort((a,b)=>b.dueDate.localeCompare(a.dueDate));
  if($('#billBody'))$('#billBody').innerHTML=L.length?L.map(b=>{const st=bst(b);return `<tr>   <td data-label="No. Tagihan">${b.no}</td>   <td data-label="Penghuni">${esc(bName(b))}</td>   <td data-label="Kamar">${esc(bRoom(b))}</td>   <td data-label="Periode">${per(b.period)}</td>   <td data-label="Jumlah">${rp(b.amount)}</td>   <td data-label="Jatuh Tempo">${fd(b.dueDate)}</td>   <td data-label="Status">${badge(st)}</td>   <td data-label="Aksi"><div class="row-actions">${st==='PAID'?`<button class="btn btn-sm btn-ghost" data-action="receipt" data-id="${b.id}">${t('btn_receipt','Struk')}</button>`:`<button class="btn btn-sm btn-primary" data-action="markPaid" data-id="${b.id}">${t('btn_pay','Tandai Lunas')}</button><button class="btn btn-sm btn-soft" data-action="remind" data-id="${b.id}">${t('btn_remind','Ingatkan')}</button>`}</div></td> </tr>`}).join(''):`<tr><td colspan="8">${emp('bill')}</td></tr>`}
function openPay(bid){const b=db.bills.find(x=>x.id===bid),f=$('#formPay');if(!b)return;clr(f);f.reset();f.elements.billId.value=bid;f.elements.date.value=today();f.elements.method.value='cash';
  $('#payInfo').innerHTML=`<b>${esc(bName(b))}</b><br>Kamar ${esc(bRoom(b))}, ${per(b.period)}<br>Jumlah tagihan: <b>${rp(b.amount)}</b>`;openDlg('modalPay')}
$('#formPay')?.addEventListener('submit',e=>{e.preventDefault();const f=e.target,b=db.bills.find(x=>x.id===f.elements.billId.value);
  let ok=req(f,['date']);if(f.elements.date.value>today())ok=bad(f,'date','Tanggal tidak boleh di masa depan')&&ok;if(!ok||!b||b.paidDate)return;
  b.paidDate=f.elements.date.value;b.method=f.elements.method.value;b.receiptNo='KM-'+b.paidDate.replace(/-/g,'')+'-'+String(++db.seq).padStart(4,'0');
  $('#modalPay').close();refresh();toast('Pembayaran dicatat. Status berubah menjadi lunas.');showReceipt(b.id)});
const rcRows=b=>[['No. Struk',b.receiptNo],['Penghuni',bName(b)],['Kamar',bRoom(b)],['Periode',per(b.period)],['Tanggal bayar',fd(b.paidDate)],['Metode',lb(MET,b.method)],['Jumlah',rp(b.amount)],['Status',lb(SL,'PAID').toUpperCase()]];
function showReceipt(bid){const b=db.bills.find(x=>x.id===bid),p=db.profile||{};curBill=b;
  $('#receiptBody').innerHTML=`<div class="receipt">${p.logo?`<img src="${p.logo}" alt="" style="display:block;margin:0 auto 8px;max-height:56px">`:''}<h4>${esc(p.kosName||'Kos')}</h4><p class="muted" style="text-align:center;margin-bottom:12px">${esc(p.address||'')}</p>${rcRows(b).map(([k,v])=>`<div class="receipt-row"><span>${k}</span><b>${esc(v)}</b></div>`).join('')}<p style="text-align:center;margin-top:14px">${t('thanks','Terima kasih atas pembayaran Anda.')}</p></div>`;openDlg('modalReceipt')}
$('#btnReceiptPdf')?.addEventListener('click',()=>{if(!window.jspdf)return toast('Library PDF belum termuat. Cek koneksi internet.','error');
  const d=new jspdf.jsPDF({unit:'mm',format:[90,150]}),b=curBill,p=db.profile||{};let y=14;
  d.setFont('helvetica','bold');d.setFontSize(13);d.text(p.kosName||'Kos',45,y,{align:'center'});y+=6;d.setFont('helvetica','normal');d.setFontSize(8);
  d.splitTextToSize(p.address||'',76).forEach(l=>{d.text(l,45,y,{align:'center'});y+=4});y+=2;d.line(7,y,83,y);y+=7;d.setFontSize(9);
  rcRows(b).forEach(([k,v])=>{d.text(k,7,y);d.text(String(v),83,y,{align:'right'});y+=6.5});d.line(7,y,83,y);y+=7;d.text(t('thanks','Terima kasih atas pembayaran Anda.'),45,y,{align:'center'});d.save(`struk-${b.receiptNo}.pdf`)});
$('#btnReceiptPrint')?.addEventListener('click',()=>{document.body.classList.add('print-receipt');print()});
addEventListener('afterprint',()=>document.body.classList.remove('print-receipt'));
$('#btnReceiptWA')?.addEventListener('click',()=>{const b=curBill,r=resById(b.residentId);if(!r||!normPhone(r.phone))return toast('Nomor WhatsApp penghuni tidak tersedia','error');
  if(!useWa())return;open(wa(r.phone,msgFor(b,'paid')+`\nNo. struk: ${b.receiptNo}`),'_blank','noopener')});

/* ---------- Pengingat WhatsApp ---------- */
const logRem=(rid,bid,tp)=>{const x={id:uid('m'),residentId:rid,billId:bid,tpl:tp,status:'OPENED',openedAt:new Date().toISOString(),confirmedAt:null};db.reminders.push(x);save();return x};
const tplOf=b=>bst(b)==='OVERDUE'?'overdue':'reminder';
function openRem(bid){const b=db.bills.find(x=>x.id===bid),r=b&&resById(b.residentId);if(!r)return toast('Data penghuni tidak ditemukan','error');remCtx={b,r,log:null};
  $('#remTo').innerHTML=`<b>${esc(r.fullName)}</b> (${esc(r.phone)})<br>Kamar ${esc(bRoom(b))}, ${rp(b.amount)}, jatuh tempo ${fd(b.dueDate)}`;
  $('#remTemplate').value=tplOf(b);$('#remText').value=msgFor(b,tplOf(b));$('#remStatus').hidden=true;$('#btnRemConfirm').hidden=true;openDlg('modalReminder')}
$('#remTemplate')?.addEventListener('change',()=>{if(remCtx)$('#remText').value=msgFor(remCtx.b,$('#remTemplate').value)});
$('#btnRemOpen')?.addEventListener('click',()=>{const c=remCtx;if(!c)return;if(!normPhone(c.r.phone))return toast('Nomor WhatsApp tidak valid','error');
 if(!c.log&&!useWa())return;c.log=c.log||logRem(c.r.id,c.b.id,$('#remTemplate').value);c.log.tpl=$('#remTemplate').value;save();open(wa(c.r.phone,$('#remText').value),'_blank','noopener');
  const s=$('#remStatus');s.textContent='WhatsApp dibuka (menunggu konfirmasi pengiriman). Pesan belum terkirim sebelum kamu menekan Kirim di WhatsApp, lalu konfirmasi di sini.';s.hidden=false;$('#btnRemConfirm').hidden=false;if(cur==='pembayaran')refresh()});
$('#btnRemConfirm')?.addEventListener('click',()=>{const l=remCtx?.log;if(!l)return;l.status='SENT';l.confirmedAt=new Date().toISOString();$('#modalReminder').close();refresh();toast('Pengingat dicatat sebagai Sudah Dikirim')});
function openBulk(){const L=unpaid();if(!L.length)return toast('Tidak ada tagihan yang belum lunas','info');
  $('#bulkSelect').hidden=false;$('#bulkQueue').hidden=true;['btnBulkSkip','btnBulkOpen','btnBulkConfirm'].forEach(i=>$('#'+i).hidden=true);$('#btnBulkStart').hidden=false;$('#bulkAll').checked=false;
  $('#bulkList').innerHTML=L.map(b=>`<label class="list-row"><input type="checkbox" value="${b.id}"><span class="grow"><strong>${esc(bName(b))}</strong><small>Kamar ${esc(bRoom(b))}, ${rp(b.amount)}, jatuh tempo ${fd(b.dueDate)}</small></span>${badge(bst(b))}</label>`).join('');openDlg('modalBulk')}
$('#bulkAll')?.addEventListener('change',e=>$$('#bulkList input').forEach(c=>c.checked=e.target.checked));
$('#btnBulkStart')?.addEventListener('click',()=>{const q=$$('#bulkList input:checked').map(c=>c.value);if(!q.length)return toast('Pilih minimal satu penghuni','error');
  bulk={q,i:0,log:null};$('#bulkSelect').hidden=true;$('#bulkQueue').hidden=false;$('#btnBulkStart').hidden=true;showBulk()});
function showBulk(){const b=db.bills.find(x=>x.id===bulk.q[bulk.i]);
  if(!b){if(++bulk.i<bulk.q.length)return showBulk();$('#modalBulk').close();refresh();return toast('Antrean pengingat selesai')}
  bulk.log=null;$('#bulkProgress').textContent=`Penghuni ${bulk.i+1} dari ${bulk.q.length}`;$('#bulkCurrent').innerHTML=`<b>${esc(bName(b))}</b>, Kamar ${esc(bRoom(b))}, ${rp(b.amount)}`;$('#bulkText').value=msgFor(b,tplOf(b));
  $('#btnBulkOpen').hidden=false;$('#btnBulkSkip').hidden=false;$('#btnBulkConfirm').hidden=true}
$('#btnBulkOpen')?.addEventListener('click',()=>{const b=db.bills.find(x=>x.id===bulk.q[bulk.i]),r=b&&resById(b.residentId);if(!r||!normPhone(r.phone))return toast('Nomor WhatsApp tidak valid','error');
  if(!bulk.log&&!useWa())return;bulk.log=bulk.log||logRem(r.id,b.id,tplOf(b));open(wa(r.phone,$('#bulkText').value),'_blank','noopener');$('#btnBulkConfirm').hidden=false;toast('WhatsApp dibuka. Kirim pesannya, lalu konfirmasi di sini.','info')});
$('#btnBulkConfirm')?.addEventListener('click',()=>{if(bulk.log){bulk.log.status='SENT';bulk.log.confirmedAt=new Date().toISOString();save()}bulk.i++;showBulk()});
$('#btnBulkSkip')?.addEventListener('click',()=>{bulk.i++;showBulk()});
function renderRems(){const dt=s=>s?new Date(s).toLocaleString(loc(),{dateStyle:'medium',timeStyle:'short'}):'-',L=[...db.reminders].sort((a,b)=>b.openedAt.localeCompare(a.openedAt));
  if($('#reminderBody'))$('#reminderBody').innerHTML=L.length?L.map(x=>`<tr><td data-label="Tanggal">${fd(iso(new Date(x.openedAt)))}</td><td data-label="Penghuni">${esc(resById(x.residentId)?.fullName||'-')}</td><td data-label="Jenis Pesan">${lb(TPN,x.tpl)}</td><td data-label="Status">${x.status==='SENT'?'<span class="badge badge-success">Sudah Dikirim</span>':'<span class="badge badge-warning">WhatsApp Dibuka (menunggu konfirmasi)</span>'}</td><td data-label="Dibuka">${dt(x.openedAt)}</td><td data-label="Dikonfirmasi">${dt(x.confirmedAt)}</td></tr>`).join(''):`<tr><td colspan="6">${emp('rem')}</td></tr>`}

/* ---------- Pengeluaran ---------- */
function renderExp(){const q=$('#expSearch')?.value.toLowerCase()||'',c=$('#expCategory')?.value||'',a=$('#expFrom')?.value||'',z=$('#expTo')?.value||'';
  const L=db.expenses.filter(e=>e.name.toLowerCase().includes(q)&&(!c||e.category===c)&&(!a||e.date>=a)&&(!z||e.date<=z)).sort((x,y)=>y.date.localeCompare(x.date));
  if($('#expTotal'))$('#expTotal').textContent=rp(sum(L.map(e=>e.amount)));
  if($('#expenseBody'))$('#expenseBody').innerHTML=L.length?L.map(e=>`<tr><td data-label="Nama">${esc(e.name)}</td><td data-label="Kategori">${lb(CAT,e.category)}</td><td data-label="Tanggal">${fd(e.date)}</td><td data-label="Jumlah">${rp(e.amount)}</td><td data-label="Metode">${lb(MET,e.method)}</td><td data-label="Aksi"><div class="row-actions"><button class="icon-btn sm" data-action="editExpense" data-id="${e.id}" aria-label="Edit">${ic('pencil')}</button><button class="icon-btn sm danger" data-action="delExpense" data-id="${e.id}" aria-label="Hapus">${ic('trash-2')}</button></div></td></tr>`).join(''):`<tr><td colspan="6">${emp('exp')}</td></tr>`}
function openExp(id){const f=$('#formExpense'),x=id&&db.expenses.find(y=>y.id===id);clr(f);f.reset();f.elements['id'].value=id||'';$('#expenseTitle').textContent=x?'Edit Pengeluaran':'Tambah Pengeluaran';
  if(x)['name','category','amount','date','method','note'].forEach(k=>f.elements[k].value=x[k]||'');else{f.elements.date.value=today();f.elements.category.value='electricity';f.elements.method.value='cash'}openDlg('modalExpense')}
$('#formExpense')?.addEventListener('submit',e=>{e.preventDefault();const f=e.target,v=Object.fromEntries(new FormData(f));let ok=req(f,['name','amount','date']);if(v.amount&&+v.amount<=0)ok=bad(f,'amount','Harus lebih dari 0')&&ok;if(!ok)return;
  const d={name:v.name.trim(),category:v.category,amount:+v.amount,date:v.date,method:v.method,note:v.note.trim()};
  if(v.id)Object.assign(db.expenses.find(y=>y.id===v.id),d);else db.expenses.push({id:uid('e'),...d});
  $('#modalExpense').close();refresh();toast(v.id?'Pengeluaran diperbarui':'Pengeluaran ditambahkan')});

/* ---------- Laporan ---------- */
function range(){const p=$('#repPeriod')?.value||'month',n=new Date(),td=today();
  if(p==='today')return[td,td];
  if(p==='week'){const d=new Date(n);d.setDate(d.getDate()-(d.getDay()+6)%7);const s=iso(d);return[s,addDays(s,6)]}
  if(p==='month')return[ym(td)+'-01',iso(new Date(n.getFullYear(),n.getMonth()+1,0))];
  if(p==='lastmonth')return[iso(new Date(n.getFullYear(),n.getMonth()-1,1)),iso(new Date(n.getFullYear(),n.getMonth(),0))];
  return[$('#repFrom')?.value||ym(td)+'-01',$('#repTo')?.value||td]}
function repData(){const[a,z]=range(),inb=s=>s>=a&&s<=z,inc=db.bills.filter(b=>b.paidDate&&inb(b.paidDate)).sort((x,y)=>x.paidDate.localeCompare(y.paidDate)),
  exp=db.expenses.filter(e=>inb(e.date)).sort((x,y)=>x.date.localeCompare(y.date)),ti=sum(inc.map(b=>b.amount)),te=sum(exp.map(e=>e.amount)),
  tot=db.rooms.length,occ=db.rooms.filter(r=>resOf(r.id)).length,st={PAID:0,UNPAID:0,OVERDUE:0},byM={},byC={};
  active().forEach(r=>st[rst(r)]++);inc.forEach(b=>byM[ym(b.paidDate)]=(byM[ym(b.paidDate)]||0)+b.amount);exp.forEach(e=>byC[e.category]=(byC[e.category]||0)+e.amount);
  return{a,z,inc,exp,ti,te,net:ti-te,arrears:sum(unpaid().filter(b=>b.dueDate<=z).map(b=>b.amount)),tot,occ,st,byM,byC}}
function renderRep(){if($('#repCustom'))$('#repCustom').hidden=$('#repPeriod')?.value!=='custom';const d=repData(),R_=id=>$('#'+id+' .rep-content'),grid=x=>`<div class="detail-grid">${x}</div>`,pct=d.tot?Math.round(d.occ/d.tot*100):0;
  if(R_('repIncome'))R_('repIncome').innerHTML=grid(kv('Total pembayaran diterima',rp(d.ti))+kv('Jumlah transaksi',d.inc.length))+h4('Pemasukan per bulan')+repTbl(['Bulan','Jumlah'],Object.keys(d.byM).sort().map(k=>[per(k),rp(d.byM[k])]))+h4('Riwayat pembayaran penghuni')+repTbl(['Tanggal','Penghuni','Kamar','Periode','Metode','Jumlah'],d.inc.map(b=>[fd(b.paidDate),esc(bName(b)),esc(bRoom(b)),per(b.period),lb(MET,b.method),rp(b.amount)]));
  if(R_('repExpense'))R_('repExpense').innerHTML=grid(kv('Total pengeluaran',rp(d.te))+kv('Jumlah transaksi',d.exp.length))+h4('Pengeluaran per kategori')+repTbl(['Kategori','Jumlah'],Object.keys(d.byC).map(k=>[lb(CAT,k),rp(d.byC[k])]))+h4('Riwayat pengeluaran')+repTbl(['Tanggal','Nama','Kategori','Jumlah'],d.exp.map(e=>[fd(e.date),esc(e.name),lb(CAT,e.category),rp(e.amount)]));
  if(R_('repCash'))R_('repCash').innerHTML=grid(kv('Total pemasukan diterima',rp(d.ti))+kv('Total pengeluaran',rp(d.te))+kv('Arus kas bersih',rp(d.net))+kv('Total tunggakan',rp(d.arrears)));
  if(R_('repOcc'))R_('repOcc').innerHTML=grid(kv('Total kamar',d.tot)+kv('Kamar terisi',d.occ)+kv('Kamar kosong',d.tot-d.occ)+kv('Tingkat hunian',pct+'%')+kv('Penghuni lunas',d.st.PAID)+kv('Belum membayar',d.st.UNPAID)+kv('Terlambat',d.st.OVERDUE))}
$('#btnExportPdf')?.addEventListener('click',()=>{if(!window.jspdf)return toast('Library PDF belum termuat. Cek koneksi internet.','error');
  try{const d=repData(),p=db.profile||{},doc=new jspdf.jsPDF();let y=34;doc.setFontSize(15);doc.text(p.kosName||'Kos',14,16);doc.setFontSize(11);doc.text('Laporan Keuangan dan Operasional',14,23);doc.setFontSize(9);doc.text(`Periode: ${fd(d.a)} - ${fd(d.z)}   Dibuat: ${fd(today())}`,14,29);
    const tb=(h,b)=>{doc.autoTable({head:[h],body:b,startY:y,styles:{fontSize:8},headStyles:{fillColor:[37,99,235]}});y=doc.lastAutoTable.finalY+8};
    tb(['Ringkasan','Nilai'],[['Pemasukan diterima',rp(d.ti)],['Pengeluaran',rp(d.te)],['Arus kas bersih',rp(d.net)],['Tunggakan',rp(d.arrears)],['Total kamar / terisi / kosong',`${d.tot} / ${d.occ} / ${d.tot-d.occ}`],['Penghuni lunas / belum / terlambat',`${d.st.PAID} / ${d.st.UNPAID} / ${d.st.OVERDUE}`]]);
    tb(['Tanggal','Penghuni','Kamar','Periode','Jumlah'],d.inc.map(b=>[fd(b.paidDate),bName(b),bRoom(b),per(b.period),rp(b.amount)]));
    tb(['Tanggal','Nama','Kategori','Jumlah'],d.exp.map(e=>[fd(e.date),e.name,lb(CAT,e.category),rp(e.amount)]));const fn=`laporan-${d.a}_${d.z}.pdf`;window.Android?Android.saveFile(doc.output('datauristring').split(',')[1],fn,'application/pdf'):doc.save(fn)}catch{toast('Gagal membuat PDF','error')}});
$('#btnExportXlsx')?.addEventListener('click',()=>{if(!window.XLSX)return toast('Library Excel belum termuat. Cek koneksi internet.','error');
  const d=repData(),wb=XLSX.utils.book_new(),add=(n,rows)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),n);
  add('Ringkasan',[[db.profile?.kosName||'Kos'],['Periode',`${d.a} s/d ${d.z}`],[],['Pemasukan diterima',d.ti],['Pengeluaran',d.te],['Arus kas bersih',d.net],['Tunggakan',d.arrears],['Total kamar',d.tot],['Kamar terisi',d.occ],['Kamar kosong',d.tot-d.occ],['Tingkat hunian (%)',d.tot?Math.round(d.occ/d.tot*100):0],['Penghuni lunas',d.st.PAID],['Penghuni belum bayar',d.st.UNPAID],['Penghuni terlambat',d.st.OVERDUE]]);
  add('Pemasukan',[['No. Struk','Tanggal','Penghuni','Kamar','Periode','Metode','Jumlah'],...d.inc.map(b=>[b.receiptNo,b.paidDate,bName(b),bRoom(b),b.period,lb(MET,b.method),b.amount])]);
  add('Pengeluaran',[['Tanggal','Nama','Kategori','Metode','Jumlah','Catatan'],...d.exp.map(e=>[e.date,e.name,lb(CAT,e.category),lb(MET,e.method),e.amount,e.note||''])]);const fn=`laporan-${d.a}_${d.z}.xlsx`;window.Android?Android.saveFile(XLSX.write(wb,{bookType:'xlsx',type:'base64'}),fn,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'):XLSX.writeFile(wb,fn)});
$('#btnPrintReport')?.addEventListener('click',()=>window.Android?Android.printPage():print());

/* ---------- Pengaturan ---------- */
function fillSet(){const p=db.profile||{},f=$('#formProfile'),tf=$('#formTemplates');if(f)['kosName','ownerName','address','wa','info'].forEach(n=>f.elements[n].value=p[n]||'');
  if(tf)Object.keys(DEF_TPL).forEach(k=>tf.elements[k].value=db.templates[k]);if($('#langSetting'))$('#langSetting').value=lang;applyFontSize(db.fontSize||'medium');
  const waInput = $('#ownerWaRecovery');
  if(waInput && p.recoveryWa) waInput.value = p.recoveryWa;}
$$('.font-size-option').forEach(btn=>btn.addEventListener('click',()=>applyFontSize(btn.dataset.fontSize,true)));
applyFontSize(db.fontSize||'medium');
$('#formProfile')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.target,v=Object.fromEntries(new FormData(f));let ok=req(f,['kosName','ownerName','address','wa']);if(v.wa&&!normPhone(v.wa))ok=bad(f,'wa',PHONE_ERR)&&ok;if(!ok)return;
  const logo=await img(f.elements.logo.files[0],200);db.profile=db.profile||{};Object.assign(db.profile,{kosName:v.kosName.trim(),ownerName:v.ownerName.trim(),address:v.address.trim(),wa:v.wa.trim(),info:v.info.trim()});if(logo)db.profile.logo=logo;f.elements.logo.value='';refresh();toast('Profil kos disimpan')});
function renderTypes(){if($('#typeList'))$('#typeList').innerHTML=db.types.length?db.types.map(x=>`<div class="type-item"><div><strong>${esc(x.name)}</strong> <small>${rp(x.price)} per bulan, ${db.rooms.filter(r=>r.typeId===x.id).length} kamar</small><br><small>${esc(x.facilities||'')}</small></div><div class="row-actions"><button class="icon-btn sm" data-action="editType" data-id="${x.id}" aria-label="Edit">${ic('pencil')}</button><button class="icon-btn sm danger" data-action="delType" data-id="${x.id}" aria-label="Hapus">${ic('trash-2')}</button></div></div>`).join(''):`<p class="muted" style="margin-top:12px">Belum ada tipe kamar. Tambahkan tipe pertamamu di atas.</p>`}
const resetType=()=>{const f=$('#formType');if(f){clr(f);f.reset();f.elements['id'].value='';$('#btnCancelType').hidden=true}};
$('#btnCancelType')?.addEventListener('click',resetType);
$('#formType')?.addEventListener('submit',e=>{e.preventDefault();const f=e.target,v=Object.fromEntries(new FormData(f));let ok=req(f,['name','price']);if(v.price&&+v.price<=0)ok=bad(f,'price','Harus lebih dari 0')&&ok;if(!ok)return;
  const d={name:v.name.trim(),price:Number(v.price),facilities:v.facilities.trim()};
  if(v.id){const existing=type(v.id);if(!existing)return toast('Tipe kamar tidak ditemukan. Muat ulang halaman lalu coba lagi.','error');Object.assign(existing,d)}
  else db.types.push({id:uid('t'),...d});
  resetType();refresh();toast(v.id?'Tipe kamar diperbarui':'Tipe kamar ditambahkan')});
$('#formTemplates')?.addEventListener('submit',e=>{e.preventDefault();Object.keys(DEF_TPL).forEach(k=>db.templates[k]=e.target.elements[k].value.trim()||DEF_TPL[k]);save();toast('Template pesan disimpan')});
$('#btnResetTemplates')?.addEventListener('click',()=>{db.templates={...DEF_TPL};save();fillSet();toast('Template dikembalikan ke bawaan')});
$('#btnBackup')?.addEventListener('click',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(db)],{type:'application/json'}));a.download=`kosmanager-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)});
$('#btnRestore')?.addEventListener('click',()=>$('#fileRestore').click());
$('#fileRestore')?.addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const d=JSON.parse(await f.text());if(!Array.isArray(d.rooms)||!Array.isArray(d.residents)||!d.profile)throw 0;
    if(!await ask('Impor cadangan','Data yang ada sekarang akan diganti dengan isi file cadangan. Lanjutkan?'))return;db={...fresh(),...d};lang=db.lang||'id';save();boot()}catch{toast('File cadangan tidak valid','error')}});
$('#btnResetData')?.addEventListener('click',async()=>{if(!await ask('Reset semua data','Semua data kos (kamar, penghuni, pembayaran, pengeluaran) dihapus permanen. Lanjutkan?'))return;
  localStorage.removeItem(KEY);db=fresh();lang='id';boot()});

/* ---------- Aksi (event delegation) ---------- */
const A={
  addResident:()=>openResident(),editResident:openResident,resDetail:openResDetail,
  delResident:id=>{const r=resById(id);if(!r)return;
    del('Hapus penghuni',`Hapus ${r.fullName}? Tagihan belum lunas ikut dihapus. Jika memiliki riwayat pembayaran lunas, data penghuni akan diarsipkan agar riwayat tetap utuh.`,()=>{
      db.bills=db.bills.filter(b=>b.residentId!==id||b.paidDate);
      if(db.bills.some(b=>b.residentId===id&&b.paidDate)){r.active=false;r.exitDate=r.exitDate||today()}
      else db.residents=db.residents.filter(x=>x.id!==id);
    },'Data penghuni diproses. Riwayat pembayaran yang sudah lunas tetap dipertahankan.') },
  exitResident:id=>{const r=resById(id);if(!r)return;del('Penghuni keluar',`${r.fullName} keluar dari kamar ${roomNo(r)}? Kamar menjadi kosong. Seluruh riwayat tagihan dan pembayaran, termasuk tunggakan, tetap disimpan.`,()=>{r.active=false;r.exitDate=today()},'Penghuni diarsipkan. Seluruh riwayat tagihan dan pembayaran tetap tersimpan.') },
  addRoom:()=>openRoom(),editRoom:openRoom,roomDetail:openRoomDetail,
  delRoom:id=>{if(db.residents.some(r=>r.roomId===id))return toast('Kamar masih terhubung dengan riwayat penghuni. Pertahankan kamar agar riwayat tetap aman.','error');del('Hapus kamar',`Hapus kamar ${room(id).number}?`,()=>{db.rooms=db.rooms.filter(x=>x.id!==id)},'Kamar dihapus')},
  recordPayment:()=>{go('pembayaran');toast('Pilih tagihan, lalu tekan Tandai Lunas','info')},
  markPaid:openPay,receipt:showReceipt,remind:openRem,bulkReminder:openBulk,
  payResident:id=>{const b=unpaid(id)[0];b?openPay(b.id):toast('Tidak ada tagihan yang belum lunas','info')},
  remindResident:id=>{const b=unpaid(id)[0];b?openRem(b.id):toast('Tidak ada tagihan yang belum lunas','info')},
  addExpense:()=>openExp(),editExpense:openExp,
  delExpense:id=>del('Hapus pengeluaran','Hapus catatan pengeluaran ini?',()=>{db.expenses=db.expenses.filter(x=>x.id!==id)},'Pengeluaran dihapus'),
  makeReport:()=>go('laporan'),
  editType:id=>{const x=type(id),f=$('#formType');if(f){f.elements['id'].value=id;f.elements.name.value=x.name;f.elements.price.value=x.price;f.elements.facilities.value=x.facilities||'';$('#btnCancelType').hidden=false;f.scrollIntoView({behavior:'smooth',block:'center'})}},
  delType:id=>{if(db.rooms.some(r=>r.typeId===id))return toast('Tipe ini masih dipakai kamar','error');del('Hapus tipe kamar','Hapus tipe kamar ini?',()=>{db.types=db.types.filter(x=>x.id!==id)},'Tipe kamar dihapus')}};

document.addEventListener('click',e=>{
  const c=e.target.closest('[data-close]');if(c){c.closest('dialog').close();return}
  const b=e.target.closest('[data-action]'),fn=b&&A[b.dataset.action];if(!fn)return;
  const dlg=b.closest('#modalResDetail,#modalRoomDetail');if(dlg)dlg.close();fn(b.dataset.id)});
document.addEventListener('click',e=>{if(!e.target.closest('.notif')){$('#notifPanel')?.setAttribute('hidden',true);}});
$('#btnNotif')?.addEventListener('click',()=>{const panel = $('#notifPanel');if(panel)panel.hidden=!panel.hidden});
$$('.tab').forEach(b=>b.addEventListener('click',()=>{$$('.tab').forEach(x=>x.classList.toggle('active',x===b));if($('#tab-bills'))$('#tab-bills').hidden=b.dataset.tab!=='bills';if($('#tab-reminders'))$('#tab-reminders').hidden=b.dataset.tab!=='reminders'}));

const on=(ids,fn)=>ids.split(' ').forEach(i=>$('#'+i)?.addEventListener('input',fn));
on('resSearch resFilter resSort',()=>renderRes());on('roomSearch roomStatus roomTypeFilter',()=>renderRooms());on('paySearch payStatus payMonth',()=>renderBills());
on('expSearch expCategory expFrom expTo',()=>renderExp());on('repPeriod repFrom repTo',()=>renderRep());on('chartPeriod',()=>drawChart());
$('#langSelect')?.addEventListener('change',e=>setLang(e.target.value));$('#langSetting')?.addEventListener('change',e=>setLang(e.target.value));
addEventListener('hashchange',()=>db.profile&&route());
const R={dashboard:renderDash,penghuni:renderRes,kamar:renderRooms,pembayaran:()=>{renderBills();renderRems()},pengeluaran:renderExp,laporan:renderRep,pengaturan:renderTypes};

/* ---------- Setup akun baru (Onboarding) ---------- */
$('#formSetup')?.addEventListener('submit',e=>{e.preventDefault();const f=e.target,v=Object.fromEntries(new FormData(f));let ok=req(f,['ownerName','kosName','address','wa']);if(v.wa&&!normPhone(v.wa))ok=bad(f,'wa',PHONE_ERR)&&ok;if(!ok)return;
  db.profile={ownerName:v.ownerName.trim(),kosName:v.kosName.trim(),address:v.address.trim(),wa:v.wa.trim(),info:'',logo:null};save();location.hash='#dashboard';boot();toast('Akun kos dibuat. Mulai dengan mengatur tipe kamar dan harga.')});

function boot(){
  applyLang();fillSelects();
  if($('#langSelect'))$('#langSelect').value=lang;
  if($('#langSetting'))$('#langSetting').value=lang;
  const has=!!db.profile;
  if($('#onboarding'))$('#onboarding').hidden=has;
  if($('#app'))$('#app').hidden=!has;
  if(has){syncBills();route()}else icons();
}

/* ==========================================================
   SUPABASE AUTH & MANAJEMEN AKUN
   ========================================================== */
const SUPABASE_URL = 'https://fqbkltgoitfvcmqvbpvu.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_XXkrWIFPJS0zviD600DLzw_ZVvRpnSY';
if (!window.supabase?.createClient) {
  throw new Error('Library Supabase belum berhasil dimuat. Periksa koneksi internet lalu muat ulang.');
}
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

// 1. Modal pendaftaran akun
window.openRegisterModal = function() {
  const modal = document.getElementById('modalRegister');
  const loginScreen = document.getElementById('loginScreen');
  if (modal) modal.style.display = 'block';
  if (loginScreen) loginScreen.style.opacity = '0.3';
};
window.closeRegisterModal = function() {
  const modal = document.getElementById('modalRegister');
  const loginScreen = document.getElementById('loginScreen');
  if (modal) modal.style.display = 'none';
  if (loginScreen) loginScreen.style.opacity = '1';
};

function authMessage(error) {
  const code = error?.code || error?.message || '';
  if (/invalid login credentials/i.test(code)) return 'Email atau password salah.';
  if (/email not confirmed/i.test(code)) return 'Email belum dikonfirmasi. Periksa kotak masuk email kamu.';
  if (/user already registered/i.test(code)) return 'Email ini sudah terdaftar. Silakan masuk.';
  if (/password.*(6|short)|weak password/i.test(code)) return 'Password terlalu pendek. Gunakan minimal 6 karakter.';
  if (/rate limit/i.test(code)) return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  return error?.message || 'Terjadi kesalahan. Silakan coba lagi.';
}

// 2. Login hanya untuk akun yang sudah terdaftar
window.handleEmailLogin = async function(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;
  if (!email || !password) return;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) toast(`Gagal masuk: ${authMessage(error)}`, 'error');
  else toast('Berhasil masuk ke akun!', 'success');
};

// 3. Registrasi akun baru
window.handleRegister = async function(e) {
  e.preventDefault();
  const email = document.getElementById('regEmail')?.value.trim();
  const password = document.getElementById('regPassword')?.value;
  if (!email || !password) return;
  const { data, error } = await supabaseClient.auth.signUp({
    email, password,
    options: { emailRedirectTo: window.location.href.split('#')[0] }
  });
  if (error) {
    toast(`Gagal mendaftar: ${authMessage(error)}`, 'error');
    return;
  }
  closeRegisterModal();
  if (data.session) toast('Akun berhasil dibuat dan kamu sudah masuk!', 'success');
  else toast('Pendaftaran berhasil. Silakan cek email untuk konfirmasi sebelum masuk.', 'success');
};

// 4. Perbarui password melalui sesi Supabase yang aktif
window.handleChangePassword = async function(e) {
  e.preventDefault();
  const newWa = document.getElementById('ownerWaRecovery')?.value.trim() || '';
  const newPass = document.getElementById('newPassword')?.value || '';
  if (!activeUser) return toast('Anda belum login!', 'error');
  if (newPass.length < 6) return toast('Password minimal 6 karakter.', 'error');
  if (db.profile) { db.profile.recoveryWa = newWa; save(); }
  const { error } = await supabaseClient.auth.updateUser({ password: newPass });
  if (error) toast(`Gagal update password: ${authMessage(error)}`, 'error');
  else {
    toast('Password berhasil diperbarui!', 'success');
    const input = document.getElementById('newPassword');
    if (input) input.value = '';
  }
};

// 5. Logout
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) btnLogout.onclick = async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) toast(`Gagal keluar: ${authMessage(error)}`, 'error');
  else toast('Anda telah keluar dari akun.', 'info');
};


// 6. Sinkronisasi data operasional ke enam tabel Supabase yang sudah disiapkan.
// Foto, riwayat pengingat, template, bahasa, dan preferensi tetap tersimpan lokal.
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function makeUuid(){return crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16)})}
function normalizeCloudIds(){
  const maps={types:new Map(),rooms:new Map(),residents:new Map(),bills:new Map(),expenses:new Map()};
  for(const key of Object.keys(maps)){
    for(const row of db[key]||[]){const old=row.id;if(!UUID_RE.test(String(old||''))){row.id=makeUuid();maps[key].set(old,row.id)}}
  }
  for(const r of db.rooms||[])if(maps.types.has(r.typeId))r.typeId=maps.types.get(r.typeId);
  for(const r of db.residents||[])if(maps.rooms.has(r.roomId))r.roomId=maps.rooms.get(r.roomId);
  for(const b of db.bills||[])if(maps.residents.has(b.residentId))b.residentId=maps.residents.get(b.residentId);
}
function toCloudRows(){
  normalizeCloudIds();
  const owner_id=activeUser.id,p=db.profile;
  return {
    profiles:p?{id:owner_id,owner_name:p.ownerName||'',kos_name:p.kosName||'',address:p.address||'',wa:p.wa||'',info:p.info||'',recovery_wa:p.recoveryWa||null}:null,
    room_types:db.types.map(x=>({id:x.id,owner_id,name:x.name,price:Number(x.price)||0,facilities:x.facilities||''})),
    rooms:db.rooms.map(x=>({id:x.id,owner_id,number:String(x.number??''),type_id:x.typeId,price:Number(x.price)||0,facilities:x.facilities||''})),
    residents:db.residents.map(x=>({id:x.id,owner_id,full_name:x.fullName||'',phone:x.phone||'',room_id:x.roomId,rent:Number(x.rent)||0,start_date:x.startDate||null,due_day:Number(x.dueDay)||1,photo:null,active:x.active!==false,exit_date:x.exitDate||null})),
    bills:db.bills.map(x=>({id:x.id,owner_id,bill_no:x.no||'',resident_id:x.residentId,resident_name:x.name||'',room_no:String(x.roomNo??''),period:x.period,amount:Number(x.amount)||0,due_date:x.dueDate||null,paid_date:x.paidDate||null,method:x.method||null,receipt_no:x.receiptNo||null})),
    expenses:db.expenses.map(x=>({id:x.id,owner_id,name:x.name||'',category:x.category||'',amount:Number(x.amount)||0,date:x.date,method:x.method||null,note:x.note||''}))
  };
}
// Snapshot sinkronisasi terakhir. Dipakai sebagai titik pembanding untuk
// membedakan perubahan lokal yang belum terkirim dari data cloud yang lebih baru.
function cloudSnapshot(){
  return {
    profile:db.profile||null,
    types:(db.types||[]).map(x=>({...x})),
    rooms:(db.rooms||[]).map(x=>({...x})),
    residents:(db.residents||[]).map(x=>({...x})),
    bills:(db.bills||[]).map(x=>({...x})),
    expenses:(db.expenses||[]).map(x=>({...x}))
  };
}
function sameCloudValue(a,b){return JSON.stringify(a??null)===JSON.stringify(b??null)}
function mergeCloudRows(localRows,remoteRows,baseRows,deletedIds=[]){
  const deleted=new Set(deletedIds||[]),local=new Map((localRows||[]).map(x=>[x.id,x])),remote=new Map((remoteRows||[]).map(x=>[x.id,x])),base=new Map((baseRows||[]).map(x=>[x.id,x]));
  const ids=new Set([...local.keys(),...remote.keys()]),merged=[];
  for(const id of ids){
    if(deleted.has(id))continue;
    const l=local.get(id),r=remote.get(id),b=base.get(id);
    if(l&&r){
      // Bila kedua sisi berubah, cloud menjadi sumber utama untuk mencegah
      // salinan lokal lama menimpa data terbaru di Supabase.
      if(b&&!sameCloudValue(l,b)&&sameCloudValue(r,b))merged.push(l);
      else merged.push(r);
    }else if(r){
      merged.push(r);
    }else if(l&&!b){
      // Baris yang hanya ada lokal dan belum pernah tersinkron tetap dipertahankan.
      merged.push(l);
    }
    // Jika baris pernah ada di baseline tetapi kini hilang dari cloud,
    // anggap penghapusan cloud sebagai perubahan yang harus dihormati.
  }
  return merged;
}
function fromCloudRows(rows){
  const p=rows.profiles?.[0],base=db.cloudBase||null;
  const localOnly={reminders:db.reminders||[],templates:db.templates||{...DEF_TPL},lang:db.lang||'id',fontSize:db.fontSize||'medium',seq:db.seq||0,plan:db.plan||fresh().plan,cloudDeleted:db.cloudDeleted||fresh().cloudDeleted,cloudBase:base};
  const map=(arr,fn)=>(arr||[]).map(fn);
  const remote={
    profile:p?{ownerName:p.owner_name||'',kosName:p.kos_name||'',address:p.address||'',wa:p.wa||'',info:p.info||'',recoveryWa:p.recovery_wa||''}:null,
    types:map(rows.room_types,x=>({id:x.id,name:x.name,price:Number(x.price)||0,facilities:x.facilities||''})),
    rooms:map(rows.rooms,x=>({id:x.id,number:x.number,typeId:x.type_id,price:Number(x.price)||0,facilities:x.facilities||''})),
    residents:map(rows.residents,x=>({id:x.id,fullName:x.full_name,phone:x.phone||'',roomId:x.room_id,rent:Number(x.rent)||0,startDate:x.start_date,dueDay:x.due_day,photo:null,active:x.active!==false,exitDate:x.exit_date||''})),
    bills:map(rows.bills,x=>({id:x.id,no:x.bill_no,residentId:x.resident_id,name:x.resident_name,roomNo:x.room_no,period:x.period,amount:Number(x.amount)||0,dueDate:x.due_date,paidDate:x.paid_date||'',method:x.method||'',receiptNo:x.receipt_no||''})),
    expenses:map(rows.expenses,x=>({id:x.id,name:x.name,category:x.category,amount:Number(x.amount)||0,date:x.date,method:x.method||'',note:x.note||''}))
  };
  const localProfile=db.profile||null;
  if(localProfile&&remote.profile&&base?.profile){
    const localChanged=!sameCloudValue(localProfile,base.profile),remoteChanged=!sameCloudValue(remote.profile,base.profile);
    remote.profile=localChanged&&!remoteChanged?localProfile:remote.profile;
  }else if(!remote.profile){remote.profile=localProfile}
  const keys=['types','rooms','residents','bills','expenses'];
  const cloudKeys={types:'room_types',rooms:'rooms',residents:'residents',bills:'bills',expenses:'expenses'};
  for(const key of keys){
    const cloudKey=cloudKeys[key],deleted=localOnly.cloudDeleted?.[cloudKey]||[];
    remote[key]=mergeCloudRows(db[key]||[],remote[key],base?.[key]||[],deleted);
  }
  db={...fresh(),...localOnly,...remote};
  lang=db.lang||'id';
}
async function readCloudTables(){
  if(!activeUser?.id)throw new Error('Sesi akun tidak ditemukan. Silakan masuk kembali.');
  const names=['profiles','room_types','rooms','residents','bills','expenses'],out={};
  for(const name of names){
    let query=supabaseClient.from(name).select('*');
    query=name==='profiles'?query.eq('id',activeUser.id):query.eq('owner_id',activeUser.id);
    const {data,error}=await query;
    if(error)throw new Error(`${name}: ${error.message}`);
    out[name]=data||[];
  }
  return out;
}
async function writeCloudTables(){
  if(!activeUser?.id)throw new Error('Sesi akun tidak ditemukan. Silakan masuk kembali.');
  const ownerId=activeUser.id,rows=toCloudRows();
  // Snapshot harus mewakili data yang benar-benar dikirim pada awal proses ini.
  // Jika pengguna mengedit saat request berjalan, save() akan menjadwalkan sync berikutnya.
  const sentSnapshot=cloudSnapshot();

  // Upsert hanya data milik akun aktif. Baris kosong tidak berarti menghapus tabel.
  for(const name of ['profiles','room_types','rooms','residents','bills','expenses']){
    const list=name==='profiles'?(rows.profiles?[rows.profiles]:[]):rows[name];
    if(!list.length)continue;
    const {error}=await supabaseClient.from(name).upsert(list,{onConflict:'id'});
    if(error)throw new Error(`${name}: ${error.message}`);
  }

  // Hapus hanya ID yang memang dihapus melalui aplikasi, selalu dibatasi owner_id.
  // Periksa dulu ID yang masih terlihat, lalu konfirmasi setiap penghapusan.
  // Urutan anak ke induk untuk mengurangi konflik foreign key.
  const deletionOrder=['bills','expenses','residents','rooms','room_types'];
  db.cloudDeleted=db.cloudDeleted||{};
  for(const name of deletionOrder){
    const ids=[...new Set(db.cloudDeleted[name]||[])].filter(Boolean);
    if(!ids.length)continue;
    const {data:existing,error:readError}=await supabaseClient.from(name)
      .select('id').eq('owner_id',ownerId).in('id',ids);
    if(readError)throw new Error(`Verifikasi antrean ${name}: ${readError.message}`);
    const existingIds=(existing||[]).map(row=>row.id);
    if(existingIds.length){
      const {data:deleted,error}=await supabaseClient.from(name)
        .delete().eq('owner_id',ownerId).in('id',existingIds).select('id');
      if(error)throw new Error(`Penghapusan ${name}: ${error.message}`);
      const deletedIds=new Set((deleted||[]).map(row=>row.id));
      const missing=existingIds.filter(id=>!deletedIds.has(id));
      if(missing.length)throw new Error(`Penghapusan ${name} belum terkonfirmasi untuk ${missing.length} ID. Antrean dipertahankan.`);
    }
    // ID yang sudah tidak ada di cloud dianggap selesai (operasi idempoten).
    db.cloudDeleted[name]=(db.cloudDeleted[name]||[]).filter(id=>!ids.includes(id));
  }
  db.cloudBase=sentSnapshot;
  try{localStorage.setItem(USER_KEY_PREFIX+ownerId,JSON.stringify(db))}
  catch{toast('Perubahan tersimpan di cloud, tetapi antrean lokal tidak dapat diperbarui.','error')}
}
async function initializeCloudData(user){
  if(!user||activeUser?.id!==user.id)return;
  cloudReady=false;
  try{
    const remote=await readCloudTables();
    fromCloudRows(remote);
    normalizeCloudIds();
    save();
    await writeCloudTables();
    cloudReady=true;
    localStorage.setItem(USER_KEY_PREFIX+user.id,JSON.stringify(db));
    // Jika pengguna mengubah data saat sinkronisasi awal berlangsung, kirim
    // perubahan susulan setelah koneksi cloud dinyatakan siap.
    if(!sameCloudValue(cloudSnapshot(),db.cloudBase))queueCloudSync();
    boot();
    toast('Data KosManager berhasil disambungkan dan disinkronkan dengan Supabase.','success');
  }catch(error){
    cloudReady=false;
    console.error('KosManager cloud sync:',error);
    toast(`Sinkronisasi Supabase belum berhasil: ${error.message}`,'error');
  }
}
function queueCloudSync(){
  if(!cloudReady)return;
  if(cloudSyncRunning){cloudSyncQueued=true;return}
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer=setTimeout(async()=>{
    if(!cloudReady||!activeUser)return;
    cloudSyncRunning=true;
    try{await writeCloudTables()}
    catch(error){console.error('KosManager cloud save:',error);toast(`Gagal menyimpan ke cloud: ${error.message}`,'error')}
    finally{cloudSyncRunning=false;if(cloudSyncQueued){cloudSyncQueued=false;queueCloudSync()}}
  },700);
}

// Diagnostik aman: membaca data akun aktif, lalu CRUD pada baris sementara
// dengan UUID baru. Tidak pernah mengubah/menghapus baris bisnis yang sudah ada.
async function runKosDiagnostics(){
  const button=document.getElementById('btnRunDiagnostics');
  const status=document.getElementById('diagStatus');
  const output=document.getElementById('diagOutput');
  const lines=[];
  const add=(label,detail='')=>lines.push(`${label}: ${detail}`);
  const paint=(state,message)=>{
    if(status){status.className=`diag-status ${state}`;status.textContent=message}
    if(output){output.hidden=false;output.textContent=lines.join('\n')}
  };
  if(!button||button.disabled)return;
  if(!activeUser?.id){paint('fail','Gagal: belum ada akun yang masuk.');return}
  button.disabled=true;button.textContent='Menjalankan pemeriksaan…';
  paint('running','Diagnostik sedang berjalan. Jangan tutup aplikasi.');
  const ownerId=activeUser.id;
  const marker=`KM_DIAG_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  const todayValue=today();
  const ids={type:makeUuid(),room:makeUuid(),resident:makeUuid(),bill:makeUuid(),expense:makeUuid()};
  const cleanup=async()=>{
    const order=[['bills',ids.bill],['residents',ids.resident],['rooms',ids.room],['room_types',ids.type],['expenses',ids.expense]];
    for(const [table,id] of order){
      try{
        // ID UUID ini dibuat khusus oleh diagnostik. Aman mencoba membersihkannya
        // meskipun request INSERT sebelumnya mengalami timeout setelah commit.
        const {data:before,error:readError}=await supabaseClient.from(table)
          .select('id').eq('owner_id',ownerId).eq('id',id).maybeSingle();
        if(readError)throw readError;
        if(!before){add(`BERSIH ${table}`,'tidak ada baris uji yang tertinggal');continue}
        const {data,error}=await supabaseClient.from(table).delete()
          .eq('owner_id',ownerId).eq('id',id).select('id');
        if(error)throw error;
        if(!(data||[]).some(x=>x.id===id))throw new Error('baris tidak terkonfirmasi terhapus oleh Supabase');
        add(`BERSIH ${table}`,'data sementara berhasil dihapus');
      }catch(error){add(`PERINGATAN ${table}`,`data uji mungkin masih tersimpan (ID ${id}): ${error.message||error}`)}
    }
  };
  const insertAndUpdate=async(table,id,payload,patch,verifyField,expected)=>{
    const {data,error}=await supabaseClient.from(table).insert({...payload,id,owner_id:ownerId}).select('id').single();
    if(error)throw new Error(`${table} INSERT: ${error.message}`);
    add(`INSERT ${table}`,'berhasil');
    const {data:updated,error:updateError}=await supabaseClient.from(table).update(patch).eq('id',id).eq('owner_id',ownerId).select('id').single();
    if(updateError)throw new Error(`${table} UPDATE: ${updateError.message}`);
    if(!updated?.id)throw new Error(`${table} UPDATE: tidak ada baris yang dikembalikan`);
    const {data:check,error:checkError}=await supabaseClient.from(table).select(verifyField).eq('id',id).eq('owner_id',ownerId).single();
    if(checkError)throw new Error(`${table} SELECT verifikasi: ${checkError.message}`);
    if(String(check?.[verifyField])!==String(expected))throw new Error(`${table}: nilai setelah UPDATE tidak cocok`);
    add(`UPDATE + SELECT ${table}`,'berhasil dan nilai terverifikasi');
  };
  try{
    const {data:authData,error:authError}=await supabaseClient.auth.getUser();
    if(authError||authData?.user?.id!==ownerId)throw new Error('Sesi autentikasi tidak valid atau berubah. Silakan masuk kembali.');
    add('AUTH','sesi akun aktif valid');

    const {data:profile,error:profileError}=await supabaseClient.from('profiles').select('id').eq('id',ownerId).maybeSingle();
    if(profileError)throw new Error(`profiles SELECT: ${profileError.message}`);
    add('SELECT profiles',profile?'berhasil':'tidak ditemukan profil untuk akun ini');

    const tables=['room_types','rooms','residents','bills','expenses'];
    for(const table of tables){
      const {count,error}=await supabaseClient.from(table).select('id',{count:'exact',head:true}).eq('owner_id',ownerId);
      if(error)throw new Error(`${table} SELECT: ${error.message}`);
      add(`SELECT ${table}`,`berhasil; jumlah baris milik akun: ${count??'tidak diketahui'}`);
    }

    await insertAndUpdate('room_types',ids.type,{name:`${marker}_TYPE`,price:1000,facilities:'diagnostic'},{name:`${marker}_TYPE_UPDATED`,price:2000},'price',2000);
    await insertAndUpdate('rooms',ids.room,{number:`${marker}_ROOM`,type_id:ids.type,price:2000,facilities:'diagnostic'},{price:3000},'price',3000);
    await insertAndUpdate('residents',ids.resident,{full_name:`${marker}_RESIDENT`,phone:'',room_id:ids.room,rent:3000,start_date:todayValue,due_day:1,photo:null,active:true,exit_date:null},{rent:4000},'rent',4000);
    await insertAndUpdate('bills',ids.bill,{bill_no:`${marker}_BILL`,resident_id:ids.resident,resident_name:`${marker}_RESIDENT`,room_no:`${marker}_ROOM`,period:'2099-12',amount:4000,due_date:todayValue,paid_date:null,method:null,receipt_no:null},{amount:5000},'amount',5000);
    await insertAndUpdate('expenses',ids.expense,{name:`${marker}_EXPENSE`,category:'diagnostic',amount:1000,date:todayValue,method:'diagnostic',note:marker},{amount:2000},'amount',2000);
    add('CRUD','seluruh uji INSERT, UPDATE, SELECT pada lima tabel berhasil');
  }catch(error){
    add('HASIL','pemeriksaan berhenti karena ada operasi yang gagal');
    add('DETAIL',error?.message||String(error));
  }finally{
    await cleanup();
    const leftovers=lines.some(x=>x.startsWith('PERINGATAN '));
    const failed=lines.some(x=>x.startsWith('DETAIL:'))||leftovers;
    add('RINGKASAN',failed?'Ada pemeriksaan gagal/perlu tindak lanjut.':'Semua pemeriksaan yang dijalankan berhasil; data sementara dibersihkan.');
    paint(failed?'fail':'success',failed?'Diagnostik selesai dengan temuan. Periksa rincian di bawah.':'Diagnostik selesai. Operasi yang diuji berhasil dan data sementara dibersihkan.');
    button.disabled=false;
    button.innerHTML='<i data-lucide="activity"></i><span>Jalankan ulang diagnostik</span>';
    if(window.lucide?.createIcons)window.lucide.createIcons();
  }
}
document.getElementById('btnRunDiagnostics')?.addEventListener('click',runKosDiagnostics);

// 6. Status sesi: data lokal disimpan terpisah berdasarkan ID akun.
supabaseClient.auth.onAuthStateChange((event, session) => {
  const user = session?.user || null;
  const loginScreen = document.getElementById('loginScreen');
  const onboarding = document.getElementById('onboarding');
  const app = document.getElementById('app');

  if (user) {
    const changedAccount = activeUser?.id !== user.id;
    activeUser = user;
    if (changedAccount) {
      db = loadForUser(user.id);
      lang = db.lang || 'id';
      // Data lama tidak dipindahkan otomatis karena sebelumnya dipakai bersama semua akun.
      const legacy = localStorage.getItem(KEY);
      const migratedTo = localStorage.getItem(LEGACY_MIGRATION_KEY);
      if (!localStorage.getItem(USER_KEY_PREFIX + user.id) && legacy && !migratedTo) {
        const accept = window.confirm('Ditemukan data KosManager versi lama di perangkat ini. Impor data tersebut ke akun yang sedang masuk? Pilih OK hanya jika data lama ini memang milik akun ini. Data lama tetap disimpan sebagai cadangan.');
        if (accept) {
          try {
            const oldData = JSON.parse(legacy);
            if (oldData && Array.isArray(oldData.rooms)) {
              db = { ...fresh(), ...oldData };
              lang = db.lang || 'id';
              localStorage.setItem(USER_KEY_PREFIX + user.id, JSON.stringify(db));
              localStorage.setItem(LEGACY_MIGRATION_KEY, user.id);
              toast('Data lama berhasil disalin ke akun ini. Cadangan lama tetap tersimpan.', 'success');
            }
          } catch { toast('Data lama tidak dapat dibaca. Cadangan aslinya tetap tersimpan.', 'error'); }
        }
      }
    }
    if (changedAccount) {
      cloudReady=false;
      void initializeCloudData(user);
    }
    if (loginScreen) loginScreen.hidden = true;
    closeRegisterModal();
    if (!db.profile) {
      if (onboarding) onboarding.hidden = false;
      if (app) app.hidden = true;
      icons();
    } else {
      if (onboarding) onboarding.hidden = true;
      if (app) app.hidden = false;
      boot();
      const waInput = document.getElementById('ownerWaRecovery');
      if (waInput && db.profile.recoveryWa) waInput.value = db.profile.recoveryWa;
    }
  } else {
    cloudReady=false;
    activeUser = null;
    db = fresh();
    lang = 'id';
    if (loginScreen) loginScreen.hidden = false;
    if (onboarding) onboarding.hidden = true;
    if (app) app.hidden = true;
    closeRegisterModal();
    icons();
  }
});

/* ==========================================================
   FITUR TAMBAHAN (QRIS & PEMBAYARAN PREMIUM)
   ========================================================== */
/* ---------- Paket & checkout langganan ---------- */
const PLANS={
  basic:{name:'Basic',rooms:15,monthly:19000,prices:{1:19000,3:54000,6:102000,12:190000},features:['Maksimal 15 kamar','Data penghuni & kamar','Pencatatan pembayaran','Pemasukan dan pengeluaran','Struk pembayaran','Pengingat jatuh tempo','Laporan keuangan dasar']},
  standard:{name:'Standard',rooms:30,monthly:39000,prices:{1:39000,3:111000,6:210000,12:390000},features:['Maksimal 30 kamar','Semua fitur Basic','Laporan keuangan lengkap','Ekspor laporan PDF/Excel','Riwayat transaksi 12 bulan','1 akun pengelola tambahan']},
  business:{name:'Business',rooms:100,monthly:79000,prices:{1:79000,3:225000,6:426000,12:790000},features:['Maksimal 100 kamar','Semua fitur Standard','Riwayat transaksi 24 bulan','Hingga 3 akun pengelola','Pengelolaan hingga 3 lokasi','Dukungan prioritas']}
};
const DURATIONS={1:'1 Bulan',3:'3 Bulan',6:'6 Bulan',12:'1 Tahun'};
let selectedPlan='standard',selectedDuration=12,selectedMethod='qris';
const REK={bank:[{nama:'SeaBank',no:'901382587165',an:"M.as'ad"}],ewallet:[{nama:'DANA',no:'089509584891',an:"M.AS'AD"},{nama:'ShopeePay',no:'089509584891',an:'storeqp102'}]};
const adminWhatsApp='6289509584891';
function planPrice(key,duration){return PLANS[key].prices[duration]}
function renderPricing(){
  const grid=$('#pricingPlans');if(!grid)return;
  selectedDuration=Number($('#subscriptionDuration')?.value||selectedDuration);
  grid.innerHTML=Object.entries(PLANS).map(([key,p])=>{
    const price=planPrice(key,selectedDuration),monthly=Math.round(price/selectedDuration),discount=Math.max(0,p.monthly*selectedDuration-price),chosen=key===selectedPlan;
    return `<article class="pricing-card ${key==='standard'?'pricing-featured':''} ${chosen?'selected':''}">
      ${key==='standard'?'<span class="popular-label">PALING DIREKOMENDASIKAN</span>':''}
      <div class="pricing-card-top"><div><h4>${p.name}</h4><p>${p.rooms} kamar</p></div><span class="plan-symbol"><i data-lucide="${key==='basic'?'house':key==='standard'?'building-2':'buildings'}"></i></span></div>
      <div class="pricing-price"><strong>${rp(price)}</strong><span>/ ${DURATIONS[selectedDuration].toLowerCase()}</span></div>
      <p class="pricing-monthly">Setara ${rp(monthly)} per bulan</p>
      ${discount?`<span class="saving-label">Hemat ${rp(discount)}</span>`:'<span class="saving-label saving-neutral">Harga reguler</span>'}
      <ul>${p.features.map(f=>`<li><i data-lucide="check"></i>${esc(f)}</li>`).join('')}</ul>
      <button type="button" class="btn ${chosen?'btn-primary':'btn-ghost'} btn-block" data-select-plan="${key}">${chosen?'Paket dipilih':'Pilih '+p.name}</button>
    </article>`;
  }).join('');
  grid.querySelectorAll('[data-select-plan]').forEach(b=>b.addEventListener('click',()=>{selectedPlan=b.dataset.selectPlan;renderPricing();renderSubscriptionCheckout()}));
  icons();
}
function renderSubscriptionCheckout(){
  const area=$('#subscriptionCheckout');if(!area)return;
  const p=PLANS[selectedPlan],price=planPrice(selectedPlan,selectedDuration),regular=p.monthly*selectedDuration,saving=regular-price;
  $('#subscriptionOrderSummary').innerHTML=`<div class="order-summary"><div><span>Ringkasan langganan</span><strong>${p.name} · ${DURATIONS[selectedDuration]}</strong></div><div><span>Kapasitas</span><strong>Maksimal ${p.rooms} kamar</strong></div>${saving?`<div><span>Penghematan</span><strong class="saving-text">${rp(saving)}</strong></div>`:''}<div class="order-total"><span>Total pembayaran</span><strong>${rp(price)}</strong></div></div>`;
  const qr=document.querySelector('#subscriptionPaymentDetail img');
  if(selectedMethod==='qris'){
    $('#subscriptionPaymentDetail').innerHTML=`<div class="payment-detail payment-qris"><img src="1000921090.jpg" alt="QRIS pembayaran" onerror="this.style.display='none'"><p><strong>Scan QRIS</strong><br>Masukkan nominal tepat <b>${rp(price)}</b>. QRIS tidak mengisi nominal secara otomatis.</p></div>`;
  }else{
    const rows=(selectedMethod==='bank'?REK.bank:REK.ewallet).map(a=>`<div class="account-row"><div><small>${a.nama} · a.n. ${esc(a.an)}</small><strong>${a.no}</strong></div><button type="button" class="btn btn-ghost btn-sm" data-copy-account="${a.no}">Salin</button></div>`).join('');
    $('#subscriptionPaymentDetail').innerHTML=`<div class="payment-detail">${rows}</div>`;
  }
  $('#subscriptionPaymentMethods').querySelectorAll('[data-method]').forEach(b=>b.classList.toggle('active',b.dataset.method===selectedMethod));
  $('#subscriptionPaymentDetail').querySelectorAll('[data-copy-account]').forEach(b=>b.onclick=()=>copyText(b.dataset.copyAccount));
  area.hidden=false;icons();
}
function copyText(value){if(navigator.clipboard?.writeText){navigator.clipboard.writeText(value).then(()=>toast('Nomor berhasil disalin')).catch(()=>toast('Tidak dapat menyalin nomor','error'));}else{const el=document.createElement('textarea');el.value=value;document.body.append(el);el.select();document.execCommand('copy');el.remove();toast('Nomor berhasil disalin')}}
$('#subscriptionDuration')?.addEventListener('change',()=>{selectedDuration=Number($('#subscriptionDuration').value);renderPricing();renderSubscriptionCheckout()});
$('#subscriptionPaymentMethods')?.addEventListener('click',e=>{const b=e.target.closest('[data-method]');if(!b)return;selectedMethod=b.dataset.method;renderSubscriptionCheckout()});
$('#btnKonfirmasiLangganan')?.addEventListener('click',()=>{
  const p=PLANS[selectedPlan],price=planPrice(selectedPlan,selectedDuration),email=activeUser?.email||'-';
  const message=`Halo Admin KosManager, saya ingin konfirmasi pembayaran langganan.\nPaket: ${p.name}\nDurasi: ${DURATIONS[selectedDuration]}\nJumlah kamar: maksimal ${p.rooms}\nTotal: ${rp(price)}\nMetode: ${selectedMethod.toUpperCase()}\nEmail akun: ${email}\n\nSaya akan melampirkan bukti pembayaran. Mohon verifikasi dan informasikan aktivasi paket. Terima kasih.`;
  window.open(`https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(message)}`,'_blank','noopener');
});
function renderPlanStatus(){
  const box=$('#currentPlanStatus');if(!box)return;
  const plan=db.plan||{},tier=plan.tier||'free',until=plan.until||'';
  const active=!!until&&until>=today()&&tier!=='free';
  const expired=!!until&&until<today()&&tier!=='free';
  const label=PLANS[tier]?.name||(tier==='pro'?'Pro':'Gratis');
  if(active){
    box.innerHTML=`<div class="active-plan"><span class="active-dot"></span><div><strong>Paket ${esc(label)} aktif <span class="plan-state-pill is-active">AKTIF</span></strong><small>Langganan berlaku sampai ${fd(until)}. Label PRO akan terlihat di nama aplikasi.</small></div></div>`;
  }else if(expired){
    box.innerHTML=`<div class="inactive-plan"><strong>Paket ${esc(label)} sudah berakhir <span class="plan-state-pill is-expired">KEDALUWARSA</span></strong><small>Masa langganan berakhir pada ${fd(until)}. Pilih paket untuk berlangganan kembali.</small></div>`;
  }else{
    box.innerHTML=`<div class="inactive-plan"><strong>Paket Gratis aktif <span class="plan-state-pill is-free">GRATIS</span></strong><small>Belum ada langganan berbayar yang aktif. Memilih paket atau mengirim konfirmasi WhatsApp belum mengaktifkan paket; admin harus memverifikasi pembayaran terlebih dahulu.</small></div>`;
  }
}
renderPricing();renderPlanStatus();
function applyProBadge(){
  $$('.pro-badge').forEach(b=>b.remove());
  if(!isPro())return;
  const targets=[$('.app-title'),$('#brandName')].filter(Boolean);
  targets.forEach(e=>{
    const b=document.createElement('span');b.className='pro-badge';b.textContent='PRO';
    b.title='Paket '+(PLANS[db.plan.tier]?.name||'Pro')+' aktif sampai '+fd(db.plan.until);
    e.appendChild(b);
  });
}
function applyPro(){applyProBadge();renderPlanStatus()}
const _topbar=topbar;
topbar=function(){_topbar.apply(this,arguments);applyPro()};
// Jalankan sistem boot pertama kali

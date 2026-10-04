import json, os, urllib.request, tempfile
from datetime import datetime, date
from collections import Counter, defaultdict
from openpyxl import load_workbook
URL = os.environ.get("ONEDRIVE_XLSX_URL", "").strip()
LOCAL = os.environ.get("LOCAL_XLSX_PATH", "").strip()
if not URL and not LOCAL: raise SystemExit("Set ONEDRIVE_XLSX_URL or LOCAL_XLSX_PATH")
def clean(v):
    if v is None: return None
    s=str(v).strip(); return s if s and s.lower()!="nan" else None
def dt(v):
    if isinstance(v, datetime): return v.date().isoformat()
    if isinstance(v, date): return v.isoformat()
    return None
def cat(raw, ret, mom):
    s=(clean(raw) or "").upper().replace(" ","-"); today=date.today().isoformat()
    if "LOST" in s: return "lost"
    if "DAMAGE" in s: return "damaged"
    if "DELAY" in s: return "delayed"
    if "REPLACE" in s: return "replaced"
    if "EXPIRED" in s: return "expired"
    if "LOANED" in s: return "expired" if mom and mom < today else "loaned"
    if "RETURNED" in s: return "returned"
    return "returned" if ret else "loaned"
def norm(x): return " ".join(str(x or "").split()).upper()
def qty(v):
    try: return int(v)
    except Exception: return 1
if LOCAL:
    path = LOCAL
else:
    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        urllib.request.urlretrieve(URL, tmp.name); path=tmp.name
wb=load_workbook(path, read_only=True, data_only=True); records=[]; seen=set()
for sheet in ("Daily Issue LE Item", "Old Record"):
    if sheet not in wb.sheetnames: continue
    ws=wb[sheet]; header=None
    for i,row in enumerate(ws.iter_rows(values_only=True, max_col=20)):
        if i==0: header=[norm(x) for x in row]; continue
        if not any(clean(v) for v in row): continue
        d={header[j]: row[j] for j in range(min(len(header),len(row))) if header[j]}
        g=lambda *keys: next((d[k] for k in keys if k in d), None)
        issue,ret,mom=dt(g("ISSUED DATE")),dt(g("DATE OF RETURNED")),dt(g("MOM CERTIFICATE EXPIRED DATE")); raw=clean(g("RETURNED STATUS","RETURN STATUS"))
        rec={"issueDate":issue,"empNo":clean(g("EMP.NO/ WORK PERMIT")),"borrowerName":clean(g("NAME OF BORROWER")),"contractor":clean(g("CONTRACTOR")),"department":clean(g("DEPARTMENT/ SECTION")),"vessel":clean(g("VESSELS NAME / LOCATION")),"voucherNo":clean(g("ISSUE VOUCHER NO:")),"equipmentNo":clean(g("LE NO.")),"ownerDistinctive":clean(g("OWNERS DISTINCTIVE")),"manufacturedYear":clean(g("MANUFACTURED YEAR")),"description":clean(g("DESCRIPTION OF THE LIFTING EQUIPMENT")),"qty":qty(g("QTY")),"lastLoadTestDate":dt(g("LAST LOAD TEST DATE")),"momExpiryDate":mom,"returnDate":ret,"returnStatusRaw":raw,"statusCategory":cat(raw,ret,mom),"damageReport":clean(g("DAMAGE REPORT & OTHERS")),"sourceSheet":sheet}
        if not any([rec["issueDate"],rec["equipmentNo"],rec["description"],rec["borrowerName"],rec["voucherNo"]]): continue
        key=json.dumps(rec,sort_keys=True)
        if key in seen: continue
        seen.add(key); records.append(rec)
today=date.today().isoformat(); soon=date.fromordinal(date.today().toordinal()+30).isoformat()
status=Counter(r["statusCategory"] for r in records); vessel=Counter(r["vessel"] for r in records if r["vessel"]); contractor=Counter(r["contractor"] for r in records if r["contractor"]); equip=Counter(r["description"] for r in records if r["description"])
def category(desc):
    s=(desc or "").upper()
    if "CHAIN BLOCK" in s: return "Chain Blocks"
    if "WIRE ROPE" in s: return "Wire Ropes"
    if "SHACKLE" in s: return "Shackles"
    if "WEBBING" in s or "SLING" in s: return "Slings"
    if "HOIST" in s: return "Hoists"
    if "CLAMP" in s: return "Clamps"
    if "BEAM" in s or "GIRDER" in s: return "Beams & Girders"
    if "FORK" in s: return "Forklift Attachments"
    if "LIFTING" in s and "FRAME" in s: return "Lifting Frames"
    return "Other Equipment"
for r in records: r["category"]=category(r["description"])
catcount=Counter(r["category"] for r in records)
monthly=defaultdict(lambda:{"month":"","issued":0,"returned":0})
for r in records:
    if r["issueDate"]:
        m=r["issueDate"][:7]; monthly[m]["month"]=m; monthly[m]["issued"]+=1; monthly[m]["returned"]+=1 if r["returnDate"] else 0
summary={"totals":{"total":len(records),"loaned":sum(1 for r in records if r["statusCategory"] in ("loaned","expired")),"returned":status["returned"],"damaged":status["damaged"],"delayed":status["delayed"],"expiredCert":sum(1 for r in records if r["momExpiryDate"] and r["momExpiryDate"]<today),"expiringSoon":sum(1 for r in records if r["momExpiryDate"] and today<=r["momExpiryDate"]<=soon),"lost":status["lost"]},"byStatus":[{"name":k,"value":v} for k,v in status.most_common()],"byVessel":[{"name":k,"value":v} for k,v in vessel.most_common(14)],"byContractor":[{"name":k,"value":v} for k,v in contractor.most_common(12)],"byEquipment":[{"name":k,"value":v} for k,v in equip.most_common(12)],"byCategory":[{"name":k,"value":v} for k,v in catcount.most_common()],"monthly":[monthly[k] for k in sorted(monthly)]}
records.sort(key=lambda r:(r["issueDate"] or "",r["equipmentNo"] or ""),reverse=True)
out={"generatedAt":datetime.utcnow().isoformat()+"Z","summary":summary,"options":{"statuses":sorted(status),"vessels":sorted(vessel),"contractors":sorted(contractor),"categories":sorted(catcount)},"records":records}
open("data.json","w").write(json.dumps(out,separators=(",",":")))
print("wrote data.json",len(records),"total",len(out["records"]),"recent")

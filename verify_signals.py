import json
import requests
import concurrent.futures

# Archivos JSON a verificar
base_url = "https://ube1492.github.io/IPTV-UBE/sources/"
files = [
    "pe.json",
    "v_pe.json",
    "pe_premium.json",
    "pe_regionales.json",
    "co.json",
    "ec.json",
    "bo.json",
    "mx.json",
    "ar.json",
    "es.json",
    "us.json"
]

def check_url(url, channel_name, file_name):
    try:
        # Algunos streams requieren un User-Agent de IPTV
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        # Usamos GET en lugar de HEAD porque algunos servidores bloquean HEAD
        res = requests.get(url, headers=headers, timeout=10, stream=True)
        status = res.status_code
        
        # Leemos solo el inicio para confirmar que hay datos
        if status == 200:
            it = res.iter_content(chunk_size=1024)
            next(it) # Intentar leer el primer chunk
            
        res.close()
        return (file_name, channel_name, url, status)
    except Exception as e:
        return (file_name, channel_name, url, "OFFLINE")

all_results = []

for f in files:
    url = base_url + f
    print(f"Buscando canales en {f}...")
    try:
        r = requests.get(url, timeout=10)
        data = r.json()
        
        sources = data.get("sources", {})
        
        urls_to_check = []
        for channel, links in sources.items():
            for link in links:
                if link and link.startswith("http"):
                    urls_to_check.append((link, channel, f))
        
        if not urls_to_check:
            print(f"  [!] No se encontraron links en {f}")
            continue

        print(f"  Verificando {len(urls_to_check)} señales...")
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=15) as executor:
            future_to_url = {executor.submit(check_url, u, c, fn): (u, c, fn) for u, c, fn in urls_to_check}
            for future in concurrent.futures.as_completed(future_to_url):
                all_results.append(future.result())
                
    except Exception as e:
        print(f"Error procesando {f}: {e}")

# Generar reporte resumido
print("\n" + "="*40)
print("REPORTE DE ESTADO DE SEÑAL")
print("="*40)

for fn in files:
    file_results = [r for r in all_results if r[0] == fn]
    if not file_results: continue
    
    # 200/206 = OK, 403 = Protegido (funciona en App)
    working = [r for r in file_results if r[3] in [200, 206, 403]]
    dead = [r for r in file_results if r[3] not in [200, 206, 403]]
    
    status_icon = "?" if len(working) > 0 else "?"
    print(f"\n{status_icon} {fn.upper()}:")
    print(f"   [+] Funcionando: {len(working)}")
    print(f"   [-] Caídos: {len(dead)}")
    
    if len(dead) > 0:
        print("   Detalle de caídos (top 5):")
        for r in dead[:5]:
            channel_name = r[1] if r[1] else "Canal sin nombre"
            print(f"     - {channel_name} (Status: {r[3]})")

print("\n" + "="*40)
print("FIN DEL REPORTE")
print("="*40)

#!/usr/bin/env python3
"""Upload finished files to SharePoint 1-Review/<folder>/ via Microsoft Graph.

Usage:  python3 upload.py "<folder name>" file1 [file2 ...]

Needs three environment variables (set in the Claude cloud environment):
  ATRIA_TENANT_ID, ATRIA_CLIENT_ID, ATRIA_CLIENT_SECRET
for the Entra app "Atria Newsletter Uploader" (Graph application
permission Sites.ReadWrite.All; this script writes only to 1-Review).

Never overwrites anything: if 1-Review/<folder>/ already exists, it uploads
into <folder>_v2 (then _v3, ...) instead and prints the folder it used.
Exit code 0 only if every file uploaded.
"""
import json, os, sys, urllib.parse, urllib.request, urllib.error

DRIVE = "b!s0tDkY3S70q9yPKoEPe9ZVLHLXPrNMlEs51ouuJxuUDNfiWWuim4Sq3ZqAf7Tw2R"
BASE = "Atria File Server/Marketing/Newsletters/1-Review"


def token():
    try:
        t, c, s = (os.environ[k] for k in ("ATRIA_TENANT_ID", "ATRIA_CLIENT_ID", "ATRIA_CLIENT_SECRET"))
    except KeyError as e:
        sys.exit(f"Missing environment variable {e}; upload not possible.")
    body = urllib.parse.urlencode({
        "client_id": c, "client_secret": s, "grant_type": "client_credentials",
        "scope": "https://graph.microsoft.com/.default"}).encode()
    req = urllib.request.Request(f"https://login.microsoftonline.com/{t}/oauth2/v2.0/token", data=body)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)["access_token"]


def exists(tok, rel):
    url = (f"https://graph.microsoft.com/v1.0/drives/{DRIVE}/root:/"
           f"{urllib.parse.quote(rel)}")
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {tok}"})
    try:
        with urllib.request.urlopen(req, timeout=60):
            return True
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False
        raise


def free_folder(tok, folder):
    name, n = folder, 1
    while exists(tok, f"{BASE}/{name}"):
        n += 1
        name = f"{folder}_v{n}"
    return name


def put(tok, folder, path):
    name = os.path.basename(path)
    rel = urllib.parse.quote(f"{BASE}/{folder}/{name}")
    url = (f"https://graph.microsoft.com/v1.0/drives/{DRIVE}/root:/{rel}:/content"
           "?@microsoft.graph.conflictBehavior=fail")
    data = open(path, "rb").read()
    req = urllib.request.Request(url, data=data, method="PUT",
                                 headers={"Authorization": f"Bearer {tok}",
                                          "Content-Type": "application/octet-stream"})
    with urllib.request.urlopen(req, timeout=120) as r:
        item = json.load(r)
    # SharePoint rewrites Office files (adds document properties), so a
    # stored size different from the sent size is normal for .pptx/.docx.
    if not item.get("id"):
        raise RuntimeError("Graph returned no item id")
    return item.get("webUrl", "")


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    folder, files = sys.argv[1], sys.argv[2:]
    tok = token()
    folder = free_folder(tok, folder)
    print(f"FOLDER 1-Review/{folder}")
    failed = 0
    for f in files:
        try:
            url = put(tok, folder, f)
            print(f"OK    {os.path.basename(f)}  {os.path.getsize(f)} bytes  {url}")
        except urllib.error.HTTPError as e:
            failed += 1
            print(f"FAIL  {os.path.basename(f)}  HTTP {e.code}: {e.read().decode(errors='replace')[:300]}")
        except Exception as e:
            failed += 1
            print(f"FAIL  {os.path.basename(f)}  {e}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()

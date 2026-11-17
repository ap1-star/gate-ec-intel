"""Create portable source and prebuilt public-only archives. Run after npm run build."""
from pathlib import Path
import hashlib
import json
import os
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent
SOURCE = OUT / "GATE_EC_COMBINED_HOSTING_SOURCE.zip"
DROP = OUT / "GATE_EC_COMBINED_NETLIFY_DROP.zip"
BLOCKED_DIRS = {"node_modules", ".git", ".openai", ".data", "__pycache__", ".pytest_cache"}


def source_files():
    for directory, folders, filenames in os.walk(ROOT):
        folders[:] = sorted(name for name in folders if name not in BLOCKED_DIRS and not (Path(directory).relative_to(ROOT).parts == ("dist",) and name == "server") and not (Path(directory) / name).is_symlink())
        for filename in sorted(filenames):
            path = Path(directory) / filename
            relative = path.relative_to(ROOT)
            relative_text = relative.as_posix()
            if not path.is_file() or path.is_symlink():
                continue
            if relative_text in {"research/imported/scoreline/normalized-evidence.json", "research/imported/seatmap/normalized.json", "research/imported/seatmap/index.html", "research/imported/scoreline/raw/data/youtube.json"}:
                continue
            if relative_text.startswith("research/imported/scoreline/raw/") and not relative_text.startswith("research/imported/scoreline/raw/data/"):
                continue
            if path.name.startswith(".env") and path.name != ".env.example":
                continue
            if path.suffix in {".pyc", ".zip", ".log", ".sqlite", ".db", ".session-secret"} or ".sqlite-" in path.name:
                continue
            yield path, relative.as_posix()


def check_archive(path, required):
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None, f"Corrupt ZIP: {path.name}"
        names = set(archive.namelist())
        assert len(names) == len(archive.namelist()), "Duplicate ZIP entries"
        assert required <= names, f"Missing required root files: {required - names}"
        assert all(not name.startswith("/") and ".." not in name.split("/") for name in names)
        assert not any(set(name.split("/")) & BLOCKED_DIRS for name in names)
        assert not any(name.endswith((".sqlite", ".db", ".pyc", ".session-secret")) or ".sqlite-" in name for name in names)
        return names


assert (ROOT / "public/index.html").is_file(), "Run npm run build first"
with zipfile.ZipFile(SOURCE, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for path, relative in source_files():
        archive.write(path, relative)

html = (ROOT / "public/index.html").read_text(encoding="utf-8")
assert 'src="hosting-mode.js"' not in html, "Do not enable static mode in the full app"
assert html.count('<script src="features.js"></script>') == 1
drop_html = html.replace('<script src="features.js"></script>', '<script src="hosting-mode.js"></script><script src="features.js"></script>')
with zipfile.ZipFile(DROP, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for path in sorted((ROOT / "public").rglob("*")):
        if path.is_file() and not path.is_symlink():
            relative = path.relative_to(ROOT / "public").as_posix()
            if relative != "index.html":
                archive.write(path, relative)
    archive.writestr("index.html", drop_html.encode("utf-8"))
    archive.writestr("hosting-mode.js", "window.TERMINAL_STATIC_HOST = true;\n")
    archive.writestr(".nojekyll", "")
    archive.writestr("HOSTING_README.txt", "GATE EC Research Terminal - prebuilt public edition\n\nUpload this ZIP at https://app.netlify.com/drop, or extract and upload the folder containing index.html.\nFor GitHub Pages, keep .nojekyll and publish the extracted files.\n\nIncludes research, predictors and the bundled public career snapshot.\nAccounts, saved private records, source monitoring and automatic alerts require the separate source package and a persistent backend.\nRead HOSTING_GUIDE.md in the source package for Railway, Netlify and Vercel setup.\n")

source_names = check_archive(SOURCE, {"package.json", "package-lock.json", "Dockerfile", "railway.toml", "netlify.toml", "vercel.json", "HOSTING_GUIDE.md", "server/portable-server.mjs", "src/domains/pyq/catalogue.json", "public/index.html", ".env.example"})
drop_names = check_archive(DROP, {"index.html", "hosting-mode.js", ".nojekyll", "features.js", "_hosting/session.json", "_hosting/catalog.json"})
assert "research/imported/scoreline/raw/data/youtube.json" not in source_names
assert "research/imported/scoreline/raw/data/youtube-public.json" in source_names
with zipfile.ZipFile(DROP) as archive:
    for asset in re.findall(r'(?:src|href)=["\']([^"\']+)', drop_html):
        if asset.startswith("#") or "://" in asset:
            continue
        assert asset.split("?")[0] in drop_names, f"Missing HTML asset: {asset}"
    session = json.loads(archive.read("_hosting/session.json"))["data"]
    catalog = json.loads(archive.read("_hosting/catalog.json"))["data"]
    assert session["status"] == "unavailable" and session["user"] is None
    assert not session["capabilities"]["database"]
    assert len(catalog["pathways"]) == 104
    assert not any(name.startswith(("server/", "api/", "migrations/")) for name in drop_names)
    atlas = json.loads(archive.read("career-atlas.json"))
    assert atlas["counts"]["rawCcmtObservations"] == 56065
    assert atlas["counts"]["companyNames"] == 4536
    atlas_files = [item for value in atlas["assets"].values() for item in (value if isinstance(value, list) else [value])]
    for item in atlas_files:
        assert item in drop_names, f"Missing public atlas chunk: {item}"
        assert json.loads(archive.read(item))["version"] == atlas["version"], f"Mixed atlas versions: {item}"

manifest = {
    "edition": "portable-hosting",
    "backend": "Node 24 with persistent SQLite; configure the host variables and /data volume",
    "public_drop": "prebuilt snapshot; no private accounts or background runner",
    "artifacts": [{"file": path.name, "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()} for path in (SOURCE, DROP)],
    "validation": {"source_files": len(source_names), "drop_files": len(drop_names), "crc": "passed", "index_assets": "passed", "public_pathways": 104, "atlas": atlas["counts"], "atlas_version": atlas["version"]},
}
(OUT / "HOSTING_PACKAGE_MANIFEST.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(json.dumps(manifest, indent=2))

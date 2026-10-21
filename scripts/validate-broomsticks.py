"""Local artifact validation; run with the Heinlein Python (includes pypdf).

Requires Poppler and this repository's installed Node dependencies. No providers
are contacted. EPUB navigation, uniqueness and prose parity also run in npm test.
"""
from pathlib import Path
import hashlib
import re
import subprocess
import xml.etree.ElementTree as ET
import zipfile

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data/subscriber-gifts/broomsticks.md"
PDF = ROOT / "public/lead-magnets/broomsticks.pdf"
EPUB = PDF.with_suffix(".epub")
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == "a120180eb693201efa511abad57637036e0562393955a6bdad9764164ff02b92"
# This checksum-locked excerpt has only heading, emphasis and rule Markdown.
paragraphs = [p.replace("_", "").replace("*", "") for p in re.split(r"\n\s*\n", SOURCE.read_text())
              if not re.match(r"\s*(## |----)", p)]
expected = "".join(" ".join(paragraphs).split())
text = subprocess.check_output(["pdftotext", "-layout", str(PDF), "-"], text=True)
text = "\n".join(re.sub(r"(?m)^\s*\d+\s*$", "", page) for page in text.split("\f"))
# Chrome hyphenates automatically, including at existing literal hyphens.
# Permit a layout hyphen only at a line boundary: it must either represent
# the source's literal '-' or be a discretionary break inside the source word.
text = re.sub(r"\u2010\s*\n\s*", "\u00ad", text)
text = "".join(text.split())
text = text[text.index(expected[:40]):]
index = 0
for character in text:
    if index == len(expected):
        break
    if character == "\u00ad":
        if expected[index] == "-":
            index += 1
        continue
    assert character == expected[index], f"PDF story mismatch at character {index}"
    index += 1
assert index == len(expected), "PDF story truncated"

bbox = subprocess.check_output(["pdftotext", "-bbox", str(PDF), "-"], text=True)
namespace = {"x": "http://www.w3.org/1999/xhtml"}
for page in ET.fromstring(bbox).findall(".//x:page", namespace):
    for word in page.findall("x:word", namespace):
        assert float(word.attrib["xMin"]) >= 0 and float(word.attrib["yMin"]) >= 0
        assert float(word.attrib["xMax"]) <= float(page.attrib["width"])
        assert float(word.attrib["yMax"]) <= float(page.attrib["height"])
reader = PdfReader(PDF)
assert all(tuple(float(v) for v in page.mediabox[2:]) == (432.0, 648.0) for page in reader.pages)
uris = [annotation.get_object().get("/A", {}).get("/URI")
        for page in reader.pages for annotation in page.get("/Annots", [])]
assert "https://www.thearcades.me/novels/estelles-children" in uris
with zipfile.ZipFile(EPUB) as archive:
    assert archive.testzip() is None
    assert archive.infolist()[0].filename == "mimetype"
    assert archive.getinfo("mimetype").compress_type == zipfile.ZIP_STORED
    assert archive.read("mimetype") == b"application/epub+zip"
    container = ET.fromstring(archive.read("META-INF/container.xml"))
    package_path = container.find(".//{*}rootfile").attrib["full-path"]
    package = ET.fromstring(archive.read(package_path))
    manifest = {item.attrib["id"]: item.attrib["href"] for item in package.findall(".//{*}manifest/{*}item")}
    assert all(item.attrib["idref"] in manifest for item in package.findall(".//{*}spine/{*}itemref"))
    ns = {"dc": "http://purl.org/dc/elements/1.1/"}
    for field, value in [("title", "Broomsticks"), ("creator", "Austen Tucker"),
                         ("language", "en-US"), ("publisher", "Free Play Publishing")]:
        assert package.find(f".//dc:{field}", ns).text == value
subprocess.run(["node", "--import", "tsx", "--test", "lib/broomsticks-epub.test.ts"], cwd=ROOT, check=True)
print(f"PDF: {len(reader.pages)} pages, 6×9 in; extractable literal story parity, bounds and site link pass.")
print("EPUB: ZIP/metadata, unique IDs, intended navigation targets and literal story parity pass.")
for artifact in (PDF, EPUB):
    print(f"{artifact.name}: {artifact.stat().st_size} bytes; SHA-256 {hashlib.sha256(artifact.read_bytes()).hexdigest()}")

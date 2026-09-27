"""Extracteur de texte PDF avec décodage ToUnicode et reconstruction des lignes.

Usage : python scripts/extract_pdf_text.py Constitution.pdf > constitution.txt
Nécessaire pour importer fidèlement le texte officiel de la Constitution dans le wiki.
"""
import base64
import re
import sys
import zlib


def apply_filter(raw: bytes, name: bytes) -> bytes | None:
    """Applique un filtre de flux PDF et renvoie le résultat, ou None si échec."""
    if name in (b"ASCII85Decode", b"A85"):
        try:
            data = raw.strip()
            if data.startswith(b"<~"):
                data = data[2:]
            end = data.find(b"~>")
            if end != -1:
                data = data[:end]
            return base64.a85decode(data, adobe=False)
        except Exception:
            return None
    if name in (b"ASCIIHexDecode", b"AHx"):
        end = raw.find(b">")
        if end == -1:
            return None
        try:
            return bytes.fromhex(re.sub(rb"[^0-9A-Fa-f]", b"", raw[:end]).decode())
        except Exception:
            return None
    if name in (b"FlateDecode", b"Fl"):
        try:
            return zlib.decompress(raw)
        except Exception:
            return zlib.decompressobj().decompress(raw)
    return None


def stream_filters(body: bytes) -> list[bytes]:
    """Liste ordonnée des filtres déclarés dans le dictionnaire d'un flux."""
    match = re.search(rb"/Filter\s*(\[[^\]]*\]|/[A-Za-z0-9]+)", body)
    if not match:
        return []
    return re.findall(rb"/([A-Za-z0-9]+)", match.group(1))


def decode_literal(text: bytes, mapping: dict[int, str]) -> str:
    """Décode une chaîne littérale PDF `( … )` et ses échappements octaux.

    Les polices incorporées stockent leurs accents sous forme d'octets que
    seule la table ToUnicode sait traduire ; sans ce décodage, « Règlement »
    ressort en « R\\001glement » et « hiérarchie » en « hi\\002rarchie ».
    """
    out: list[str] = []
    index = 0
    simple = {
        b"n": "\n", b"r": "\r", b"t": "\t", b"b": "\b",
        b"f": "\f", b"(": "(", b")": ")", b"\\": "\\",
    }
    while index < len(text):
        char = text[index : index + 1]
        if char != b"\\":
            out.append(mapping.get(char[0], char.decode("latin-1", "replace")))
            index += 1
            continue
        nxt = text[index + 1 : index + 2]
        if nxt in simple:
            out.append(simple[nxt])
            index += 2
        elif nxt.isdigit():
            digits = b""
            cursor = index + 1
            while (
                cursor < len(text)
                and len(digits) < 3
                and text[cursor : cursor + 1].isdigit()
            ):
                digits += text[cursor : cursor + 1]
                cursor += 1
            code = int(digits, 8)
            out.append(mapping.get(code, chr(code) if code >= 32 else ""))
            index = cursor
        elif nxt in (b"\n", b""):
            index += 2
        else:
            out.append(nxt.decode("latin-1", "replace"))
            index += 2
    return "".join(out)


def load_objects(data: bytes) -> dict[int, bytes]:
    objects: dict[int, bytes] = {}
    for match in re.finditer(rb"(\d+)\s+0\s+obj(.*?)endobj", data, re.S):
        objects[int(match.group(1))] = match.group(2)
    return objects


def object_stream(body: bytes) -> bytes | None:
    match = re.search(rb"stream\r?\n", body)
    if not match:
        return None
    start = match.end()
    end = body.find(b"endstream", start)
    if end == -1:
        return None
    raw = body[start:end]

    # Les filtres s'appliquent dans l'ordre déclaré. Sans cette boucle, un PDF
    # dont le contenu est en ASCII85 + Flate — le Règlement du Ier Delphinat —
    # ne renvoyait que des octets illisibles, et la page vide.
    filters = stream_filters(body)
    if not filters:
        try:
            return zlib.decompress(raw)
        except Exception:
            return raw
    for name in filters:
        decoded = apply_filter(raw, name)
        if decoded is None:
            return None
        raw = decoded
    return raw


def hex_to_text(hex_digits: str) -> str:
    if len(hex_digits) % 2:
        hex_digits = "0" + hex_digits
    raw = bytes.fromhex(hex_digits)
    try:
        return raw.decode("utf-16-be")
    except Exception:
        return raw.decode("latin-1", "replace")


def parse_tounicode(stream: bytes) -> dict[int, str]:
    mapping: dict[int, str] = {}
    text = stream.decode("latin-1", "replace")
    for block in re.findall(r"beginbfchar(.*?)endbfchar", text, re.S):
        for src, dst in re.findall(r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", block):
            mapping[int(src, 16)] = hex_to_text(dst)
    for block in re.findall(r"beginbfrange(.*?)endbfrange", text, re.S):
        for lo, hi, dst in re.findall(
            r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", block
        ):
            start, end, base = int(lo, 16), int(hi, 16), int(dst, 16)
            for offset in range(min(end - start + 1, 1024)):
                mapping[start + offset] = chr(base + offset)
    return mapping


def decode_hex(code_hex: str, mapping: dict[int, str]) -> str:
    if len(code_hex) % 2:
        code_hex = "0" + code_hex
    raw = bytes.fromhex(code_hex)
    out: list[str] = []
    for index in range(0, len(raw), 2):
        code = (raw[index] << 8) | raw[index + 1]
        out.append(mapping.get(code, ""))
    return "".join(out)


TOKEN = re.compile(
    rb"/(F[^\s/\]<>]+)\s+([\d.]+)\s+Tf"    # 1-2 : police (avec suffixe de sous-ensemble) + taille
    rb"|([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+Tm"  # 3-8
    rb"|([-\d.]+)\s+([-\d.]+)\s+T[dD]"      # 9-10 : déplacement relatif
    rb"|<([0-9A-Fa-f\s]*)>\s*Tj"           # 11 : texte hexadécimal
    rb"|\[([^\]]*)\]\s*TJ"                 # 12 : texte (tableau)
    rb"|\(((?:[^()\\]|\\.)*)\)\s*Tj"       # 13 : chaîne littérale
    rb"|((?:\((?:[^()\\]|\\.)*\)|<[0-9A-Fa-f\s]*>)\s*)+?\]\s*TJ"  # 14 : tableau mixte
)


def extract(path: str) -> list[str]:
    data = open(path, "rb").read()
    objects = load_objects(data)

    cmap: dict[int, dict[int, str]] = {}
    for number, body in objects.items():
        stream = object_stream(body)
        if stream and (b"beginbfchar" in stream or b"beginbfrange" in stream):
            cmap[number] = parse_tounicode(stream)

    pages: list[str] = []
    for body in objects.values():
        if b"/Type /Page" not in body and b"/Type/Page" not in body:
            continue

        # Les ressources de police sont souvent un objet indirect :
        # /Resources << /Font 1 0 R >>. Sans le résoudre, la table ToUnicode
        # n'est jamais trouvée et tous les accents sont perdus.
        font_bodies = [body]
        font_res = re.search(rb"/Font\s+(\d+)\s+0\s+R", body)
        if font_res and int(font_res.group(1)) in objects:
            font_bodies.append(objects[int(font_res.group(1))])

        font_maps: dict[bytes, dict[int, str]] = {}
        for scan in font_bodies:
            for name, ref in re.findall(rb"/(F[^\s/\]<>]+)\s+(\d+)\s+0\s+R", scan):
                font_body = objects.get(int(ref), b"")
                to_unicode = re.search(rb"/ToUnicode\s+(\d+)\s+0\s+R", font_body)
                if to_unicode and int(to_unicode.group(1)) in cmap:
                    font_maps[name] = cmap[int(to_unicode.group(1))]

        content_ref = re.search(rb"/Contents\s+(\d+)\s+0\s+R", body)
        if not content_ref:
            continue
        content = object_stream(objects.get(int(content_ref.group(1)), b""))
        if not content:
            continue

        mapping: dict[int, str] = {}
        size = 10.0
        x = y = 0.0
        line: list[tuple[float, str]] = []
        lines: list[str] = []

        def flush() -> None:
            if not line:
                return
            line.sort(key=lambda item: item[0])
            gaps = [
                line[index + 1][0] - line[index][0] for index in range(len(line) - 1)
            ]
            if gaps:
                ordered = sorted(gaps)
                median = ordered[len(ordered) // 2]
            else:
                median = 0.0
            threshold = max(median * 1.9, 0.3 * size)
            pieces: list[str] = []
            for index, (_position, text) in enumerate(line):
                if index > 0 and line[index][0] - line[index - 1][0] > threshold:
                    pieces.append(" ")
                pieces.append(text)
            lines.append("".join(pieces).strip())
            line.clear()

        for token in TOKEN.finditer(content):
            if token.group(1):
                mapping = font_maps.get(token.group(1), {})
                size = float(token.group(2))
            elif token.group(3) is not None:
                flush()
                x, y = float(token.group(7)), float(token.group(8))
            elif token.group(9) is not None:
                dx, dy = float(token.group(9)), float(token.group(10))
                if dy != 0:
                    flush()
                x += dx
                y += dy
            elif token.group(11) is not None:
                code = re.sub(rb"\s", b"", token.group(11)).decode()
                line.append((x, decode_hex(code, mapping)))
            elif token.group(12) is not None:
                text = "".join(
                    decode_hex(re.sub(rb"\s", b"", inner).decode(), mapping)
                    for inner in re.findall(rb"<([0-9A-Fa-f\s]*)>", token.group(12))
                )
                line.append((x, text))
            elif token.group(13) is not None:
                line.append((x, decode_literal(token.group(13), mapping)))
            elif token.group(14) is not None:
                pieces: list[str] = []
                for inner in re.findall(
                    rb"<([0-9A-Fa-f\s]*)>|\(((?:[^()\\]|\\.)*)\)", token.group(14)
                ):
                    if inner[0]:
                        pieces.append(
                            decode_hex(re.sub(rb"\s", b"", inner[0]).decode(), mapping)
                        )
                    else:
                        pieces.append(decode_literal(inner[1], mapping))
                line.append((x, "".join(pieces)))
        flush()

        pages.append("\n".join(filter(None, lines)))

    return pages


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    target = sys.argv[1] if len(sys.argv) > 1 else "Constitution.pdf"
    for index, page in enumerate(extract(target), start=1):
        print(f"=============== PAGE {index} ===============")
        print(page)

"""Recover and decrypt the hidden ChatApp message.

Usage: python solve.py PATH_TO_ARTIFACT_DIRECTORY
Requires: cryptography
"""

import base64
import hashlib
import re
import sqlite3
import struct
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms


ORDER_XOR = 931071618
SELECT_MOD = 3
SECRET_MESSAGE = b"sqlite3_forensics_2026"
NONCE = bytes.fromhex("706eeff3706eeff3706eeff3706eeff3")


def main(artifact: Path) -> None:
    db = (artifact / "databases" / "chatapp.db").read_bytes()
    wal = (artifact / "databases" / "chatapp.db-wal").read_bytes()
    page_size = struct.unpack_from(">I", wal, 8)[0]
    if page_size == 1:
        page_size = 65536
    first_page = struct.unpack_from(">I", wal, 32)[0]
    old_page = wal[56 : 56 + page_size]
    if len(old_page) != page_size:
        raise ValueError("Incomplete first WAL frame")

    snapshot = bytearray(db)
    start = (first_page - 1) * page_size
    snapshot[start : start + page_size] = old_page

    salt_text = ET.parse(artifact / "shared_prefs" / "chat_prefs.xml").getroot().find("string[@name='device_salt']").text
    salt = base64.b64decode(salt_text)
    key = hashlib.sha256(SECRET_MESSAGE + salt).digest()

    with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parent) as tmp:
        path = Path(tmp) / "old.db"
        path.write_bytes(snapshot)
        conn = sqlite3.connect(f"file:{path.as_posix()}?immutable=1", uri=True)
        rows = conn.execute("SELECT id, body, timestamp FROM messages WHERE thread_id=5").fetchall()
        hidden = [row for row in rows if re.fullmatch(r"[A-Za-z0-9+/]{2}==", row[1])]
        if len(hidden) != 32:
            raise ValueError(f"Expected 32 hidden messages, found {len(hidden)}")
        selected = sorted(
            (row for row in hidden if (row[2] ^ ORDER_XOR) % SELECT_MOD == 0),
            key=lambda row: row[2] ^ ORDER_XOR,
        )
        ciphertext = b"".join(base64.b64decode(row[1]) for row in selected)
        plaintext = Cipher(algorithms.ChaCha20(key, NONCE), mode=None).decryptor().update(ciphertext).decode("ascii")
        print("Selected IDs:", ", ".join(str(row[0]) for row in selected))
        print("Ciphertext:", ciphertext.hex())
        print("Secret message:", plaintext)
        print("Flag:", f"CSCV2026{{{plaintext}}}")
        conn.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python solve.py PATH_TO_ARTIFACT_DIRECTORY")
    main(Path(sys.argv[1]))

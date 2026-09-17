---
title: "BuckeyeCTF 2025 - Phân tích bộ nhớ & Digital Forensics"
description: "Tổng hợp lời giải chi tiết các thử thách Digital Forensics tại BuckeyeCTF 2025 (08/11/2025 - 10/11/2025): zip2john2zip & Audio Morse Code Bugle."
tags: ["CTF", "Forensics", "Volatility", "Zip2John", "Morse Code", "CyberChef"]
---

# BuckeyeCTF 2025 - Phân tích bộ nhớ & Digital Forensics

> **Thời gian diễn ra giải:**  
> 🕒 **Bắt đầu:** 01:00 AM - 08/11/2025 (UTC)  
> 🏁 **Kết thúc:** 01:00 AM - 10/11/2025 (UTC)  
> **Tác giả Writeup:** Th4nhH4i (Đội thi L3ak - Top 1 Open Division)

---

## 1. Writeup - Forensics / zip2john2zip

### Đề bài & Chuỗi Hash thu được
Thử thách cung cấp một tệp `hash.txt` có chứa chuỗi mã hóa PKZIP2:

```text
flag.zip/flag.txt:$pkzip2$1*1*2*0*34*28*64ac0ae2*0*26*0*34*64ac*a388*2c386d49756e1d70ab5f2d8b7ccf1703b28d2775e84d89ccf4bf26d0e735e9a817b0032b5071540889c34b9331b694d6042c30a0*$/pkzip2$:flag.txt:flag.zip::flag.zip
```

### Phân tích các thành phần cấu trúc Hash PKZIP2
- **`$pkzip2$`**: Định danh định dạng mã hash dùng cho John the Ripper / Hashcat.
- **`C=1`**: Số lượng hash.
- **`B=1`**: Số byte hợp lệ trong checksum.
- **`DT=2`**: Loại dữ liệu nhúng đầy đủ (compressed file blob).
- **`CL=0x34` (52 bytes)**: Kích thước dữ liệu đã nén.
- **`UL=0x28` (40 bytes)**: Kích thước dữ liệu gốc chưa nén.
- **`CR=64ac0ae2`**: Mã CRC32 của dữ liệu gốc.
- **`64ac`**: Salt 16-bit khởi tạo khóa mã hóa.
- **`a388`**: Giá trị xác minh mật khẩu (Password Verification Value).

### Bẻ khóa Mật khẩu với John the Ripper
Tiến hành bẻ khóa mật khẩu tệp ZIP bằng từ điển `rockyou.txt`:

```bash
$ john --wordlist=/usr/share/wordlists/rockyou.txt hash.txt
Using default input encoding: UTF-8
Loaded 1 password hash (PKZIP [32/64])
Will run 8 OpenMP threads

factfinder       (flag.zip/flag.txt)
Session completed.
```

=> Kết quả thu được mật khẩu giải nén tệp ZIP là: `factfinder`

### Viết Script Python Tái Tạo Tệp ZIP
Dưới đây là mã nguồn `solve.py` để tái tạo lại cấu trúc tệp ZIP từ chuỗi hash `$pkzip2$`:

```python
#!/usr/bin/env python3
# solve.py - Rebuild a minimal zip file from a $pkzip2$...$/pkzip2$ blob
import sys
import re
import struct
import binascii
from pathlib import Path

def extract_pkzip2_inner(text: str) -> str | None:
    m = re.search(r'\$pkzip2\$(.*?)\$/pkzip2\$', text, flags=re.DOTALL)
    return m.group(1) if m else None

def find_longest_hex(s: str) -> str | None:
    hex_pats = re.findall(r'[0-9a-fA-F]+', s)
    return max(hex_pats, key=len) if hex_pats else None

def safe_unhex(hexstr: str) -> bytes:
    try:
        return binascii.unhexlify(hexstr)
    except (binascii.Error, ValueError):
        if len(hexstr) % 2 == 1:
            try:
                return binascii.unhexlify(hexstr + '0')
            except Exception:
                pass
            try:
                return binascii.unhexlify(hexstr[:-1])
            except Exception:
                pass
        raise

def build_minimal_zip(blob: bytes, parts: list[str], outpath: Path, filename: bytes=b"flag.txt"):
    def gethex(idx, default=0):
        try:
            return int(parts[idx], 16)
        except Exception:
            return default

    comp_size = gethex(4, len(blob))
    uncomp_size = gethex(5, len(blob))
    crc32 = gethex(6, 0)
    comp = gethex(9, 0)

    lfh_fixed = struct.pack("<HHHHHIIIHH", 20, 1, comp, 0, 0, crc32, comp_size, uncomp_size, len(filename), 0)
    lfh = b"PK\x03\x04" + lfh_fixed + filename

    cdfh_fixed = struct.pack("<HHHHHHIIIHHHHHII", 20, 20, 1, comp, 0, 0, crc32, comp_size, uncomp_size, len(filename), 0, 0, 0, 0, 0, 0)
    cdfh = b"PK\x01\x02" + cdfh_fixed + filename

    offset_cd = len(lfh) + len(blob)
    eocd = b"PK\x05\x06" + struct.pack("<HHHHIIH", 0, 0, 1, 1, len(cdfh), offset_cd, 0)

    with outpath.open("wb") as fo:
        fo.write(lfh)
        fo.write(blob)
        fo.write(cdfh)
        fo.write(eocd)

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 solve.py hash.txt out.zip")
        sys.exit(1)

    hashfile, outzip = Path(sys.argv[1]), Path(sys.argv[2])
    text = hashfile.read_text(errors="ignore")
    inner = extract_pkzip2_inner(text)
    
    parts = inner.split('*')
    hex_candidate = parts[-1].strip() if parts and re.fullmatch(r'[0-9a-fA-F]+', parts[-1].strip()) else find_longest_hex(inner)
    blob = safe_unhex(hex_candidate)
    
    build_minimal_zip(blob, parts, outzip, filename=b"flag.txt")
    print(f"Wrote {outzip} - try: unzip -P 'factfinder' {outzip}")

if __name__ == "__main__":
    main()
```

### Giải nén lấy Flag
Chạy script tái tạo tệp và giải nén với mật khẩu `factfinder`:

```bash
$ python3 solve.py hash.txt flag.zip
$ unzip -P "factfinder" flag.zip
```

🏁 **Flag:** `bctf{not_all_hashes_are_hashed_equally}`

---

## 2. Writeup - Forensics / Bugle

### Đề bài
Thử thách cung cấp một tệp âm thanh `Bugle.mp3` giả âm thanh tiếng kèn Bugle.

### Phân tích tín hiệu âm thanh
Khi tải tệp âm thanh vào DAW (**Ableton Live 12**) hoặc công cụ **Sonic Visualiser / MusicGram**:
- Nhận thấy có các khoảng lặng ngắt nghỉ rất đều giữa các nốt nhạc.
- Nốt kéo dài **1/4 nhịp** đại diện cho dấu gạch ngang (`-`).
- Nốt kéo dài **1/8 nhịp** đại diện cho dấu chấm (`.`).

### Giải mã mã Morse (Morse Code Steganography)
Thu thập chuỗi mã Morse từ tệp âm thanh:
`-- --- .-. ... . .- .-.. .-.. --- -. --.`

Đưa chuỗi vào công cụ **CyberChef** (Recipe: *From Morse Code*):
- `--` ➔ `M`
- `---` ➔ `O`
- `.-.` ➔ `R`
- `...` ➔ `S`
- `.` ➔ `E`
- `.-` ➔ `A`
- `.-..` ➔ `L`
- `.-..` ➔ `L`
- `.-` ➔ `A`
- `.-..` ➔ `L`
- `---` ➔ `O`
- `-.` ➔ `N`
- `--.` ➔ `G`

🏁 **Flag:** `bctf{MORSEALLALONG}`

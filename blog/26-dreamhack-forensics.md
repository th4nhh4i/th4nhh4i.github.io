---
title: "DreamHack Wargame - Digital Forensics Challenges Writeup"
description: "Tổng hợp writeup thực hành giải các thử thách Digital Forensics & Steganography trên nền tảng wargame DreamHack (Basic_Forensics_1, zsteg, LSB, Metadata analysis)."
tags: ["Wargame", "DreamHack", "Forensics", "Steganography", "zsteg"]
---

# DreamHack Wargame - Digital Forensics Challenges Writeup

> **Nền tảng:** DreamHack Wargame  
> **Chuyên đề:** Digital Forensics & Image Steganography  
> **Tác giả:** Th4nhH4i  
> **Báo cáo đầy đủ trên Notion:** [Xem bài viết trên Notion](https://app.notion.com/p/DreamHack-1fb5dcdc66b582a5994d819a2315d5d2)

---

## 🎯 Thử thách tiêu biểu:
- 🖼️ **Basic_Forensics_1:** Trích xuất thông điệp ẩn giấu trong file ảnh `whitebear.png`.
- 🛠️ **Công cụ & Phương pháp:** Sử dụng `zsteg` (LSB analysis), `exiftool`, `strings`, và `file` để khôi phục Flag `DH{White_Be4r_In_Dream_4ack}`.

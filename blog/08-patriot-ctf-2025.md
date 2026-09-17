---
title: "Patriot CTF 2025 - Cryptography & Matrix Reconstruction"
description: "Writeup chi tiết thử thách Cryptography (Matrix Reconstruction - 382 pts) tại giải PatriotCTF 2025."
tags: ["CTF", "Crypto", "SageMath", "GF(2)", "Linear Algebra"]
---

# Patriot CTF 2025 - Cryptography & Matrix Reconstruction

> **Giải đấu:** Patriot CTF 2025  
> **Thử thách:** Matrix Reconstruction  
> **Thể loại:** Cryptography (382 pts)  
> **Tác giả Writeup:** Th4nhH4i  

---

## 🧠 1. Phân tích đề bài
Hệ PRNG hoạt động theo công thức ma trận trên trường nhị phân GF(2):
$$S_{i+1} = A \cdot S_i \oplus B$$

Trong đó:
- $S_i$ là trạng thái 32-bit tại bước $i$.
- Ma trận $A$ kích thước $32 \times 32$ chưa biết.
- Véc-tơ $B$ kích thước $32 \times 1$ chưa biết.
- Đề bài rò rỉ 40 trạng thái liên tiếp $S_0, S_1, \dots, S_{39}$.

---

## 🧩 2. Khôi phục Ma trận A và Véc-tơ B
Biến đổi hệ phương trình về dạng ma trận tuyến tính $M \cdot X = Y$ trên GF(2):
- Tổng số biến cần tìm: $32 \times 32 + 32 = 1056$ biến.
- Với 39 cặp chuyển trạng thái $(S_i, S_{i+1})$, mỗi cặp cung cấp 32 phương trình ➔ tổng cộng $39 \times 32 = 1248$ phương trình.
- Sử dụng **SageMath** để giải hệ phương trình tuyến tính trên trường $\mathbb{F}_2$.

---

## 💻 3. Script Khôi phục và Giải mã (SageMath / Python)

```python
from sage.all import *
import numpy as np

# Load 40 leaked states
states = [int(x.strip()) for x in open("keystream_leak.txt")]

F = GF(2)
num_vars = 1056 # A (1024) + B (32)

rows = []
rhs = []

for i in range(39):
    S = [(states[i] >> b) & 1 for b in range(32)]
    S_next = [(states[i+1] >> b) & 1 for b in range(32)]

    for bit in range(32):
        eq = []
        for row in range(32):
            for col in range(32):
                if row == bit:
                    eq.append(S[col])
                else:
                    eq.append(0)

        B_mask = [1 if j == bit else 0 for j in range(32)]
        eq = eq + B_mask
        rows.append(eq)
        rhs.append(S_next[bit])

M = Matrix(F, rows)
V = Vector(F, rhs)

X = M.solve_right(V)
print("[+] System solved successfully!")
```

---

## 🏁 Kết Quả
Tái tạo thành công ma trận sinh $A$ và $B$, từ đó đảo ngược chuỗi PRNG để giải mã FLAG tệp tin mã hóa.

---
title: "Purple Team: Ransomware qua Phishing Email và Disaster Recovery"
description: "Mô phỏng vòng đời ransomware từ phishing, PowerShell C2, credential access, lateral movement đến mã hóa và khôi phục."
tags: [Purple Team, Ransomware, Phishing, Incident Response, Disaster Recovery]
---

# Purple Team: Ransomware qua Phishing Email và Disaster Recovery

> **Phạm vi sử dụng:** Nội dung được xây dựng cho môi trường lab cô lập phục vụ đào tạo SOC, Threat Hunting và Purple Team. Không thực hiện các lệnh tấn công trên hệ thống không thuộc quyền quản lý hoặc chưa được cấp phép.


Bài lab cuối cùng kết nối nhiều kỹ thuật thành một ransomware attack lifecycle hoàn chỉnh. Kẻ tấn công gửi email phishing giả mạo chứng từ thanh toán, lừa người dùng mở tài liệu có macro, thiết lập PowerShell C2, thu thập credential, di chuyển ngang và mã hóa dữ liệu. Sau đó Blue Team phải xác định phạm vi, cô lập, điều tra và thực hiện Disaster Recovery Drill.

Điểm khác biệt của bài này là không đánh giá một alert đơn lẻ. Mục tiêu là kiểm tra khả năng phối hợp giữa Red Team, SOC, Incident Response, quản trị hệ thống và đội backup.

## Bối cảnh

Công ty ABC có khoảng 200 nhân viên, một Domain Controller, hai File Server và khoảng 50 máy trạm Windows 10. Phòng Kế toán thường xuyên xử lý chứng từ thanh toán qua email, vì vậy attacker sử dụng chính quy trình nghiệp vụ này làm mồi nhử.

Email giả mạo yêu cầu tải và ký duyệt chứng từ trị giá 250.000.000 VND trước hạn gấp. Sự hối thúc làm tăng khả năng người dùng bỏ qua kiểm tra nguồn gửi và phần mở rộng tệp.

## Sơ đồ mạng và attack path

![Topology và attack path](assets/lab8_topology.png)

```mermaid
flowchart LR
    A[Attacker / C2 Server<br/>Linux:8443] -->|Phishing link| U[Workstation kế toán]
    U -->|Macro / BAT / PowerShell| C[C2 Session]
    C -->|Credential Access| D[Domain Credential]
    D -->|SMB / WinRM / WMI| F[File Server]
    F -->|Encrypt dữ liệu| I[Business Impact]
    U --> S[SIEM / EDR / Logs]
    F --> S
    D --> S
```

Các thành phần được chuẩn bị trong kịch bản:

| Thành phần | Mô tả |
|---|---|
| C2 Server | Flask web server trên Linux, cổng 8443 |
| Trang phishing | Nút tải tài liệu giả |
| `tai_lieu.docx.bat` | File batch giả dạng Word |
| `Don_Yeu_Cau_Thanh_Toan.docm` | Word chứa VBA macro tự chạy |
| `standalone_ransom.ps1` | PowerShell thực hiện chuỗi mô phỏng |

## Giai đoạn 1 - Phishing và Initial Access

Attacker gửi email với chủ đề khẩn, giả mạo Phòng Kế toán. Người dùng tải file và double-click. Do Windows ẩn phần mở rộng, `tai_lieu.docx.bat` có thể được nhìn như tài liệu Word.

Trong biến thể `.docm`, macro `AutoOpen` được kích hoạt khi tài liệu mở. Đây là điểm Initial Access chuyển sang Execution.

Blue Team cần theo dõi:

- Email sender và domain.
- URL tải file.
- Tệp được tải vào Downloads.
- Process tree của Word, `cmd.exe`, PowerShell hoặc script host.
- Dấu hiệu macro tự động chạy.

## Giai đoạn 2 - Execution và Command and Control

Sau khi payload chạy, endpoint kết nối tới C2 trên Linux. Kịch bản thu thập thông tin hệ thống như:

- Hệ điều hành Windows 10.
- Workgroup/domain.
- Bộ nhớ.
- Địa chỉ IP.
- Trạng thái Windows Defender.

Từ góc nhìn detection, các tín hiệu gồm:

```text
WINWORD.EXE -> cmd.exe / powershell.exe
PowerShell tải hoặc thực thi script
Kết nối outbound tới C2:8443
Tạo process không phù hợp với hoạt động văn phòng
```

SOC cần liên kết log email, proxy/DNS, EDR/Sysmon và firewall để xác định thời điểm foothold đầu tiên.

## Giai đoạn 3 - Credential Access, Lateral Movement và Impact

Sau khi có foothold, attacker tìm kiếm credential có giá trị và sử dụng tài khoản đặc quyền để truy cập File Server hoặc tài nguyên nội bộ. Các giao thức cần giám sát:

- SMB.
- WinRM.
- WMI.
- Remote service creation.
- Đăng nhập bất thường của tài khoản quản trị.

Mã hóa dữ liệu chỉ là giai đoạn cuối. Trước khi ransomware xuất hiện, thường đã có nhiều dấu vết: C2, credential access, discovery, lateral movement và truy cập diện rộng tới file share.

## Phát hiện và tuyên bố sự cố

Blue Team cần xác định ban đầu:

- Máy bị ảnh hưởng đầu tiên.
- Tài khoản đang được sử dụng.
- Server nào đã bị truy cập.
- Phạm vi dữ liệu bị mã hóa.
- Trạng thái Domain Controller.
- Trạng thái Backup Server.

Khi có bằng chứng C2 và mã hóa, cần tuyên bố sự cố ransomware thay vì xử lý từng alert riêng lẻ.

## Cô lập hệ thống

![Quy trình ứng phó và khôi phục](assets/lab8_response.png)

Các hành động:

- Cô lập endpoint bị nhiễm.
- Chặn IP hoặc domain C2.
- Vô hiệu hóa tài khoản nghi bị compromise.
- Hạn chế SMB, WinRM và WMI bất thường.
- Bảo quản log và bằng chứng.
- Không vội xóa payload trước khi thu thập đủ dữ liệu.

Mục tiêu là ngăn mã hóa lan rộng nhưng vẫn duy trì khả năng điều tra.

## Xác định blast radius

Mỗi hệ thống được phân loại:

```text
Compromised
Encrypted
Accessed
Clean
Unknown
```

Phân loại này giúp tránh hai sai lầm: khôi phục một máy vẫn còn persistence hoặc đưa một hệ thống chưa xác minh trở lại mạng.

Timeline cần bao phủ:

```text
Phishing email
-> tải file
-> thực thi macro/BAT
-> PowerShell C2
-> credential access
-> lateral movement
-> encryption
-> detection
-> containment
```

## Disaster Recovery Drill

Kịch bản giả định có thể gồm:

- Domain Controller compromised.
- File Server encrypted.
- Virtual machine unavailable.

Blue Team và đội hạ tầng cần kiểm tra backup sạch, khả năng restore, dependency và tài khoản quản trị dùng cho recovery. Backup chỉ có giá trị khi có thể khôi phục và đã được xác minh không chứa mã độc hoặc persistence.

## Thứ tự ưu tiên khôi phục

![Thứ tự ưu tiên khôi phục](assets/lab8_recovery.png)

1. **Identity Infrastructure:** Domain Controller và dịch vụ xác thực.
2. **Core Network Services:** DNS, DHCP và các dịch vụ mạng cơ bản.
3. **Critical Applications:** ứng dụng nghiệp vụ quan trọng.
4. **Databases:** restore và kiểm tra tính toàn vẹn.
5. **File Services:** khôi phục File Server từ backup sạch.
6. **User Endpoints:** rebuild, vá lỗi và triển khai lại EDR.

Thứ tự này phản ánh dependency. Không nên khôi phục hàng loạt workstation khi identity và network core chưa đáng tin cậy.

## Điều kiện đưa hệ thống trở lại production

Blue Team phải xác nhận:

- Không còn active C2 connection.
- Không có persistence đáng ngờ.
- Tài khoản compromise đã được reset.
- EDR hoạt động.
- Logging được bật.
- Backup đã xác minh.
- Dịch vụ quan trọng hoạt động bình thường.

Chỉ khi các điều kiện này được kiểm chứng, hệ thống mới nên được kết nối lại vào production.

## Bài học rút ra

Ransomware không bắt đầu tại thời điểm file bị mã hóa. Nó bắt đầu từ social engineering và tiếp tục qua nhiều giai đoạn mà Blue Team có thể phát hiện sớm. Một chương trình Purple Team tốt phải đánh giá toàn bộ chuỗi: khả năng ngăn email, phát hiện execution, nhìn thấy C2, bảo vệ credential, hạn chế lateral movement, cô lập nhanh và khôi phục từ backup sạch. Thành công không chỉ là “có alert”, mà là giảm blast radius và đưa dịch vụ trở lại an toàn.

---

## Toàn bộ hình ảnh từ tài liệu gốc

Phần dưới đây tập hợp **26 hình ảnh** được trích xuất từ tài liệu gốc cho Lab 7 – Purple Team Ransomware qua Phishing. Thứ tự hình được giữ theo trình tự xuất hiện trong tài liệu.

### Hình 1 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 1 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_01.png)

### Hình 2 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 2 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_02.png)

### Hình 3 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 3 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_03.png)

### Hình 4 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 4 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_04.png)

### Hình 5 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 5 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_05.png)

### Hình 6 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 6 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_06.png)

### Hình 7 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 7 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_07.png)

### Hình 8 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 8 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_08.png)

### Hình 9 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 9 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_09.png)

### Hình 10 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 10 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_10.png)

### Hình 11 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 11 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_11.png)

### Hình 12 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 12 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_12.png)

### Hình 13 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 13 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_13.png)

### Hình 14 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 14 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_14.png)

### Hình 15 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 15 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_15.png)

### Hình 16 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 16 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_16.png)

### Hình 17 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 17 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_17.png)

### Hình 18 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 18 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_18.png)

### Hình 19 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 19 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_19.png)

### Hình 20 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 20 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_20.png)

### Hình 21 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 21 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_21.png)

### Hình 22 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 22 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_22.png)

### Hình 23 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 23 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_23.png)

### Hình 24 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 24 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_24.png)

### Hình 25 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing

![Hình 25 – Minh họa Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/img_25.png)

### Thông tin liên hệ/ghi chú cuối phần – Lab 7 – Purple Team Ransomware qua Phishing

![Thông tin liên hệ/ghi chú cuối phần – Lab 7 – Purple Team Ransomware qua Phishing](assets/lab7/contact.jpg)

# Phân tích và giải bài ChatApp

## Flag

```text
CSCV2026{W4l_1s_s0_c00l!!}
```

Thông điệp bí mật đã giải mã là `W4l_1s_s0_c00l!!`. Kết quả được tái hiện bằng [solve.py](solve.py) chạy trực tiếp trên artifact gốc.

## Dữ liệu ẩn được khôi phục

Bộ artifact chứa một ứng dụng Android và dữ liệu ứng dụng của nó. Cơ sở dữ liệu hiện tại có **951 tin nhắn trong 5 nhóm**. Nhật ký SQLite `chatapp.db-wal` lưu một trạng thái cũ trong đó **32 tin nhắn, ID 888–919, thuộc nhóm `ATTT Group`** có `body` là Base64. Mỗi `body` giải ra đúng 1 byte. Trong trạng thái hiện tại, chính các ID này chứa nội dung hội thoại thông thường.

Ghép 32 byte theo ID tăng dần thu được:

```text
63c2c25fc84999828d79c52b5ff343eba9a20132af2c552b3e7f8cacfbc74713
```

Đây là **32 byte ứng viên trước khi chọn lọc**, chưa phải bản rõ. Tệp [recovered_payload.bin](recovered_payload.bin) chứa các byte theo ID tăng dần; [recovered_messages.csv](recovered_messages.csv) ghi từng tin nhắn cũ và nội dung hiện tại để đối chiếu.

## Cách khôi phục và bằng chứng

1. `chatapp.db` có hai bảng `threads` và `messages`; kiểm tra toàn vẹn SQLite trả về `ok`. Ảnh đính kèm trong 153 tin nhắn chỉ gồm 5 nội dung ảnh lặp lại.
2. WAL có 6 frame. Frame 0 là phiên bản cũ của trang 2215: truy vấn trên bản sao DB với trang này cho **919 tin nhắn**. Các ID 888–919 là Base64, ví dụ ID 888 `Yw==` → `63`, ID 889 `wg==` → `c2`.
3. Frame 4 của cùng trang chỉ còn **887 tin nhắn** trong bản dựng lại: các ID 888–919 không còn hiện diện. Frame 5 đưa trang về trạng thái **951 tin nhắn** và khớp trang trong DB hiện tại; ID 888–919 đã mang nội dung khác. Diễn biến này phù hợp với việc xóa 32 bản ghi rồi thêm dữ liệu hội thoại mới, tái sử dụng các ID.
4. Các tin nhắn Base64 cũ có thời gian từ **02/09/2026 11:00:07 đến 17:39:01 (UTC+7)**. Nội dung hiện tại của dải ID 888–951 có thời gian từ **03/09/2026 23:35:48 đến 04/09/2026 13:37:36 (UTC+7)**.

## Giải mã

Lớp `com.example.chatapp.Constants` trong APK chứa:

```text
SECRET_MESSAGE = "sqlite3_forensics_2026"
SELECT_MOD = 3
ORDER_XOR = 931071618 (0x377f0682)
NONCE_HEX = "706eeff3706eeff3706eeff3706eeff3"
```

`ORDER_XOR` trùng giá trị magic đầu WAL (`0x377f0682`). `shared_prefs/chat_prefs.xml` chứa `device_salt = bVaN8B8ekPGF5tPMwKoubg==`.

Từ 32 tin nhắn cũ, chọn các dòng thỏa `(timestamp XOR ORDER_XOR) % SELECT_MOD == 0`, sau đó sắp tăng dần theo `timestamp XOR ORDER_XOR`. 16 ID được chọn theo thứ tự là:

```text
888, 891, 892, 895, 894, 901, 904, 902, 900, 907, 905, 910, 909, 913, 912, 915
```

Giải Base64 từng `body` và ghép lại cho ciphertext:

```text
635fc88299f3a9435f32a2552c7f3eac
```

Tạo khóa `SHA256(UTF8(SECRET_MESSAGE) || Base64Decode(device_salt))`, rồi giải mã ciphertext bằng **ChaCha20** với nonce `NONCE_HEX`. Bản rõ thu được là `W4l_1s_s0_c00l!!`. Đặt bản rõ vào định dạng đề bài cho flag ở đầu báo cáo.

## Dấu vân tay dữ liệu đã phân tích

| Tệp | SHA-256 |
|---|---|
| `chatapp.apk` | `65aa2173bbc269db1c03521f422870c31fc5b0c3a8f9c54dd60e6827a906926e` |
| `chatapp.db` | `ca8840dc01df7e78d2bbab5277aca5b7eefe4ae2865bfe94453a418917c3ec4f` |
| `chatapp.db-wal` | `8cd5fc0926b126ee6f9a4cbfa0fdd6f69bcb896f6d7454b0286874bf248ec4c4` |
| `recovered_payload.bin` | `0be2eec1b3ac97eba4ef8d6ad50dd3161e79a2233c1acd0811f72eea366bec15` |

Phân tích trên bản sao làm việc; dữ liệu tại `F:\CSCV\CHUNG KHẢO\artifact` không được sửa.

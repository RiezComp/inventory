# Panduan Deployment ke Raspberry Pi (Ubuntu Server)

Proyek ini telah dikonfigurasi agar mudah dideploy sebagai satu unit (Frontend disajikan oleh Backend). Berikut langkah-langkahnya:

## 1. Persiapan Raspberry Pi
Pastikan Raspberry Pi sudah terkoneksi internet dan terupdate.

```bash
sudo apt update && sudo apt upgrade -y
```

Install **Node.js** (Versi 18 LTS atau 20 LTS disarankan):
```bash
# Download setup script untuk Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verifikasi instalasi
node -v
npm -v
```

## 2. Transfer File
Salin seluruh folder proyek `inventory-system` ke Raspberry Pi. Anda bisa menggunakan `scp`, Git, atau flashdisk.
Misalkan proyek ada di home directory: `/home/ubuntu/inventory-system`.

## 3. Install Dependensi & Build

Masuk ke folder proyek:
```bash
cd /home/ubuntu/inventory-system
```

### Setup Backend
```bash
cd server
npm install
```

### Setup Frontend & Build
```bash
cd ../client
npm install
npm run build
```
*Langkah ini akan membuat folder `dist` berisi aplikasi web yang sudah dikompilasi.*

## 4. Menjalankan Aplikasi

Kembali ke folder server dan jalankan:
```bash
cd ../server
node index.js
```
Aplikasi sekarang berjalan di port **3000**.
Coba akses dari browser di komputer lain: `http://<IP-RASPBERRY>:3000`

## 5. Menjalankan di Background (Otomatis Start)
Agar aplikasi tetap jalan walau terminal ditutup atau setelah reboot, gunakan **PM2**.

Install PM2:
```bash
sudo npm install -g pm2
```

Jalankan aplikasi dengan PM2:
```bash
cd /home/ubuntu/inventory-system/server
pm2 start index.js --name "inventory-app"
```

Set agar otomatis jalan saat boot:
```bash
pm2 startup
# Copy dan paste command yang muncul di terminal, lalu tekan Enter
pm2 save
```

## Perintah Mengelola Aplikasi
- **Lihat Status:** `pm2 status`
- **Lihat Log:** `pm2 logs inventory-app`
- **Restart:** `pm2 restart inventory-app`
- **Stop:** `pm2 stop inventory-app`

## Catatan
- Database SQLite file ada di `server/inventory.db`. Hati-hati jangan menghapus file ini jika ingin menyimpan data.
- Secara default server berjalan di port 3000. Jika ingin mengganti, edit `server/index.js` atau set environment variable `PORT=80`.

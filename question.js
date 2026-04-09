// questions.js
export const questions = [
  {id:'identity',step:1,type:'text',title:'Halo! Kita mulai sebentar ya 👋',hint:'Isi nama dan kelasmu — ini hanya untuk laporan gurumu, bukan dinilai.',
    fields:[{key:'nama',label:'Nama lengkap',ph:'Nama kamu...'},{key:'kelas',label:'Kelas',ph:'Contoh: XI IPS 2'}]},
  {id:'access',step:2,type:'mradio',title:'Akses & software kamu 💻',groups:[
    {key:'perangkat',label:'Perangkat yang bisa kamu pakai belajar Excel:',opts:[
      {v:'laptop',l:'Laptop / PC sendiri di rumah'},{v:'lab',l:'Komputer lab sekolah saja'},{v:'hp',l:'HP saja'}]},
    {key:'ver',label:'Spreadsheet yang biasa kamu gunakan:',opts:[
      {v:'ms',l:'Microsoft Excel (desktop / laptop)'},{v:'gs',l:'Google Sheets (browser)'},
      {v:'mob',l:'Excel / Sheets di HP'},{v:'none',l:'Belum pernah pakai'}]}]},
  {id:'readiness',step:3,type:'grid',title:'Seberapa lancar kamu pakai ini?',
    hint:'Jawab jujur — ini bukan ujian, ini untuk menyesuaikan materi kelas 😊',
    items:[{k:'sum',fn:'=SUM( )',d:'Penjumlahan otomatis'},{k:'avg',fn:'=AVERAGE( )',d:'Rata-rata'},
      {k:'if',fn:'=IF( )',d:'Logika bersyarat'},{k:'vlookup',fn:'=VLOOKUP( )',d:'Cari data di tabel lain'},
      {k:'pivot',fn:'Pivot Table',d:'Ringkasan data dinamis'}],
    lvs:[{v:0,l:'Belum'},{v:1,l:'Sedikit'},{v:2,l:'Lancar'}]},
  {id:'quiz',step:4,type:'mcq',title:'Quiz kilat 🎯 Untuk otomatis tampilkan "LULUS" atau "REMEDIAL" berdasarkan nilai, rumusnya adalah...',
    opts:[{v:'a',l:'=SUM(nilai)',s:'Menjumlahkan angka'},
      {v:'b',l:'=IF(nilai>=75,"LULUS","REMEDIAL")',s:'Logika bersyarat',ok:true},
      {v:'c',l:'=VLOOKUP(nilai,tabel,2,0)',s:'Pencarian di tabel lain'},
      {v:'d',l:'Belum tahu 😅',s:''}]},
  {id:'interest',step:5,type:'checkbox',title:'Topik data yang paling menarik buatmu? 🎯',
    hint:'Pilih semua yang menarik — ini untuk menentukan contoh soal di kelas nanti!',
    opts:[{v:'game',l:'Statistik Game',s:'Win rate, ranking, damage hero'},
      {v:'finance',l:'Keuangan Pribadi',s:'Budget, tabungan, pengeluaran harian'},
      {v:'ecom',l:'Toko Online',s:'Penjualan, produk terlaris, stok'},
      {v:'sport',l:'Olahraga',s:'Klasemen, statistik pemain'},
      {v:'social',l:'Media Sosial',s:'Tren, views, followers, engagement'},
      {v:'school',l:'Data Sekolah',s:'Nilai, absensi, jadwal pelajaran'}]},
  {id:'style',step:6,type:'mradio',title:'Terakhir — cara belajarmu 🧠',groups:[
    {key:'tujuan',label:'Rencana pakai skill Excel ini untuk:',opts:[
      {v:'kuliah',l:'Persiapan kuliah / penelitian'},{v:'kerja',l:'Kerja atau freelance nanti'},
      {v:'skill',l:'Nambah skill aja'},{v:'wajib',l:'Karena pelajaran wajib'}]},
    {key:'gaya',label:'Cara belajar fitur baru yang paling efektif buatmu:',opts:[
      {v:'video',l:'Nonton tutorial pendek (YouTube / TikTok)'},
      {v:'pdf',l:'Baca panduan bergambar step-by-step'},
      {v:'guru',l:'Dengar penjelasan guru → langsung praktek'},
      {v:'explore',l:'Dikasih file contoh, eksplorasi sendiri'}]}]}
];
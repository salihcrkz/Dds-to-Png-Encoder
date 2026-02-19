const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadText = document.getElementById('uploadText');
const previewSection = document.getElementById('previewSection');
const preview = document.getElementById('preview');
const imageInfo = document.getElementById('imageInfo');
const optionsPngToDds = document.getElementById('optionsPngToDds');
const optionsDdsToPng = document.getElementById('optionsDdsToPng');
const convertBtn = document.getElementById('convertBtn');
const convertToPngBtn = document.getElementById('convertToPngBtn');
const status = document.getElementById('status');
const formatSelect = document.getElementById('formatSelect');
const mipmapsCheck = document.getElementById('mipmapsCheck');
const resultSection = document.getElementById('resultSection');
const ddsPreview = document.getElementById('ddsPreview');
const ddsInfo = document.getElementById('ddsInfo');
const downloadBtn = document.getElementById('downloadBtn');
const modeButtons = document.querySelectorAll('.mode-btn');

let currentMode = 'png-to-dds';
let currentImage = null;
let imageData = null;
let ddsBuffer = null;
let currentFileName = 'converted';

modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        
        if (currentMode === 'png-to-dds') {
            fileInput.accept = 'image/png,.png';
            uploadText.textContent = 'PNG dosyasını sürükleyin veya tıklayın';
        } else {
            fileInput.accept = '.dds,application/octet-stream';
            uploadText.textContent = 'DDS dosyasını sürükleyin veya tıklayın';
        }
        
        resetUI();
    });
});

uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) {
        handleFile(file);
    }
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
});

function handleFile(file) {
    currentFileName = file.name.replace(/\.[^/.]+$/, '');
    
    if (currentMode === 'png-to-dds') {
        if (!file.type.includes('png') && !file.name.toLowerCase().endsWith('.png')) {
            showStatus('Lütfen geçerli bir PNG dosyası seçin', 'error');
            return;
        }
        handlePngFile(file);
    } else {
        if (!file.name.toLowerCase().endsWith('.dds')) {
            showStatus('Lütfen geçerli bir DDS dosyası seçin (.dds uzantılı)', 'error');
            return;
        }
        handleDdsFile(file);
    }
}

function handlePngFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            currentImage = img;
            preview.src = e.target.result;
            imageInfo.textContent = `Boyut: ${img.width}x${img.height} | Dosya: ${(file.size / 1024).toFixed(2)} KB`;
            previewSection.style.display = 'block';
            optionsPngToDds.style.display = 'block';
            
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            imageData = ctx.getImageData(0, 0, img.width, img.height);
            
            showStatus('', '');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handleDdsFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const arrayBuffer = e.target.result;
            const result = parseDDS(arrayBuffer);
            
            const canvas = document.createElement('canvas');
            canvas.width = result.width;
            canvas.height = result.height;
            const ctx = canvas.getContext('2d');
            ctx.putImageData(result.imageData, 0, 0);
            
            preview.src = canvas.toDataURL();
            imageInfo.textContent = `Boyut: ${result.width}x${result.height} | Dosya: ${(file.size / 1024).toFixed(2)} KB`;
            previewSection.style.display = 'block';
            optionsDdsToPng.style.display = 'block';
            resultSection.style.display = 'none';
            
            imageData = result.imageData;
            currentImage = { width: result.width, height: result.height };
            showStatus('DDS dosyası başarıyla yüklendi!', 'success');
        } catch (error) {
            showStatus('DDS dosyası okunamadı: ' + error.message, 'error');
            console.error('DDS parse error:', error);
        }
    };
    reader.readAsArrayBuffer(file);
}

convertBtn.addEventListener('click', () => {
    if (!imageData) return;
    
    convertBtn.disabled = true;
    showStatus('DDS dosyası oluşturuluyor...', 'info');
    
    setTimeout(() => {
        try {
            const format = formatSelect.value;
            const useMipmaps = mipmapsCheck.checked;
            ddsBuffer = createDDS(imageData, format, useMipmaps);
            
            ddsPreview.width = imageData.width;
            ddsPreview.height = imageData.height;
            const ctx = ddsPreview.getContext('2d');
            ctx.putImageData(imageData, 0, 0);
            
            const sizeKB = (ddsBuffer.byteLength / 1024).toFixed(2);
            ddsInfo.textContent = `DDS Boyut: ${imageData.width}x${imageData.height} | Format: ${format} | Dosya: ${sizeKB} KB`;
            
            resultSection.style.display = 'block';
            showStatus('DDS dosyası başarıyla oluşturuldu!', 'success');
        } catch (error) {
            showStatus('Hata: ' + error.message, 'error');
        } finally {
            convertBtn.disabled = false;
        }
    }, 100);
});

downloadBtn.addEventListener('click', () => {
    if (ddsBuffer) {
        downloadDDS(ddsBuffer);
        showStatus('DDS dosyası indirildi!', 'success');
    }
});

convertToPngBtn.addEventListener('click', () => {
    if (!imageData) {
        showStatus('Lütfen önce bir DDS dosyası yükleyin', 'error');
        return;
    }
    
    convertToPngBtn.disabled = true;
    showStatus('PNG dosyası oluşturuluyor...', 'info');
    
    setTimeout(() => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            const ctx = canvas.getContext('2d');
            ctx.putImageData(imageData, 0, 0);
            
            canvas.toBlob((blob) => {
                if (!blob) {
                    throw new Error('PNG oluşturulamadı');
                }
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = currentFileName + '.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                showStatus('PNG dosyası başarıyla indirildi!', 'success');
                convertToPngBtn.disabled = false;
            }, 'image/png');
        } catch (error) {
            showStatus('Hata: ' + error.message, 'error');
            convertToPngBtn.disabled = false;
            console.error('PNG conversion error:', error);
        }
    }, 100);
});

function createDDS(imgData, format, useMipmaps) {
    const width = imgData.width;
    const height = imgData.height;
    
    const headerSize = 128;
    const buffer = new ArrayBuffer(headerSize + width * height * 4);
    const view = new DataView(buffer);
    
    view.setUint32(0, 0x20534444, true); // 'DDS '
    view.setUint32(4, 124, true); // header size
    view.setUint32(8, 0x1 | 0x2 | 0x4 | 0x1000, true); // flags
    view.setUint32(12, height, true);
    view.setUint32(16, width, true);
    view.setUint32(20, width * height * 4, true); // pitch
    view.setUint32(28, useMipmaps ? Math.floor(Math.log2(Math.max(width, height))) + 1 : 1, true);
    
    view.setUint32(76, 32, true); // pixel format size
    view.setUint32(80, 0x41, true); // RGBA flags
    view.setUint32(88, 32, true); // RGB bit count
    view.setUint32(92, 0x00FF0000, true); // R mask
    view.setUint32(96, 0x0000FF00, true); // G mask
    view.setUint32(100, 0x000000FF, true); // B mask
    view.setUint32(104, 0xFF000000, true); // A mask
    
    view.setUint32(108, 0x1000, true); // caps
    
    const pixels = new Uint8Array(buffer, headerSize);
    for (let i = 0; i < imgData.data.length; i += 4) {
        pixels[i] = imgData.data[i + 2];     // B
        pixels[i + 1] = imgData.data[i + 1]; // G
        pixels[i + 2] = imgData.data[i];     // R
        pixels[i + 3] = imgData.data[i + 3]; // A
    }
    
    return buffer;
}

function downloadDDS(buffer) {
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFileName + '.dds';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function showStatus(message, type) {
    status.textContent = message;
    status.className = 'status ' + type;
    if (!message) {
        status.style.display = 'none';
    }
}


function parseDDS(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    
    const magic = view.getUint32(0, true);
    if (magic !== 0x20534444) {
        throw new Error('Geçersiz DDS dosyası (Magic number hatalı)');
    }
    
    const height = view.getUint32(12, true);
    const width = view.getUint32(16, true);
    const rgbBitCount = view.getUint32(88, true);
    
    if (width <= 0 || height <= 0 || width > 8192 || height > 8192) {
        throw new Error('Geçersiz görüntü boyutu');
    }
    
    const headerSize = 128;
    const pixels = new Uint8Array(arrayBuffer, headerSize);
    
    const imageData = new ImageData(width, height);
    const totalPixels = width * height;
    
    if (rgbBitCount === 32) {
        const expectedSize = totalPixels * 4;
        if (pixels.length < expectedSize) {
            throw new Error('DDS dosyası bozuk (yetersiz veri)');
        }
        for (let i = 0; i < totalPixels * 4; i += 4) {
            imageData.data[i] = pixels[i + 2];     // R
            imageData.data[i + 1] = pixels[i + 1]; // G
            imageData.data[i + 2] = pixels[i];     // B
            imageData.data[i + 3] = pixels[i + 3]; // A
        }
    } else if (rgbBitCount === 24) {
        const expectedSize = totalPixels * 3;
        if (pixels.length < expectedSize) {
            throw new Error('DDS dosyası bozuk (yetersiz veri)');
        }
        let srcIdx = 0;
        for (let i = 0; i < totalPixels * 4; i += 4) {
            imageData.data[i] = pixels[srcIdx + 2];     // R
            imageData.data[i + 1] = pixels[srcIdx + 1]; // G
            imageData.data[i + 2] = pixels[srcIdx];     // B
            imageData.data[i + 3] = 255;                // A
            srcIdx += 3;
        }
    } else {
        throw new Error(`Desteklenmeyen DDS formatı (${rgbBitCount} bit)`);
    }
    
    return { width, height, imageData };
}

function resetUI() {
    previewSection.style.display = 'none';
    optionsPngToDds.style.display = 'none';
    optionsDdsToPng.style.display = 'none';
    resultSection.style.display = 'none';
    showStatus('', '');
    currentImage = null;
    imageData = null;
    ddsBuffer = null;
    fileInput.value = '';
}

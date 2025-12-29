// Global variables
let productData = [];
let html5QrCode = null;
let isScanning = false;
let scanBuffer = {};


// DOM elements
const startScannerBtn = document.getElementById('start-scanner');
const stopScannerBtn = document.getElementById('stop-scanner');
const scanAnotherBtn = document.getElementById('scan-another');
const scannerResult = document.getElementById('scanner-result');
const productDetails = document.getElementById('product-details');
const manualProductDetails = document.getElementById('manual-product-details');
const barcodeInput = document.getElementById('barcode-input');
const lookupBtn = document.getElementById('lookup-btn');
const manualResult = document.getElementById('manual-result');
const clearManualBtn = document.getElementById('clear-manual');
const statusMessage = document.getElementById('status-message');
const loadingIndicator = document.getElementById('loading');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const reader  = document.getElementById('reader');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Load product data from CSV
    loadProductData();
    
    // Set up event listeners
    startScannerBtn.addEventListener('click', startScanner);
    stopScannerBtn.addEventListener('click', stopScanner);
    scanAnotherBtn.addEventListener('click', scanAnother);
    lookupBtn.addEventListener('click', manualLookup);
    clearManualBtn.addEventListener('click', clearManualResult);
    
    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // Allow Enter key for manual lookup
    barcodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            manualLookup();
        }
    });
});

// Load product data from CSV
async function loadProductData() {
    showLoading(true);
    
    try {
        // Load the CSV file
        const response = await fetch('productos_regalo_prometido.csv');
        const csvText = await response.text();
        
        // Parse CSV data
        productData = parseCSV(csvText);
        
        showStatus('Base de datos cargada!', 'success');
        console.log(`Loaded ${productData.length} products`);
    } catch (error) {
        console.error('Error loading CSV file:', error);
        showStatus('Error loading product data. Using sample data instead.', 'error');
        
        // Use sample data if CSV loading fails
        productData = getSampleData();
    } finally {
        showLoading(false);
    }
}

// Parse CSV text into array of objects
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].replace(/"/g, '').split(',');
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const obj = {};
        
        for (let j = 0; j < headers.length; j++) {
            // Remove quotes from values
            let value = values[j] ? values[j].replace(/"/g, '') : '';
            obj[headers[j].trim()] = value.trim();
        }
        
        data.push(obj);
    }
    
    return data;
}

Html5Qrcode.getCameras().then(() => {
        html5QrCode = new Html5Qrcode("reader", {
            formatsToSupport: [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39
            ]
        });
    });

// Start the barcode scanner
function startScanner() {
    if (isScanning) return;
    
    // Check if we have camera permission and scanner library
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }
    
    const qrCodeSuccessCallback = (decodedText) => {
        scanBuffer[decodedText] = (scanBuffer[decodedText] || 0) + 1;

        // Require 3 identical reads
        if (scanBuffer[decodedText] >= 3) {
            scanBuffer = {};
            stopScanner();
            processBarcode(decodedText);
        }
    };
    
    const config = { 
        fps: 15, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: dinamicAspectRatio(),
        disableFlip: true,
    };

    console.log(config.aspectRatio)
    
    // Start scanner
    html5QrCode.start(
        { facingMode: "environment"
            
            },
        config,
        qrCodeSuccessCallback
    ).then(() => {
        isScanning = true;
        document.getElementById("reader").classList.add("active");
        startScannerBtn.classList.add('hidden');
        stopScannerBtn.classList.remove('hidden');
        reader.classList.remove('fas');
        reader.classList.remove('fa-camera');
        showStatus('Scanner started. Point camera at a barcode.', 'success');
    }).catch(err => {
        console.error('Failed to start scanner:', err);
        showStatus('Failed to start scanner. Please check camera permissions.', 'error');
    });
}

// Stop the scanner
function stopScanner() {
    if (!html5QrCode || !isScanning) return;
    
    html5QrCode.stop().then(() => {
        isScanning = false;
        document.getElementById("reader").classList.remove("active");
        startScannerBtn.classList.remove('hidden');
        stopScannerBtn.classList.add('hidden');
        reader.classList.add('fas');
        reader.classList.add('fa-camera');
        showStatus('Scanner stopped.', 'success');
    }).catch(err => {
        console.error('Failed to stop scanner:', err);
    });
}

// Process scanned barcode
function processBarcode(barcode) {
    // Find product by barcode
    const product = productData.find(item => item.codigo === barcode);
    
    if (product) {
        displayProductInfo(product, productDetails);
        scannerResult.classList.remove('hidden');
        
        // Scroll to result
        scannerResult.scrollIntoView({ behavior: 'smooth' });
        
        showStatus('Product found!', 'success');
    } else {
        productDetails.innerHTML = `
            <h3>Producto no encontrado</h3>
            <p>No hay productos con codigo: <strong>${barcode}</strong></p>
            <p>Por favor intenta de nuevo.</p>
        `;
        scannerResult.classList.remove('hidden');
        showStatus('Product not found in database.', 'error');
    }
}

// Manual product lookup
function manualLookup() {
    const barcode = barcodeInput.value.trim();
    
    if (!barcode) {
        showStatus('Por favor escribe el codigo de barras.', 'error');
        return;
    }
    
    // Find product by barcode
    const product = productData.find(item => item.codigo === barcode);
    
    if (product) {
        displayProductInfo(product, manualProductDetails);
        manualResult.classList.remove('hidden');
        showStatus('Product found!', 'success');
    } else {
        manualProductDetails.innerHTML = `
            <h3>Producto no encontrado</h3>
            <p>No hay productos con codigo: <strong>${barcode}</strong></p>
            <p>Por favor intenta de nuevo.</p>
        `;
        manualResult.classList.remove('hidden');
        showStatus('Product not found in database.', 'error');
    }
}

// Display product information
function displayProductInfo(product, container) {
    // Format price if available
    const price = product.pventa ? `$${parseFloat(product.pventa).toFixed(2)}` : 'N/A';
    
    
    container.innerHTML = `
        <h3>${product.nproducto || 'Product Name Not Available'}</h3>
        <div class="info-row">
            <div class="info-label">Producto ID:</div>
            <div class="info-value">${product.idproducto || 'N/A'}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Descripcion:</div>
            <div class="info-value">${product.descripcion || 'N/A'}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Stock:</div>
            <div class="info-value ">${product.stock}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Precio:</div>
            <div class="info-value precio">${price}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Codigo de barras:</div>
            <div class="info-value">${product.codigo || 'N/A'}</div>
        </div>
    `;
}

//dinamic qrbox
function dinamicAspectRatio() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    console.log(width);
    console.log(height);
    // Use the smaller dimension
    const minEdge = Math.min(width, height);
    console.log(minEdge)
     if (minEdge > 500) {
        return 1.0;
    }
    return 3.0;
}


// Clear manual lookup result
function clearManualResult() {
    manualResult.classList.add('hidden');
    barcodeInput.value = '';
    barcodeInput.focus();
}

// Scan another product
function scanAnother() {
    scannerResult.classList.add('hidden');
    startScanner();
}

// Switch between tabs
function switchTab(tabId) {
    // Update active tab
    tabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === tabId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Show active tab content
    tabContents.forEach(content => {
        if (content.id === `${tabId}-tab`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
    
    // If switching to scanner tab and scanner was active, restart it
    if (tabId === 'scanner' && isScanning) {
        setTimeout(() => {
            startScanner();
        }, 100);
    }
    
    // If switching away from scanner, stop it
    if (tabId !== 'scanner' && isScanning) {
        stopScanner();
    }
}

function refocusCamera() {
    if (!html5QrCode || !isScanning) return;

    const video = document.querySelector("#reader video");
    if (!video || !video.srcObject) return;

    const track = video.srcObject.getVideoTracks()[0];
    if (!track) return;

    const capabilities = track.getCapabilities();
    if (!capabilities.focusMode) return;

    track.applyConstraints({
        advanced: [{ focusMode: "continuous" }]
    }).catch(() => {});
}


// Show status message
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`;
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusMessage.classList.remove('success');
            statusMessage.style.display = 'none';
        }, 3000);
    }
}

// Show/hide loading indicator
function showLoading(show) {
    loadingIndicator.classList.toggle('hidden', !show);
}

// Sample data in case CSV file can't be loaded
function getSampleData() {
    return [
        {
            "idproducto": "101",
            "departamento": "Electronics",
            "nproducto": "Wireless Headphones",
            "descripcion": "High-quality wireless headphones with noise cancellation",
            "cantidad": "1 piece",
            "stock": "25",
            "pventa": "89.99",
            "codigo": "123456789012",
            "fecha": "2023-10-15"
        },
    ];
}
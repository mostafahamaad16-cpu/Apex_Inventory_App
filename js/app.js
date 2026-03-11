let currentProduct = null;
let temporaryAccumulatedQty = 0;

// ----------------------------------------------------
// 1. قسم إدارة البيانات (استيراد إكسيل وإضافة يدوية)
// ----------------------------------------------------

// الاستماع لحدث اختيار ملف الإكسيل
document.getElementById('excelFile').addEventListener('change', handleExcelImport);

function handleExcelImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            
            // قراءة أول شيت في الملف
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // تحويل الشيت إلى مصفوفة بيانات JSON
            const json = XLSX.utils.sheet_to_json(worksheet);
            
            // إعادة تشكيل البيانات لتطابق نظامنا
            const formattedProducts = json.map(row => ({
                code: String(row['الكود'] || row['code'] || row['Code'] || '').trim(),
                name: String(row['الاسم'] || row['name'] || row['Name'] || '').trim(),
                bookQty: parseFloat(row['الرصيد الدفتري'] || row['bookQty'] || 0),
                actualQty: 0 // الفعلي يبدأ دائماً من صفر
            })).filter(p => p.code !== ''); // تجاهل الصفوف الفارغة

            if (formattedProducts.length > 0) {
                addProductsToDB(formattedProducts);
                alert(`تم استيراد ${formattedProducts.length} منتج بنجاح! جاهز للجرد.`);
            } else {
                alert("لم يتم العثور على بيانات صالحة. تأكد من عناوين الأعمدة في الإكسيل.");
            }
        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء قراءة الملف. تأكد أنه ملف إكسيل صالح.");
        }
        // تصفير حقل الإدخال لتمكين رفع نفس الملف مرة أخرى إذا لزم الأمر
        event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
}

// الإضافة اليدوية
function addManualProduct() {
    const code = document.getElementById('newCode').value.trim();
    const name = document.getElementById('newName').value.trim();
    const bookQty = parseFloat(document.getElementById('newBookQty').value) || 0;

    if (!code || !name) {
        return alert("يرجى إدخال الكود والاسم على الأقل.");
    }

    const newProduct = {
        code: code,
        name: name,
        bookQty: bookQty,
        actualQty: 0
    };

    addProductsToDB([newProduct]);
    alert("تم إضافة المنتج بنجاح!");
    
    // تفريغ الحقول
    document.getElementById('newCode').value = '';
    document.getElementById('newName').value = '';
    document.getElementById('newBookQty').value = '';
}

// ----------------------------------------------------
// 2. قسم الجرد والحاسبة الذكية
// ----------------------------------------------------

function searchProduct() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return alert("الرجاء إدخال كود أو طراز للبحث");

    currentProduct = findProduct(query);

    if (currentProduct) {
        document.getElementById('productName').innerText = currentProduct.name;
        document.getElementById('productCode').innerText = currentProduct.code;
        document.getElementById('bookQty').innerText = currentProduct.bookQty;
        document.getElementById('savedActualQty').innerText = currentProduct.actualQty;
        
        temporaryAccumulatedQty = 0;
        updateTempDisplay();
        document.getElementById('mathInput').value = '';
        
        document.getElementById('productSection').classList.remove('hidden');
    } else {
        alert("لم يتم العثور على المنتج في قاعدة البيانات الحالية!");
        document.getElementById('productSection').classList.add('hidden');
    }
}

function evaluateMath(input) {
    try {
        if (!/^[0-9+\-*/().\s]+$/.test(input)) throw new Error("إدخال غير صالح");
        let result = new Function('return ' + input)();
        return parseFloat(result);
    } catch (e) {
        alert("صيغة العملية الحسابية غير صحيحة.");
        return null;
    }
}

function addCalculatedQty() {
    const inputVal = document.getElementById('mathInput').value.trim();
    if (!inputVal) return;

    const calculatedValue = evaluateMath(inputVal);
    if (calculatedValue !== null) {
        temporaryAccumulatedQty += calculatedValue;
        updateTempDisplay();
        document.getElementById('mathInput').value = '';
    }
}

function overrideCalculatedQty() {
    const inputVal = document.getElementById('mathInput').value.trim();
    if (!inputVal) return alert("أدخل الكمية للإحلال أولاً.");

    const calculatedValue = evaluateMath(inputVal);
    if (calculatedValue !== null) {
        temporaryAccumulatedQty = calculatedValue;
        currentProduct.actualQty = 0; // تصفير الفعلي القديم تمهيداً للإحلال
        updateTempDisplay();
        document.getElementById('mathInput').value = '';
    }
}

function saveFinalActual() {
    if (!currentProduct) return;

    let finalActualQty = currentProduct.actualQty + temporaryAccumulatedQty;
    
    updateProductActualQty(currentProduct.code, finalActualQty);
    
    // تحديث الواجهة والذاكرة العشوائية
    currentProduct.actualQty = finalActualQty;
    document.getElementById('savedActualQty').innerText = finalActualQty;
    
    let diff = finalActualQty - currentProduct.bookQty;
    let diffMsg = diff === 0 ? "الرصيد مطابق" : (diff > 0 ? `زيادة (${diff})` : `عجز (${diff})`);

    alert(`تم الحفظ!\nالفعلي: ${finalActualQty}\nالفرق: ${diffMsg}`);
    
    temporaryAccumulatedQty = 0;
    updateTempDisplay();
}

function updateTempDisplay() {
    document.getElementById('tempQty').innerText = temporaryAccumulatedQty;
}
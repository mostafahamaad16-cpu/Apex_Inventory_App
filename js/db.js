// مفتاح الحفظ في الذاكرة المحلية
const DB_KEY = 'apex_inventory_data';

// جلب كل المنتجات من الذاكرة
function getAllProducts() {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : [];
}

// حفظ المصفوفة بالكامل في الذاكرة
function saveAllProducts(productsArray) {
    localStorage.setItem(DB_KEY, JSON.stringify(productsArray));
}

// إضافة منتجات جديدة (استيراد أو يدوي)
function addProductsToDB(newProducts) {
    let currentProducts = getAllProducts();
    
    newProducts.forEach(newP => {
        // التحقق مما إذا كان الكود موجود مسبقاً لمنع التكرار
        const existingIndex = currentProducts.findIndex(p => p.code === newP.code);
        if (existingIndex >= 0) {
            // تحديث الدفتري والاسم لو موجود وتصفير الفعلي
            currentProducts[existingIndex].bookQty = newP.bookQty;
            currentProducts[existingIndex].name = newP.name;
        } else {
            currentProducts.push(newP);
        }
    });

    saveAllProducts(currentProducts);
}

// البحث عن منتج
function findProduct(query) {
    const products = getAllProducts();
    // البحث بالكود (تطابق تام) أو بالاسم/الطراز (يحتوي على)
    return products.find(p => p.code === query || p.name.includes(query));
}

// تحديث الرصيد الفعلي لمنتج محدد
function updateProductActualQty(code, newActualQty) {
    let products = getAllProducts();
    let productIndex = products.findIndex(p => p.code === code);
    
    if (productIndex >= 0) {
        products[productIndex].actualQty = newActualQty;
        saveAllProducts(products);
    }
}

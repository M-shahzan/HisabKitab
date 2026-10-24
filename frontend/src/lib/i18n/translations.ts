export type SupportedLanguage = "en" | "hi" | "kn";

export interface TranslationDictionary {
  // Navigation
  "nav.newOrder": string;
  "nav.dashboard": string;
  "nav.stock": string;
  "nav.billsHistory": string;
  "nav.summary": string;
  "nav.settings": string;
  "nav.pro": string;
  "nav.posSubtitle": string;
  "nav.voiceIntelligence": string;
  "nav.voiceBannerText": string;
  "nav.startVoiceOrder": string;
  "nav.online": string;

  // Header
  "header.greeting": string;
  "header.languageSettings": string;
  "header.newOrderBtn": string;
  "header.notifications": string;

  // Order / Home page
  "order.newOrder": string;
  "order.voiceAiReady": string;
  "order.draftId": string;
  "order.newOrderDraft": string;
  "order.heroInstruction": string;
  "order.dashboardBtn": string;
  "order.addItemManually": string;
  "order.voiceGuide": string;
  "order.language": string;
  "order.status.listening.title": string;
  "order.status.listening.subtitle": string;
  "order.status.processing.title": string;
  "order.status.processing.subtitle": string;
  "order.status.saving.title": string;
  "order.status.saving.subtitle": string;
  "order.status.review.title": string;
  "order.status.review.subtitle": string;
  "order.status.error.title": string;
  "order.status.error.subtitle": string;
  "order.status.idle.title": string;
  "order.status.idle.subtitle": string;
  "order.voiceOperationNotice": string;
  "order.lowStockAlert": string;
  "order.lowStockDesc": string;
  "order.billItems": string;
  "order.localEditsApplied": string;
  "order.addMore": string;
  "order.noItemsTitle": string;
  "order.noItemsDesc": string;
  "order.addFromStock": string;

  // Transcript Panel
  "transcript.recognizedOrder": string;
  "transcript.editText": string;
  "transcript.speakAgain": string;
  "transcript.reparseItems": string;
  "transcript.cancel": string;
  "transcript.assistant": string;
  "transcript.stopVoice": string;
  "transcript.replayVoice": string;

  // Bill Summary & Items
  "bill.title": string;
  "bill.draftBadge": string;
  "bill.confirmedBadge": string;
  "bill.paymentMode": string;
  "bill.cash": string;
  "bill.upi": string;
  "bill.khata": string;
  "bill.itemsInCart": string;
  "bill.itemsCount": string;
  "bill.subtotal": string;
  "bill.taxes": string;
  "bill.taxesIncluded": string;
  "bill.totalBill": string;
  "bill.grandTotal": string;
  "bill.confirmSale": string;
  "bill.addItem": string;
  "bill.cancelSale": string;
  "bill.sureToCancel": string;
  "bill.noItems": string;
  "bill.product": string;
  "bill.quantity": string;
  "bill.unitPrice": string;
  "bill.lineTotal": string;
  "bill.actions": string;
  "bill.editQty": string;
  "bill.removeItem": string;

  // Bills History
  "bills.title": string;
  "bills.subtitle": string;
  "bills.billNumber": string;
  "bills.dateTime": string;
  "bills.itemsCount": string;
  "bills.totalAmount": string;
  "bills.viewFullBill": string;
  "bills.emptyTitle": string;
  "bills.emptyDesc": string;
  "bills.startNewSale": string;
  "bills.modalTitle": string;
  "bills.modalSubtitle": string;
  "bills.backToHistory": string;
  "bills.printReceipt": string;
  "bills.product": string;
  "bills.quantity": string;
  "bills.unitPrice": string;
  "bills.lineTotal": string;
  "bills.grandTotal": string;
  "bills.loading": string;
  "bills.errorLoading": string;

  // Dashboard
  "dashboard.todaySales": string;
  "dashboard.todaySalesSub": string;
  "dashboard.transactions": string;
  "dashboard.vsYesterday": string;
  "dashboard.totalProducts": string;
  "dashboard.activeCatalog": string;
  "dashboard.lowStockWarnings": string;
  "dashboard.needsReorder": string;
  "dashboard.healthy": string;
  "dashboard.averageBill": string;
  "dashboard.perBasket": string;
  "dashboard.recentTransactions": string;
  "dashboard.viewLedger": string;
  "dashboard.noTransactions": string;
  "dashboard.viewAll": string;

  // Stock
  "stock.title": string;
  "stock.items": string;
  "stock.subtitle": string;
  "stock.addNew": string;
  "stock.refresh": string;
  "stock.searchPlaceholder": string;
  "stock.filterAll": string;
  "stock.filterInStock": string;
  "stock.filterLowStock": string;
  "stock.filterOutOfStock": string;
  "stock.colName": string;
  "stock.colSku": string;
  "stock.colUnit": string;
  "stock.colStock": string;
  "stock.colLimit": string;
  "stock.colActions": string;
  "stock.deleteConfirm": string;
  "stock.inStockBadge": string;
  "stock.lowStockBadge": string;
  "stock.outOfStockBadge": string;
  "stock.edit": string;
  "stock.delete": string;

  // Summary
  "summary.title": string;
  "summary.subtitle": string;
  "summary.today": string;
  "summary.salesToday": string;
  "summary.billsCount": string;
  "summary.averageTicket": string;
  "summary.cashCollections": string;
  "summary.upiDigital": string;
  "summary.khataCredit": string;
  "summary.hourlyTrend": string;
  "summary.topProducts": string;
  "summary.lowStockAlert": string;
  "summary.recentHistory": string;
  "summary.remaining": string;
  "summary.none": string;
  "summary.colBillNo": string;
  "summary.colTime": string;
  "summary.colItems": string;
  "summary.colPayment": string;
  "summary.colAmount": string;
  "summary.colStatus": string;
  "summary.completed": string;

  // Success / Receipt
  "success.title": string;
  "success.paymentConfirmed": string;
  "success.message": string;
  "success.billNumber": string;
  "success.totalItems": string;
  "success.transactionTime": string;
  "success.grandTotal": string;
  "success.autoStockDeducted": string;
  "success.lowStockWarning": string;
  "success.startNewBill": string;
  "success.printReceipt": string;
  "success.dashboard": string;

  // Settings
  "settings.title": string;
  "settings.subtitle": string;
  "settings.saved": string;
  "settings.shopProfile": string;
  "settings.shopName": string;
  "settings.ownerName": string;
  "settings.phone": string;
  "settings.gstin": string;
  "settings.city": string;
  "settings.languageSectionTitle": string;
  "settings.languageSectionSubtitle": string;
  "settings.liveBadge": string;
  "settings.readyBadge": string;
  "settings.voiceSectionTitle": string;
  "settings.autoParseTitle": string;
  "settings.autoParseSub": string;
  "settings.chimeTitle": string;
  "settings.chimeSub": string;
  "settings.currencySectionTitle": string;
  "settings.rupeeTitle": string;
  "settings.rupeeSub": string;
  "settings.defaultStandard": string;
  "settings.savePreferences": string;

  // Common & UI States
  "common.save": string;
  "common.cancel": string;
  "common.close": string;
  "common.retry": string;
  "common.loading": string;
  "common.error": string;
  "common.delete": string;
  "common.edit": string;
  "common.none": string;
  "common.rupees": string;
  "common.items": string;
}

export const translations: Record<SupportedLanguage, TranslationDictionary> = {
  en: {
    // Navigation
    "nav.newOrder": "New Order",
    "nav.dashboard": "Dashboard",
    "nav.stock": "Stock Management",
    "nav.billsHistory": "Bills History",
    "nav.summary": "Daily Summary",
    "nav.settings": "Settings",
    "nav.pro": "PRO",
    "nav.posSubtitle": "Smart Voice Kirana POS",
    "nav.voiceIntelligence": "Voice Intelligence",
    "nav.voiceBannerText": "Speak in Hindi, English, or Kannada to bill items in seconds.",
    "nav.startVoiceOrder": "Start Voice Order",
    "nav.online": "Online",

    // Header
    "header.greeting": "Namaste, welcome back!",
    "header.languageSettings": "Language Settings",
    "header.newOrderBtn": "New Order",
    "header.notifications": "Notifications",

    // Order / Home page
    "order.newOrder": "New Order",
    "order.voiceAiReady": "Voice AI Ready",
    "order.draftId": "Draft ID:",
    "order.newOrderDraft": "#New-Order",
    "order.heroInstruction": "Tap the large mic below or speak order naturally",
    "order.dashboardBtn": "Dashboard",
    "order.addItemManually": "Add Item Manually",
    "order.voiceGuide": "Voice Guide:",
    "order.language": "Language:",
    "order.status.listening.title": "Listening...",
    "order.status.listening.subtitle": "Speak naturally. I'm listening to your order.",
    "order.status.processing.title": "Preparing your bill...",
    "order.status.processing.subtitle": "Identifying products and calculating totals.",
    "order.status.saving.title": "Confirming transaction...",
    "order.status.saving.subtitle": "Updating ledger and store stock.",
    "order.status.review.title": "Your bill is ready",
    "order.status.review.subtitle": "Review items below or tap mic again to add more.",
    "order.status.error.title": "Couldn't process your request",
    "order.status.error.subtitle": "Tap the microphone to retry or add items manually.",
    "order.status.idle.title": "Ready to create a bill",
    "order.status.idle.subtitle": "Tap the microphone and tell me what the customer bought.",
    "order.voiceOperationNotice": "Voice Operation Notice",
    "order.lowStockAlert": "Low Stock Alert for Items in Bill",
    "order.lowStockDesc": "The following items are running low in stock",
    "order.billItems": "Bill Items",
    "order.localEditsApplied": "Local Edits Applied",
    "order.addMore": "Add More",
    "order.noItemsTitle": "No items in this draft bill yet",
    "order.noItemsDesc": "Tap the large microphone button above and speak your customer's items (e.g., '2 kg rice and 1 litre oil') or tap 'Add Item Manually'.",
    "order.addFromStock": "Add from Stock",

    // Transcript Panel
    "transcript.recognizedOrder": "Recognized Customer Order",
    "transcript.editText": "Edit Text",
    "transcript.speakAgain": "Speak Again",
    "transcript.reparseItems": "Reparse Items",
    "transcript.cancel": "Cancel",
    "transcript.assistant": "Assistant:",
    "transcript.stopVoice": "Stop Voice",
    "transcript.replayVoice": "Replay Voice",

    // Bill Summary & Items
    "bill.title": "Current Bill",
    "bill.draftBadge": "Draft",
    "bill.confirmedBadge": "Confirmed",
    "bill.paymentMode": "Payment Mode",
    "bill.cash": "Cash",
    "bill.upi": "UPI / QR",
    "bill.khata": "Khata",
    "bill.itemsInCart": "Items in cart:",
    "bill.itemsCount": "items",
    "bill.subtotal": "Subtotal:",
    "bill.taxes": "Taxes:",
    "bill.taxesIncluded": "Included in price",
    "bill.totalBill": "Total Bill:",
    "bill.grandTotal": "Grand Total:",
    "bill.confirmSale": "Confirm Sale",
    "bill.addItem": "Add Item",
    "bill.cancelSale": "Cancel Sale",
    "bill.sureToCancel": "Sure to cancel?",
    "bill.noItems": "No items added yet. Speak or click Add Item.",
    "bill.product": "Product",
    "bill.quantity": "Quantity",
    "bill.unitPrice": "Unit Price",
    "bill.lineTotal": "Line Total",
    "bill.actions": "Actions",
    "bill.editQty": "Edit Qty",
    "bill.removeItem": "Remove Item",

    // Bills History
    "bills.title": "Bills History",
    "bills.subtitle": "View all previously confirmed sales records and detailed invoices",
    "bills.billNumber": "Bill #",
    "bills.dateTime": "Date & Time",
    "bills.itemsCount": "Items",
    "bills.totalAmount": "Total Amount",
    "bills.viewFullBill": "View Full Bill",
    "bills.emptyTitle": "No Bills Recorded Yet",
    "bills.emptyDesc": "Confirmed customer sales will automatically appear here once completed.",
    "bills.startNewSale": "Create First Bill",
    "bills.modalTitle": "Bill Details",
    "bills.modalSubtitle": "Confirmed sale invoice breakdown",
    "bills.backToHistory": "Back to Bills History",
    "bills.printReceipt": "Print Receipt",
    "bills.product": "Product",
    "bills.quantity": "Quantity",
    "bills.unitPrice": "Unit Price",
    "bills.lineTotal": "Line Total",
    "bills.grandTotal": "Grand Total",
    "bills.loading": "Loading bills history...",
    "bills.errorLoading": "Failed to load bills history.",

    // Dashboard
    "dashboard.todaySales": "Today's Revenue",
    "dashboard.todaySalesSub": "Total gross earnings recorded from today's orders",
    "dashboard.transactions": "Transactions",
    "dashboard.vsYesterday": "vs yesterday",
    "dashboard.totalProducts": "Total Products",
    "dashboard.activeCatalog": "Active catalog SKUs",
    "dashboard.lowStockWarnings": "Low Stock Warnings",
    "dashboard.needsReorder": "Needs reorder",
    "dashboard.healthy": "Healthy",
    "dashboard.averageBill": "Average Bill Value",
    "dashboard.perBasket": "Per customer basket",
    "dashboard.recentTransactions": "Recent Transactions",
    "dashboard.viewLedger": "View full sales ledger and customer history",
    "dashboard.noTransactions": "No transactions recorded yet today.",
    "dashboard.viewAll": "View All",

    // Stock
    "stock.title": "Stock Management",
    "stock.items": "items",
    "stock.subtitle": "Monitor inventory quantities, unit types, and low-stock indicators",
    "stock.addNew": "Add New Product",
    "stock.refresh": "Refresh",
    "stock.searchPlaceholder": "Search product name or SKU...",
    "stock.filterAll": "All Items",
    "stock.filterInStock": "In Stock",
    "stock.filterLowStock": "Low Stock",
    "stock.filterOutOfStock": "Out of Stock",
    "stock.colName": "Product Name",
    "stock.colSku": "SKU / Code",
    "stock.colUnit": "Unit",
    "stock.colStock": "In Stock",
    "stock.colLimit": "Low Limit",
    "stock.colActions": "Actions",
    "stock.deleteConfirm": "Are you sure you want to remove this product from inventory?",
    "stock.inStockBadge": "In Stock",
    "stock.lowStockBadge": "Low Stock",
    "stock.outOfStockBadge": "Out of Stock",
    "stock.edit": "Edit",
    "stock.delete": "Delete",

    // Summary
    "summary.title": "Daily Summary",
    "summary.subtitle": "Comprehensive sales ledger, hourly performance, and inventory health",
    "summary.today": "Today",
    "summary.salesToday": "Sales Today",
    "summary.billsCount": "Bills Generated",
    "summary.averageTicket": "Average Ticket",
    "summary.cashCollections": "Cash Collections",
    "summary.upiDigital": "UPI / Digital",
    "summary.khataCredit": "Khata / Credit",
    "summary.hourlyTrend": "Hourly Sales Trend",
    "summary.topProducts": "Top Selling Products",
    "summary.lowStockAlert": "Low Stock Alert",
    "summary.recentHistory": "Recent Sales History",
    "summary.remaining": "remaining",
    "summary.none": "None",
    "summary.colBillNo": "Bill #",
    "summary.colTime": "Time",
    "summary.colItems": "Items",
    "summary.colPayment": "Payment",
    "summary.colAmount": "Amount",
    "summary.colStatus": "Status",
    "summary.completed": "Completed",

    // Success / Receipt
    "success.title": "Sale Confirmed!",
    "success.paymentConfirmed": "Payment Confirmed",
    "success.message": "Your transaction has been recorded successfully in the store ledger.",
    "success.billNumber": "Bill Number:",
    "success.totalItems": "Total Items:",
    "success.transactionTime": "Transaction Time:",
    "success.grandTotal": "Grand Total:",
    "success.autoStockDeducted": "Inventory stock deducted automatically on server",
    "success.lowStockWarning": "Low Stock Warning:",
    "success.startNewBill": "Start New Bill",
    "success.printReceipt": "Print Receipt",
    "success.dashboard": "Dashboard",

    // Settings
    "settings.title": "Settings & Preferences",
    "settings.subtitle": "Manage your store profile, voice speech models, and regional languages",
    "settings.saved": "Settings Saved",
    "settings.shopProfile": "Shop Profile",
    "settings.shopName": "Shop Name",
    "settings.ownerName": "Proprietor / Owner Name",
    "settings.phone": "Contact Phone",
    "settings.gstin": "GSTIN (Optional)",
    "settings.city": "City / Location",
    "settings.languageSectionTitle": "Website Language",
    "settings.languageSectionSubtitle": "Select your preferred language for the whole website interface:",
    "settings.liveBadge": "Supported",
    "settings.readyBadge": "Supported",
    "settings.voiceSectionTitle": "Voice Interaction Preferences",
    "settings.autoParseTitle": "Auto-parse spoken items",
    "settings.autoParseSub": "Automatically parse items when silence is detected",
    "settings.chimeTitle": "Subtle audio chime on confirmation",
    "settings.chimeSub": "Plays a soft confirmation chime when a sale is confirmed",
    "settings.currencySectionTitle": "Currency & Numbering Format",
    "settings.rupeeTitle": "Indian Rupee (INR ₹)",
    "settings.rupeeSub": "Formatted with lakhs & crores standard: ₹1,00,000.00",
    "settings.defaultStandard": "Default Standard",
    "settings.savePreferences": "Save Preferences",

    // Common
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.close": "Close",
    "common.retry": "Retry",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.none": "None",
    "common.rupees": "rupees",
    "common.items": "items",
  },

  hi: {
    // Navigation
    "nav.newOrder": "नया ऑर्डर",
    "nav.dashboard": "डैशबोर्ड",
    "nav.stock": "स्टॉक प्रबंधन",
    "nav.billsHistory": "बिल इतिहास",
    "nav.summary": "दैनिक सारांश",
    "nav.settings": "सेटिंग्स",
    "nav.pro": "प्रो",
    "nav.posSubtitle": "स्मार्ट वॉइस किराना पीओएस",
    "nav.voiceIntelligence": "वॉइस इंटेलिजेंस",
    "nav.voiceBannerText": "सेकंडों में सामान का बिल बनाने के लिए हिंदी, अंग्रेजी या कन्नड़ में बोलें।",
    "nav.startVoiceOrder": "वॉइस ऑर्डर शुरू करें",
    "nav.online": "ऑनलाइन",

    // Header
    "header.greeting": "नमस्ते, आपका फिर से स्वागत है!",
    "header.languageSettings": "भाषा सेटिंग्स",
    "header.newOrderBtn": "नया ऑर्डर",
    "header.notifications": "सूचनाएं",

    // Order / Home page
    "order.newOrder": "नया ऑर्डर",
    "order.voiceAiReady": "वॉइस एआई तैयार है",
    "order.draftId": "ड्राफ्ट आईडी:",
    "order.newOrderDraft": "#नया-ऑर्डर",
    "order.heroInstruction": "नीचे दिए गए बड़े माइक पर टैप करें या सामान्य रूप से बोलें",
    "order.dashboardBtn": "डैशबोर्ड",
    "order.addItemManually": "सामान खुद जोड़ें",
    "order.voiceGuide": "वॉइस गाइड:",
    "order.language": "भाषा:",
    "order.status.listening.title": "सुन रहा हूँ...",
    "order.status.listening.subtitle": "स्वाभाविक रूप से बोलें। मैं आपका ऑर्डर सुन रहा हूँ।",
    "order.status.processing.title": "बिल तैयार किया जा रहा है...",
    "order.status.processing.subtitle": "सामान की पहचान और कुल राशि की गणना हो रही है।",
    "order.status.saving.title": "लेन-देन दर्ज हो रहा है...",
    "order.status.saving.subtitle": "खाता और दुकान का स्टॉक अपडेट किया जा रहा है।",
    "order.status.review.title": "आपका बिल तैयार है",
    "order.status.review.subtitle": "नीचे सामान जांचें या और जोड़ने के लिए माइक फिर से दबाएं।",
    "order.status.error.title": "अनुरोध प्रोसेस नहीं हो सका",
    "order.status.error.subtitle": "पुनः प्रयास के लिए माइक दबाएं या सामान खुद जोड़ें।",
    "order.status.idle.title": "बिल बनाने के लिए तैयार",
    "order.status.idle.subtitle": "माइक दबाएं और बताएं कि ग्राहक ने क्या खरीदा।",
    "order.voiceOperationNotice": "वॉइस ऑपरेशन सूचना",
    "order.lowStockAlert": "बिल में शामिल सामान के लिए कम स्टॉक चेतावनी",
    "order.lowStockDesc": "निम्नलिखित सामान का स्टॉक कम हो रहा है",
    "order.billItems": "बिल के सामान",
    "order.localEditsApplied": "स्थानीय बदलाव लागू किए गए",
    "order.addMore": "और जोड़ें",
    "order.noItemsTitle": "इस ड्राफ्ट बिल में अभी कोई सामान नहीं है",
    "order.noItemsDesc": "ऊपर दिए गए बड़े माइक्रोफ़ोन बटन पर टैप करें और ग्राहक द्वारा खरीदे गए सामान बोलें (उदा. '2 किलो चावल और 1 लीटर तेल') या 'सामान खुद जोड़ें' पर टैप करें।",
    "order.addFromStock": "स्टॉक से जोड़ें",

    // Transcript Panel
    "transcript.recognizedOrder": "पहचाना गया ग्राहक ऑर्डर",
    "transcript.editText": "टेक्स्ट बदलें",
    "transcript.speakAgain": "फिर से बोलें",
    "transcript.reparseItems": "सामान पुनः प्रोसेस करें",
    "transcript.cancel": "रद्द करें",
    "transcript.assistant": "सहायक:",
    "transcript.stopVoice": "आवाज रोकें",
    "transcript.replayVoice": "आवाज दोबारा सुनें",

    // Bill Summary & Items
    "bill.title": "वर्तमान बिल",
    "bill.draftBadge": "ड्राफ्ट",
    "bill.confirmedBadge": "पक्का बिल",
    "bill.paymentMode": "भुगतान का प्रकार",
    "bill.cash": "नकद",
    "bill.upi": "यूपीआई / क्यूआर",
    "bill.khata": "खाता (उधार)",
    "bill.itemsInCart": "कार्ट में सामान:",
    "bill.itemsCount": "सामान",
    "bill.subtotal": "उप-योग:",
    "bill.taxes": "कर:",
    "bill.taxesIncluded": "कीमत में शामिल",
    "bill.totalBill": "कुल बिल:",
    "bill.grandTotal": "महायोग:",
    "bill.confirmSale": "बिक्री पक्की करें",
    "bill.addItem": "सामान जोड़ें",
    "bill.cancelSale": "बिक्री रद्द करें",
    "bill.sureToCancel": "क्या सच में रद्द करना है?",
    "bill.noItems": "अभी तक कोई सामान नहीं जोड़ा गया। बोलें या सामान जोड़ें पर क्लिक करें।",
    "bill.product": "उत्पाद",
    "bill.quantity": "मात्रा",
    "bill.unitPrice": "इकाई मूल्य",
    "bill.lineTotal": "कुल राशि",
    "bill.actions": "कार्रवाई",
    "bill.editQty": "मात्रा बदलें",
    "bill.removeItem": "हटाएं",

    // Bills History
    "bills.title": "बिल इतिहास",
    "bills.subtitle": "पहले पुष्टि किए गए सभी बिक्री रिकॉर्ड और विस्तृत इनवॉइस देखें",
    "bills.billNumber": "बिल सं.",
    "bills.dateTime": "दिनांक और समय",
    "bills.itemsCount": "वस्तुएं",
    "bills.totalAmount": "कुल राशि",
    "bills.viewFullBill": "पूरा बिल देखें",
    "bills.emptyTitle": "अभी तक कोई बिल दर्ज नहीं किया गया है",
    "bills.emptyDesc": "पुष्टि की गई ग्राहक बिक्री पूरी होने के बाद अपने आप यहां दिखाई देगी।",
    "bills.startNewSale": "पहला बिल बनाएं",
    "bills.modalTitle": "बिल का विवरण",
    "bills.modalSubtitle": "पुष्टि किए गए बिक्री इनवॉइस का विवरण",
    "bills.backToHistory": "बिल इतिहास पर वापस जाएं",
    "bills.printReceipt": "रसीद प्रिंट करें",
    "bills.product": "उत्पाद",
    "bills.quantity": "मात्रा",
    "bills.unitPrice": "इकाई मूल्य",
    "bills.lineTotal": "कुल राशि",
    "bills.grandTotal": "कुल योग",
    "bills.loading": "बिल इतिहास लोड हो रहा है...",
    "bills.errorLoading": "बिल इतिहास लोड करने में विफल।",

    // Dashboard
    "dashboard.todaySales": "आज की कुल बिक्री",
    "dashboard.todaySalesSub": "आज के सभी ऑर्डरों से दर्ज की गई कुल आय",
    "dashboard.transactions": "लेन-देन",
    "dashboard.vsYesterday": "कल की तुलना में",
    "dashboard.totalProducts": "कुल उत्पाद",
    "dashboard.activeCatalog": "सक्रिय कैटलॉग वस्तुएं",
    "dashboard.lowStockWarnings": "कम स्टॉक की चेतावनी",
    "dashboard.needsReorder": "पुनः मंगाना आवश्यक",
    "dashboard.healthy": "पर्याप्त स्टॉक",
    "dashboard.averageBill": "औसत बिल मूल्य",
    "dashboard.perBasket": "प्रति ग्राहक खरीद",
    "dashboard.recentTransactions": "हाल के लेन-देन",
    "dashboard.viewLedger": "पूरा बिक्री बहीखाता और ग्राहक इतिहास देखें",
    "dashboard.noTransactions": "आज अभी तक कोई लेन-देन दर्ज नहीं हुआ है।",
    "dashboard.viewAll": "सभी देखें",

    // Stock
    "stock.title": "स्टॉक प्रबंधन",
    "stock.items": "वस्तुएं",
    "stock.subtitle": "स्टॉक की मात्रा, इकाई और कम स्टॉक की स्थिति की निगरानी करें",
    "stock.addNew": "नया उत्पाद जोड़ें",
    "stock.refresh": "रिफ್ರೆश",
    "stock.searchPlaceholder": "उत्पाद का नाम या कोड खोजें...",
    "stock.filterAll": "सभी वस्तुएं",
    "stock.filterInStock": "स्टॉक में उपलब्ध",
    "stock.filterLowStock": "कम स्टॉक",
    "stock.filterOutOfStock": "स्टॉक खत्म",
    "stock.colName": "उत्पाद का नाम",
    "stock.colSku": "कोड / एसकेयू",
    "stock.colUnit": "इकाई",
    "stock.colStock": "स्टॉक में",
    "stock.colLimit": "न्यूनतम सीमा",
    "stock.colActions": "कार्रवाई",
    "stock.deleteConfirm": "क्या आप वाकई इस उत्पाद को स्टॉक से हटाना चाहते हैं?",
    "stock.inStockBadge": "उपलब्ध",
    "stock.lowStockBadge": "कम स्टॉक",
    "stock.outOfStockBadge": "स्टॉक खत्म",
    "stock.edit": "संपादित करें",
    "stock.delete": "हटाएं",

    // Summary
    "summary.title": "दैनिक सारांश",
    "summary.subtitle": "दैनिक बिक्री बहीखाता, प्रति घंटे का प्रदर्शन और स्टॉक स्थिति",
    "summary.today": "आज",
    "summary.salesToday": "आज की बिक्री",
    "summary.billsCount": "कुल बिल",
    "summary.averageTicket": "औसत बिल",
    "summary.cashCollections": "नकद वसूली",
    "summary.upiDigital": "यूपीआई / डिजिटल",
    "summary.khataCredit": "खाता / उधार",
    "summary.hourlyTrend": "प्रति घंटे बिक्री का रुझान",
    "summary.topProducts": "सर्वाधिक बिकने वाले उत्पाद",
    "summary.lowStockAlert": "कम स्टॉक की चेतावनी",
    "summary.recentHistory": "हालिया बिक्री इतिहास",
    "summary.remaining": "बचे हैं",
    "summary.none": "कोई नहीं",
    "summary.colBillNo": "बिल #",
    "summary.colTime": "समय",
    "summary.colItems": "वस्तुएं",
    "summary.colPayment": "भुगतान",
    "summary.colAmount": "राशि",
    "summary.colStatus": "स्थिति",
    "summary.completed": "सफल",

    // Success / Receipt
    "success.title": "बिक्री पक्की हुई!",
    "success.paymentConfirmed": "भुगतान प्राप्त हुआ",
    "success.message": "आपका लेन-देन दुकान के बहीखाते में सफलतापूर्वक दर्ज हो गया है।",
    "success.billNumber": "बिल नंबर:",
    "success.totalItems": "कुल वस्तुएं:",
    "success.transactionTime": "लेन-देन का समय:",
    "success.grandTotal": "महायोग:",
    "success.autoStockDeducted": "दुकान के स्टॉक से मात्रा स्वचालित रूप से घटाई गई",
    "success.lowStockWarning": "कम स्टॉक चेतावनी:",
    "success.startNewBill": "नया बिल बनाएं",
    "success.printReceipt": "रसीद प्रिंट करें",
    "success.dashboard": "डैशबोर्ड",

    // Settings
    "settings.title": "सेटिंग्स और प्राथमिकताएं",
    "settings.subtitle": "अपनी दुकान का प्रोफाइल, वॉइस मॉडल और क्षेत्रीय भाषाएं प्रबंधित करें",
    "settings.saved": "सेटिंग्स सहेजी गईं",
    "settings.shopProfile": "दुकान का प्रोफाइल",
    "settings.shopName": "दुकान का नाम",
    "settings.ownerName": "मालिक का नाम",
    "settings.phone": "फोन नंबर",
    "settings.gstin": "जीएसटी नंबर (वैकल्पिक)",
    "settings.city": "शहर / स्थान",
    "settings.languageSectionTitle": "वेबसाइट की भाषा",
    "settings.languageSectionSubtitle": "पूरी वेबसाइट इंटरफ़ेस के लिए अपनी पसंदीदा भाषा चुनें:",
    "settings.liveBadge": "सक्रिय",
    "settings.readyBadge": "सक्रिय",
    "settings.voiceSectionTitle": "वॉइस प्राथमिकताएं",
    "settings.autoParseTitle": "बोले गए सामान को तुरंत पहचानें",
    "settings.autoParseSub": "शांत होने पर सामान को स्वचालित रूप से पहचानें",
    "settings.chimeTitle": "पुष्टि होने पर हल्की आवाज बजाएं",
    "settings.chimeSub": "बिक्री पक्की होने पर एक सुखद पुष्टि ध्वनि बजाता है",
    "settings.currencySectionTitle": "मुद्रा और संख्या प्रारूप",
    "settings.rupeeTitle": "भारतीय रुपया (INR ₹)",
    "settings.rupeeSub": "लाख और करोड़ मानक के अनुसार: ₹1,00,000.00",
    "settings.defaultStandard": "मानक प्रारूप",
    "settings.savePreferences": "प्राथमिकताएं सहेजें",

    // Common
    "common.save": "सहेजें",
    "common.cancel": "रद्द करें",
    "common.close": "बंद करें",
    "common.retry": "पुनः प्रयास करें",
    "common.loading": "लोड हो रहा है...",
    "common.error": "त्रुटि",
    "common.delete": "हटाएं",
    "common.edit": "संपादित करें",
    "common.none": "कोई नहीं",
    "common.rupees": "रुपये",
    "common.items": "वस्तुएं",
  },

  kn: {
    // Navigation
    "nav.newOrder": "ಹೊಸ ಆರ್ಡರ್",
    "nav.dashboard": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    "nav.stock": "ದಾಸ್ತಾನು ನಿರ್ವಹಣೆ",
    "nav.billsHistory": "ಬಿಲ್ ಇತಿಹಾಸ",
    "nav.summary": "ದೈನಂದಿನ ಸಾರಾಂಶ",
    "nav.settings": "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    "nav.pro": "ಪ್ರೊ",
    "nav.posSubtitle": "ಸ್ಮಾರ್ಟ್ ವಾಯ್ಸ್ ಕಿರಾಣಿ ಪಿಒಎಸ್",
    "nav.voiceIntelligence": "ವಾಯ್ಸ್ ಬುದ್ಧಿಮತ್ತೆ",
    "nav.voiceBannerText": "ಕೆಲವೇ ಸೆಕೆಂಡುಗಳಲ್ಲಿ ಬಿಲ್ ಮಾಡಲು ಕನ್ನಡ, ಹಿಂದಿ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಮಾತನಾಡಿ.",
    "nav.startVoiceOrder": "ವಾಯ್ಸ್ ಆರ್ಡರ್ ಪ್ರಾರಂಭಿಸಿ",
    "nav.online": "ಆನ್‌ಲೈನ್",

    // Header
    "header.greeting": "ನಮಸ್ಕಾರ, ಮತ್ತೆ ಸ್ವಾಗತ!",
    "header.languageSettings": "ಭಾಷಾ ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    "header.newOrderBtn": "ಹೊಸ ಆರ್ಡರ್",
    "header.notifications": "ಸೂಚನೆಗಳು",

    // Order / Home page
    "order.newOrder": "ಹೊಸ ಆರ್ಡರ್",
    "order.voiceAiReady": "ವಾಯ್ಸ್ ಎಐ ಸಿದ್ಧವಾಗಿದೆ",
    "order.draftId": "ಡ್ರಾಫ್ಟ್ ಐಡಿ:",
    "order.newOrderDraft": "#ಹೊಸ-ಆರ್ಡರ್",
    "order.heroInstruction": "ಕೆಳಗಿನ ಮೈಕ್ ಒತ್ತಿ ಅಥವಾ ಸರಕುಗಳ ವಿವರವನ್ನು ಸ್ವಾಭಾವಿಕವಾಗಿ ಹೇಳಿ",
    "order.dashboardBtn": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    "order.addItemManually": "ಸ್ವತಃ ಸೇರಿಸಿ",
    "order.voiceGuide": "ವಾಯ್ಸ್ ಗೈಡ್:",
    "order.language": "ಭಾಷೆ:",
    "order.status.listening.title": "ಆಲಿಸುತ್ತಿದೆ...",
    "order.status.listening.subtitle": "ಸ್ವಾಭಾವಿಕವಾಗಿ ಮಾತನಾಡಿ. ನಿಮ್ಮ ಆರ್ಡರ್ ಆಲಿಸಲಾಗುತ್ತಿದೆ.",
    "order.status.processing.title": "ಬಿಲ್ ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ...",
    "order.status.processing.subtitle": "ಸರಕುಗಳನ್ನು ಗುರುತಿಸಿ ಒಟ್ಟು ಮೊತ್ತ ಲೆಕ್ಕ ಮಾಡಲಾಗುತ್ತಿದೆ.",
    "order.status.saving.title": "ವಹಿವಾಟು ದೃಢೀಕರಿಸಲಾಗುತ್ತಿದೆ...",
    "order.status.saving.subtitle": "ಖಾತೆ ಮತ್ತು ಅಂಗಡಿಯ ದಾಸ್ತಾನು ನವೀಕರಿಸಲಾಗುತ್ತಿದೆ.",
    "order.status.review.title": "ನಿಮ್ಮ ಬಿಲ್ ಸಿದ್ಧವಾಗಿದೆ",
    "order.status.review.subtitle": "ಕೆಳಗಿನ ಸರಕುಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಅಥವಾ ಇನ್ನಷ್ಟು ಸೇರಿಸಲು ಮೈಕ್ ಒತ್ತಿ.",
    "order.status.error.title": "ವಿನಂತಿಯನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ",
    "order.status.error.subtitle": "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಲು ಮೈಕ್ ಒತ್ತಿ ಅಥವಾ ಸರಕುಗಳನ್ನು ಸ್ವತಃ ಸೇರಿಸಿ.",
    "order.status.idle.title": "ಬಿಲ್ ರಚಿಸಲು ಸಿದ್ಧ",
    "order.status.idle.subtitle": "ಮೈಕ್ ಒತ್ತಿ ಗ್ರಾಹಕರು ಖರೀದಿಸಿದ ವಸ್ತುಗಳನ್ನು ಹೇಳಿ.",
    "order.voiceOperationNotice": "ವಾಯ್ಸ್ ಕಾರ್ಯಾಚರಣೆ ಸೂಚನೆ",
    "order.lowStockAlert": "ಬಿಲ್‌ನಲ್ಲಿರುವ ಸರಕುಗಳಿಗೆ ಕಡಿಮೆ ದಾಸ್ತಾನು ಎಚ್ಚರಿಕೆ",
    "order.lowStockDesc": "ಕೆಳಗಿನ ಸರಕುಗಳ ದಾಸ್ತಾನು ಕಡಿಮೆಯಾಗಿದೆ",
    "order.billItems": "ಬಿಲ್ ಸರಕುಗಳು",
    "order.localEditsApplied": "ಸ್ಥಳೀಯ ಬದಲಾವಣೆಗಳನ್ನು ಅನ್ವಯಿಸಲಾಗಿದೆ",
    "order.addMore": "ಇನ್ನಷ್ಟು ಸೇರಿಸಿ",
    "order.noItemsTitle": "ಈ ಡ್ರಾಫ್ಟ್ ಬಿಲ್‌ನಲ್ಲಿ ಇನ್ನೂ ಯಾವುದೇ ಸರಕುಗಳಿಲ್ಲ",
    "order.noItemsDesc": "ಮೇಲಿನ ದೊಡ್ಡ ಮೈಕ್ರೊಫೋನ್ ಬಟನ್ ಒತ್ತಿ ಗ್ರಾಹಕರು ಖರೀದಿಸಿದ ವಸ್ತುಗಳನ್ನು ಹೇಳಿ (ಉದಾ. '2 ಕೆಜಿ ಅಕ್ಕಿ ಮತ್ತು 1 ಲೀಟರ್ ಎಣ್ಣೆ') ಅಥವಾ 'ಸ್ವತಃ ಸೇರಿಸಿ' ಒತ್ತಿ.",
    "order.addFromStock": "ದಾಸ್ತಾನಿನಿಂದ ಸೇರಿಸಿ",

    // Transcript Panel
    "transcript.recognizedOrder": "ಗುರುತಿಸಲಾದ ಗ್ರಾಹಕರ ಆರ್ಡರ್",
    "transcript.editText": "ಪಠ್ಯ ತಿದ್ದುಪಡಿ",
    "transcript.speakAgain": "ಮತ್ತೆ ಮಾತನಾಡಿ",
    "transcript.reparseItems": "ಸರಕುಗಳನ್ನು ಮರುಪರಿಶೀಲಿಸಿ",
    "transcript.cancel": "ರದ್ದುಮಾಡಿ",
    "transcript.assistant": "ಸಹಾಯಕ:",
    "transcript.stopVoice": "ಧ್ವನಿ ನಿಲ್ಲಿಸಿ",
    "transcript.replayVoice": "ಧ್ವನಿ ಮತ್ತೆ ಕೇಳಿ",

    // Bill Summary & Items
    "bill.title": "ಪ್ರಸ್ತುತ ಬಿಲ್",
    "bill.draftBadge": "ಕರಡು",
    "bill.confirmedBadge": "ದೃಢೀಕೃತ",
    "bill.paymentMode": "ಪಾವತಿ ವಿಧಾನ",
    "bill.cash": "ನಗದು",
    "bill.upi": "ಯುಪಿಐ / ಕ್ಯೂಆರ್",
    "bill.khata": "ಖಾತೆ (ಉದ್ದರಿ)",
    "bill.itemsInCart": "ಕಾರ್ಟ್‌ನಲ್ಲಿರುವ ಸರಕುಗಳು:",
    "bill.itemsCount": "ಸರಕುಗಳು",
    "bill.subtotal": "ಉಪ-ಮೊತ್ತ:",
    "bill.taxes": "ತೆರಿಗೆ:",
    "bill.taxesIncluded": "ಬೆಲೆಯಲ್ಲಿ ಸೇರಿದೆ",
    "bill.totalBill": "ಒಟ್ಟು ಬಿಲ್:",
    "bill.grandTotal": "ಒಟ್ಟು ಮೊತ್ತ:",
    "bill.confirmSale": "ಮಾರಾಟ ದೃಢೀಕರಿಸಿ",
    "bill.addItem": "ಸರಕು ಸೇರಿಸಿ",
    "bill.cancelSale": "ಮಾರಾಟ ರದ್ದುಮಾಡಿ",
    "bill.sureToCancel": "ಖಚಿತವಾಗಿ ರದ್ದುಗೊಳಿಸಬೇಕೇ?",
    "bill.noItems": "ಇನ್ನೂ ಯಾವುದೇ ಸರಕುಗಳನ್ನು ಸೇರಿಸಲಾಗಿಲ್ಲ. ಮಾತನಾಡಿ ಅಥವಾ ಸೇರಿಸಿ ಬಟನ್ ಒತ್ತಿ.",
    "bill.product": "ಉತ್ಪನ್ನ",
    "bill.quantity": "ಪ್ರಮಾಣ",
    "bill.unitPrice": "ಯೂನಿಟ್ ಬೆಲೆ",
    "bill.lineTotal": "ಒಟ್ಟು ಮೊತ್ತ",
    "bill.actions": "ಕ್ರಮಗಳು",
    "bill.editQty": "ಪ್ರಮಾಣ ಬದಲಾಯಿಸಿ",
    "bill.removeItem": "ತೆಗೆದುಹಾಕಿ",

    // Bills History
    "bills.title": "ಬಿಲ್ ಇತಿಹಾಸ",
    "bills.subtitle": "ಹಿಂದೆ ದೃಢೀಕರಿಸಲಾದ ಎಲ್ಲಾ ಮಾರಾಟ ದಾಖಲೆಗಳು ಮತ್ತು ವಿವರವಾದ ಇನ್‌ವಾಯ್ಸ್‌ಗಳನ್ನು ವೀಕ್ಷಿಸಿ",
    "bills.billNumber": "ಬಿಲ್ ಸಂ.",
    "bills.dateTime": "ದಿನಾಂಕ ಮತ್ತು ಸಮಯ",
    "bills.itemsCount": "ವಸ್ತುಗಳು",
    "bills.totalAmount": "ಒಟ್ಟು ಮೊತ್ತ",
    "bills.viewFullBill": "ಪೂರ್ಣ ಬಿಲ್ ವೀಕ್ಷಿಸಿ",
    "bills.emptyTitle": "ಇನ್ನೂ ಯಾವುದೇ ಬಿಲ್‌ಗಳನ್ನು ದಾಖಲಿಸಲಾಗಿಲ್ಲ",
    "bills.emptyDesc": "ಪೂರ್ಣಗೊಂಡ ನಂತರ ದೃಢೀಕರಿಸಿದ ಗ್ರಾಹಕ ಮಾರಾಟಗಳು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಇಲ್ಲಿ ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತವೆ.",
    "bills.startNewSale": "ಮೊದಲ ಬಿಲ್ ರಚಿಸಿ",
    "bills.modalTitle": "ಬಿಲ್ ವಿವರಗಳು",
    "bills.modalSubtitle": "ದೃಢೀಕರಿಸಿದ ಮಾರಾಟ ಇನ್‌ವಾಯ್ಸ್ ವಿವರ",
    "bills.backToHistory": "ಬಿಲ್ ಇತಿಹಾಸಕ್ಕೆ ಹಿಂತಿರುಗಿ",
    "bills.printReceipt": "ರಶೀದಿ ಮುದ್ರಿಸಿ",
    "bills.product": "ಉತ್ಪನ್ನ",
    "bills.quantity": "ಪ್ರಮಾಣ",
    "bills.unitPrice": "ಯೂನಿಟ್ ಬೆಲೆ",
    "bills.lineTotal": "ಒಟ್ಟು ಮೊತ್ತ",
    "bills.grandTotal": "ಒಟ್ಟು ಮೊತ್ತ",
    "bills.loading": "ಬಿಲ್ ಇತಿಹಾಸವನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...",
    "bills.errorLoading": "ಬಿಲ್ ಇತಿಹಾಸವನ್ನು ಲೋಡ್ ಮಾಡಲು ವಿಫಲವಾಗಿದೆ.",

    // Dashboard
    "dashboard.todaySales": "ಇಂದಿನ ಒಟ್ಟು ಆದಾಯ",
    "dashboard.todaySalesSub": "ಇಂದಿನ ಎಲ್ಲಾ ಆರ್ಡರ್‌ಗಳಿಂದ ದಾಖಲಾದ ಒಟ್ಟು ಗಳಿಕೆ",
    "dashboard.transactions": "ವಹಿವಾಟುಗಳು",
    "dashboard.vsYesterday": "ನಿನ್ನೆಗೆ ಹೋಲಿಸಿದರೆ",
    "dashboard.totalProducts": "ಒಟ್ಟು ಉತ್ಪನ್ನಗಳು",
    "dashboard.activeCatalog": "ಸಕ್ರಿಯ ಕ್ಯಾಟಲಾಗ್ ಸರಕುಗಳು",
    "dashboard.lowStockWarnings": "ಕಡಿಮೆ ದಾಸ್ತಾನು ಎಚ್ಚರಿಕೆ",
    "dashboard.needsReorder": "ಮರು-ಆರ್ಡರ್ ಅಗತ್ಯವಿದೆ",
    "dashboard.healthy": "ಸಾಕಷ್ಟಿದೆ",
    "dashboard.averageBill": "ಸರಾಸರಿ ಬಿಲ್ ಮೌಲ್ಯ",
    "dashboard.perBasket": "ಪ್ರತಿ ಗ್ರಾಹಕರ ಖರೀದಿ",
    "dashboard.recentTransactions": "ಇತ್ತೀಚಿನ ವಹಿವಾಟುಗಳು",
    "dashboard.viewLedger": "ಸಂಪೂರ್ಣ ಮಾರಾಟ ಖಾತೆ ಮತ್ತು ಇತಿಹಾಸ ವೀಕ್ಷಿಸಿ",
    "dashboard.noTransactions": "ಇಂದು ಇನ್ನೂ ಯಾವುದೇ ವಹಿವಾಟು ದಾಖಲಾಗಿಲ್ಲ.",
    "dashboard.viewAll": "ಎಲ್ಲವನ್ನೂ ವೀಕ್ಷಿಸಿ",

    // Stock
    "stock.title": "ದಾಸ್ತಾನು ನಿರ್ವಹಣೆ",
    "stock.items": "ಸರಕುಗಳು",
    "stock.subtitle": "ದಾಸ್ತಾನು ಪ್ರಮಾಣ, ಯೂನಿಟ್ ಪ್ರಕಾರ ಮತ್ತು ಕಡಿಮೆ ದಾಸ್ತಾನು ಸ್ಥಿತಿ ವೀಕ್ಷಿಸಿ",
    "stock.addNew": "ಹೊಸ ಉತ್ಪನ್ನ ಸೇರಿಸಿ",
    "stock.refresh": "ನವೀಕರಿಸಿ",
    "stock.searchPlaceholder": "ಉತ್ಪನ್ನದ ಹೆಸರು ಅಥವಾ ಕೋಡ್ ಹುಡುಕಿ...",
    "stock.filterAll": "ಎಲ್ಲಾ ಸರಕುಗಳು",
    "stock.filterInStock": "ದಾಸ್ತಾನಿನಲ್ಲಿದೆ",
    "stock.filterLowStock": "ಕಡಿಮೆ ದಾಸ್ತಾನು",
    "stock.filterOutOfStock": "ದಾಸ್ತಾನು ಮುಗಿದಿದೆ",
    "stock.colName": "ಉತ್ಪನ್ನದ ಹೆಸರು",
    "stock.colSku": "ಕೋಡ್ / ಎಸ್‌ಕೆಯು",
    "stock.colUnit": "ಯೂನಿಟ್",
    "stock.colStock": "ದಾಸ್ತಾನಿನಲ್ಲಿದೆ",
    "stock.colLimit": "ಕನಿಷ್ಠ ಮಿತಿ",
    "stock.colActions": "ಕ್ರಮಗಳು",
    "stock.deleteConfirm": "ನೀವು ನಿಜವಾಗಿಯೂ ಈ ಉತ್ಪನ್ನವನ್ನು ದಾಸ್ತಾನಿನಿಂದ ತೆಗೆದುಹಾಕಲು ಬಯಸುವಿರಾ?",
    "stock.inStockBadge": "ಲಭ್ಯವಿದೆ",
    "stock.lowStockBadge": "ಕಡಿಮೆ ದಾಸ್ತಾನು",
    "stock.outOfStockBadge": "ಮುಗಿದಿದೆ",
    "stock.edit": "ತಿದ್ದುಪಡಿ",
    "stock.delete": "ತೆಗೆದುಹಾಕಿ",

    // Summary
    "summary.title": "ದೈನಂದಿನ ಸಾರಾಂಶ",
    "summary.subtitle": "ದೈನಂದಿನ ಮಾರಾಟ ಖಾತೆ, ಗಂಟೆಯ ಪ್ರದರ್ಶನ ಮತ್ತು ದಾಸ್ತಾನು ಸ್ಥಿತಿ",
    "summary.today": "ಇಂದು",
    "summary.salesToday": "ಇಂದಿನ ಮಾರಾಟ",
    "summary.billsCount": "ಒಟ್ಟು ಬಿಲ್‌ಗಳು",
    "summary.averageTicket": "ಸರಾಸರಿ ಬಿಲ್",
    "summary.cashCollections": "ನಗದು ಸಂಗ್ರಹ",
    "summary.upiDigital": "ಯುಪಿಐ / ಡಿಜಿಟಲ್",
    "summary.khataCredit": "ಖಾತೆ / ಉದ್ದರಿ",
    "summary.hourlyTrend": "ಗಂಟೆಯ ಮಾರಾಟ ಪ್ರವೃತ್ತಿ",
    "summary.topProducts": "ಹೆಚ್ಚು ಮಾರಾಟವಾದ ಸರಕುಗಳು",
    "summary.lowStockAlert": "ಕಡಿಮೆ ದಾಸ್ತಾನು ಎಚ್ಚರಿಕೆ",
    "summary.recentHistory": "ಇತ್ತೀಚಿನ ಮಾರಾಟ ಇತಿಹಾಸ",
    "summary.remaining": "ಉಳಿದಿದೆ",
    "summary.none": "ಯಾವುದೂ ಇಲ್ಲ",
    "summary.colBillNo": "ಬಿಲ್ #",
    "summary.colTime": "ಸಮಯ",
    "summary.colItems": "ಸರಕುಗಳು",
    "summary.colPayment": "ಪಾವತಿ",
    "summary.colAmount": "ಮೊತ್ತ",
    "summary.colStatus": "ಸ್ಥಿತಿ",
    "summary.completed": "ಪೂರ್ಣಗೊಂಡಿದೆ",

    // Success / Receipt
    "success.title": "ಮಾರಾಟ ದೃಢೀಕರಿಸಲಾಗಿದೆ!",
    "success.paymentConfirmed": "ಪಾವತಿ ದೃಢೀಕರಿಸಲಾಗಿದೆ",
    "success.message": "ನಿಮ್ಮ ವಹಿವಾಟು ಅಂಗಡಿಯ ಖಾತೆಯಲ್ಲಿ ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಾಗಿದೆ.",
    "success.billNumber": "ಬಿಲ್ ಸಂಖ್ಯೆ:",
    "success.totalItems": "ಒಟ್ಟು ಸರಕುಗಳು:",
    "success.transactionTime": "ವಹಿವಾಟಿನ ಸಮಯ:",
    "success.grandTotal": "ಒಟ್ಟು ಮೊತ್ತ:",
    "success.autoStockDeducted": "ಸರ್ವರ್‌ನಲ್ಲಿ ದಾಸ್ತಾನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಕಡಿತಗೊಳಿಸಲಾಗಿದೆ",
    "success.lowStockWarning": "ಕಡಿಮೆ ದಾಸ್ತಾನು ಎಚ್ಚರಿಕೆ:",
    "success.startNewBill": "ಹೊಸ ಬಿಲ್ ಪ್ರಾರಂಭಿಸಿ",
    "success.printReceipt": "ರಶೀದಿ ಪ್ರಿಂಟ್ ಮಾಡಿ",
    "success.dashboard": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",

    // Settings
    "settings.title": "ಸೆಟ್ಟಿಂಗ್‌ಗಳು ಮತ್ತು ಆದ್ಯತೆಗಳು",
    "settings.subtitle": "ನಿಮ್ಮ ಅಂಗಡಿಯ ಪ್ರೊಫೈಲ್, ಧ್ವನಿ ಮಾದರಿಗಳು ಮತ್ತು ಪ್ರಾದೇಶಿಕ ಭಾಷೆಗಳನ್ನು ನಿರ್ವಹಿಸಿ",
    "settings.saved": "ಸೆಟ್ಟಿಂಗ್‌ಗಳನ್ನು ಉಳಿಸಲಾಗಿದೆ",
    "settings.shopProfile": "ಅಂಗಡಿಯ ಪ್ರೊಫೈಲ್",
    "settings.shopName": "ಅಂಗಡಿಯ ಹೆಸರು",
    "settings.ownerName": "ಮಾಲೀಕರ ಹೆಸರು",
    "settings.phone": "ಫೋನ್ ಸಂಖ್ಯೆ",
    "settings.gstin": "ಜಿಎಸ್‌ಟಿ ಸಂಖ್ಯೆ (ಐಚ್ಛಿಕ)",
    "settings.city": "ನಗರ / ಸ್ಥಳ",
    "settings.languageSectionTitle": "ವೆಬ್‌ಸೈಟ್ ಭಾಷೆ",
    "settings.languageSectionSubtitle": "ಸಂಪೂರ್ಣ ವೆಬ್‌ಸೈಟ್ ಇಂಟರ್‌ಫೇಸ್‌ಗಾಗಿ ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ:",
    "settings.liveBadge": "ಸಕ್ರಿಯ",
    "settings.readyBadge": "ಸಕ್ರಿಯ",
    "settings.voiceSectionTitle": "ವಾಯ್ಸ್ ಆದ್ಯತೆಗಳು",
    "settings.autoParseTitle": "ಹೇಳಲಾದ ಸರಕುಗಳನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಿ",
    "settings.autoParseSub": "ಮೌನ ಪತ್ತೆಯಾದಾಗ ಸರಕುಗಳನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಿ",
    "settings.chimeTitle": "ದೃಢೀಕರಣದ ಸಮಯದಲ್ಲಿ ಸೌಮ್ಯ ಧ್ವನಿ",
    "settings.chimeSub": "ಮಾರಾಟ ದೃಢೀಕರಿಸಿದಾಗ ಮೃದುವಾದ ದೃಢೀಕರಣ ಶಬ್ದವನ್ನು ಪ್ಲೇ ಮಾಡುತ್ತದೆ",
    "settings.currencySectionTitle": "ಕರೆನ್ಸಿ ಮತ್ತು ಸಂಖ್ಯೆ ಸ್ವರೂಪ",
    "settings.rupeeTitle": "ಭಾರತೀಯ ರೂಪಾಯಿ (INR ₹)",
    "settings.rupeeSub": "ಲಕ್ಷ ಮತ್ತು ಕೋಟಿ ಮಾನದಂಡದ ಪ್ರಕಾರ: ₹1,00,000.00",
    "settings.defaultStandard": "ಡೀಫಾಲ್ಟ್ ಮಾನದಂಡ",
    "settings.savePreferences": "ಆದ್ಯತೆಗಳನ್ನು ಉಳಿಸಿ",

    // Common
    "common.save": "ಉಳಿಸಿ",
    "common.cancel": "ರದ್ದುಮಾಡಿ",
    "common.close": "ಮುಚ್ಚಿ",
    "common.retry": "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
    "common.loading": "ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
    "common.error": "ದೋಷ",
    "common.delete": "ತೆಗೆದುಹಾಕಿ",
    "common.edit": "ತಿದ್ದುಪಡಿ",
    "common.none": "ಯಾವುದೂ ಇಲ್ಲ",
    "common.rupees": "ರೂಪಾಯಿ",
    "common.items": "ಸರಕುಗಳು",
  },
};

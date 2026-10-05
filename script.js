document.addEventListener('DOMContentLoaded', () => {
  // Cari butang hantar atau "Continue to payment"
  const submitBtn = document.querySelector('button[type="submit"], .checkout-btn, #submit-order'); // Sesuaikan kelas jika perlu
  
  if (!submitBtn) return;

  submitBtn.addEventListener('click', (e) => {
    // Ambil data daripada borang
    const fullName = document.querySelector('input[name="fullname"], input#fullname, .full-name-input')?.value || 'Test User';
    const email = document.querySelector('input[name="email"], input#email')?.value || 'test@email.com';
    const total = document.querySelector('.total-amount, #total-price')?.innerText || '$12.00';
    
    // Ambil kaedah pembayaran yang dipilih
    const selectedPayment = document.querySelector('.option-box.selected')?.innerText || 'Visa / Mastercard';

    const orderData = {
      customer: {
        fullName: fullName,
        email: email
      },
      total: total,
      paymentMethod: selectedPayment,
      items: [{ name: "Custom Cap", price: total }]
    };

    // Hantar ke Google Sheets menggunakan API Apps Script
    if (window.CHECKOUT_CONFIG && window.CHECKOUT_CONFIG.orderApiUrl) {
      fetch(window.CHECKOUT_CONFIG.orderApiUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(orderData)
      }).catch(err => console.error(err));
    }
  });
});
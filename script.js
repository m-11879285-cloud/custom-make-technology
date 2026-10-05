document.addEventListener('click', (e) => {
  const target = e.target.closest('button');
  if (!target) return;
  
  if (target.innerText.includes('Continue to payment') || target.innerText.includes('Submit')) {
    e.preventDefault(); // Elakkan tindakan lalai butang

    // Ambil data borang dengan selamat
    const fullNameInput = document.querySelector('input[name="fullname"], input#fullname') || document.querySelectorAll('input')[0];
    const emailInput = document.querySelector('input[name="email"], input#email') || document.querySelectorAll('input')[1];
    
    const fullName = fullNameInput ? fullNameInput.value : 'Test User';
    const email = emailInput ? emailInput.value : 'test@email.com';
    const selectedBox = document.querySelector('.option-box.selected');
    const selectedPayment = selectedBox ? selectedBox.innerText.trim() : 'Visa / Mastercard';

    const orderData = {
      customer: { fullName, email },
      total: "$12.00",
      paymentMethod: selectedPayment,
      items: [{ name: "Custom Cap", price: "$12.00" }]
    };

    // Hantar menggunakan fetch no-cors yang bersih
    if (window.CHECKOUT_CONFIG && window.CHECKOUT_CONFIG.orderApiUrl) {
      fetch(window.CHECKOUT_CONFIG.orderApiUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(orderData)
      }).then(() => {
        alert('Pesanan berjaya dihantar ke sistem!');
        location.reload();
      }).catch(err => {
        console.error('Ralat hantar:', err);
      });
    }
  }
});
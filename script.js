document.addEventListener('click', (e) => {
  const target = e.target.closest('button');
  if (!target) return;
  
  if (target.innerText.includes('Continue to payment') || target.innerText.includes('Submit')) {
    e.preventDefault();

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

    // Ganti terus URL Web App baharu di sini secara langsung
    const newApiUrl = "https://script.google.com/macros/s/AKfycbwkzPKFvZdOEldaFBKEP5erck7e58BXAVbR28NgOcFHTz1bqyiigfPke6n6WFDvgA/exec";

    fetch(newApiUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(orderData)
    }).then(() => {
      alert('Pesanan berjaya dihantar!');
      location.reload();
    }).catch(err => {
      console.error('Ralat hantar:', err);
    });
  }
});